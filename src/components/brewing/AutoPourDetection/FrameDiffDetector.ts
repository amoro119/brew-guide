/**
 * FrameDiffDetector
 *
 * Layer 1: Pixel-level motion analysis using frame differencing.
 * Detects continuous downward motion characteristic of pouring.
 *
 * Performance target: ≤5ms for 320×240 resolution
 */

import type { FrameDiffResult, MotionAnalysis } from './types';

export default class FrameDiffDetector {
  private _previousROI: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;

  /**
   * Compute frame difference between current and previous frame
   * Uses grayscale conversion and pixel-level diff
   */
  computeFrameDiff(
    currentFrame: ImageData,
    previousFrame: ImageData
  ): FrameDiffResult {
    const width = currentFrame.width;
    const height = currentFrame.height;
    const totalPixels = width * height;
    const data1 = currentFrame.data;
    const data2 = previousFrame.data;

    // Initialize diff map as 2D array
    const diffMap: number[][] = Array(height)
      .fill(0)
      .map(() => Array(width).fill(0));

    let totalDiff = 0;
    let motionPixelCount = 0;
    let maxDiff = 0;

    // Iterate all pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Grayscale conversion: 0.299*r + 0.587*g + 0.114*b
        const gray1 = Math.round(
          0.299 * data1[idx] + 0.587 * data1[idx + 1] + 0.114 * data1[idx + 2]
        );
        const gray2 = Math.round(
          0.299 * data2[idx] + 0.587 * data2[idx + 1] + 0.114 * data2[idx + 2]
        );

        // Compute absolute difference
        const diff = Math.abs(gray1 - gray2);
        diffMap[y][x] = diff;

        totalDiff += diff;
        if (diff > 25) {
          // Default threshold
          motionPixelCount++;
        }
        if (diff > maxDiff) {
          maxDiff = diff;
        }
      }
    }

    const motionRatio = motionPixelCount / totalPixels;
    const isLargeSceneChange = motionRatio > 0.8;

    // Compute motion center Y
    let motionCenterY = 0.5;
    if (motionPixelCount > 0) {
      let sumY = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (diffMap[y][x] > 25) {
            sumY += y;
          }
        }
      }
      motionCenterY = sumY / motionPixelCount / height;
    }

    return {
      diffMap,
      totalDiff,
      motionPixelCount,
      motionRatio,
      maxDiff,
      motionCenterY,
      isLargeSceneChange,
    };
  }

  /**
   * Detect downward motion from diff map
   * Optimized for front-facing camera perspective
   */
  detectDownwardMotion(diffMap: number[][], threshold: number): MotionAnalysis {
    const height = diffMap.length;
    const width = diffMap[0]?.length || 0;

    let totalMotionPixels = 0;
    let motionCenterX = 0;
    let motionCenterY = 0;
    let topRegionMotion = 0;

    // Bounding box for area calculation
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    // Iterate diff map
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (diffMap[y][x] > threshold) {
          totalMotionPixels++;
          motionCenterX += x;
          motionCenterY += y;

          // Track bounding box
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);

          // Count motion in top 1/3 region
          if (y < height / 3) {
            topRegionMotion++;
          }
        }
      }
    }

    // No motion detected
    if (totalMotionPixels === 0) {
      return {
        hasMotion: false,
        isDownward: false,
        motionScore: 0,
        verticalBias: 0,
        motionRegion: 'middle',
        areaChangeRatio: 0,
        isLargeSceneChange: false,
      };
    }

    // Normalize motion center to [0, 1]
    motionCenterX = motionCenterX / totalMotionPixels / width;
    motionCenterY = motionCenterY / totalMotionPixels / height;

    // Determine motion region
    let motionRegion: 'top' | 'middle' | 'bottom';
    if (motionCenterY < 0.33) {
      motionRegion = 'top';
    } else if (motionCenterY < 0.67) {
      motionRegion = 'middle';
    } else {
      motionRegion = 'bottom';
    }

    // Calculate vertical bias (simplified for front camera)
    const bottomHalfMotion = totalMotionPixels - topRegionMotion;
    const verticalBias =
      (bottomHalfMotion - topRegionMotion) / totalMotionPixels;
    const isDownward = verticalBias > 0.3;

    // Calculate area change ratio
    const currentArea = (maxX - minX) * (maxY - minY);
    let areaChangeRatio = 0;
    if (this._previousROI) {
      const previousArea = this._previousROI.width * this._previousROI.height;
      if (previousArea > 0) {
        areaChangeRatio = (currentArea - previousArea) / previousArea;
      }
    }

    // Store current ROI for next frame
    if (currentArea > 0) {
      this._previousROI = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    // Calculate motion score
    // 50% top region ratio + 30% area increase + 20% vertical bias
    const topRegionRatio = topRegionMotion / totalMotionPixels;
    const motionScore = Math.min(
      1,
      0.5 * topRegionRatio +
        0.3 * Math.max(0, areaChangeRatio) +
        0.2 * Math.max(0, verticalBias)
    );

    const hasMotion = motionScore >= 0.3;

    return {
      hasMotion,
      isDownward,
      motionScore,
      verticalBias,
      motionRegion,
      areaChangeRatio,
      isLargeSceneChange: false,
    };
  }

  /**
   * Check if motion matches pouring characteristics
   * Optimized for front-facing camera (upward angle)
   */
  isPouringMotion(motionAnalysis: MotionAnalysis): boolean {
    // Primary: motion in top region with high score
    const isTopRegionMotion =
      motionAnalysis.motionRegion === 'top' &&
      motionAnalysis.motionScore >= 0.5;

    // Secondary indicators
    const hasDownwardBias =
      motionAnalysis.isDownward && motionAnalysis.verticalBias > 0.3;
    const hasAreaIncrease = motionAnalysis.areaChangeRatio > 0.2;

    // Pouring = top region motion + (downward bias OR area increase)
    return isTopRegionMotion && (hasDownwardBias || hasAreaIncrease);
  }
}
