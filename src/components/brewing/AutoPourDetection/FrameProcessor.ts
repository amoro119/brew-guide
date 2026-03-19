/**
 * FrameProcessor
 *
 * Extracts video frames from a video element for processing.
 * Uses requestVideoFrameCallback when available (more efficient),
 * falls back to setInterval.
 */

import type { VideoFrame } from './types';

export default class FrameProcessor {
  private _videoEl: HTMLVideoElement | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _captureHandle: number | null = null;
  private _frameCallback: ((frame: VideoFrame) => void) | null = null;
  private _useVideoFrameCallback = false;

  /**
   * Initialize the processor with a video element
   */
  initialize(videoElement: HTMLVideoElement): void {
    this._videoEl = videoElement as unknown as HTMLVideoElement;

    // Create offscreen canvas
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d', { willReadFrequently: true });

    // Check for requestVideoFrameCallback support
    this._useVideoFrameCallback = 'requestVideoFrameCallback' in videoElement;
  }

  /**
   * Start capturing frames at the specified rate
   */
  startCapture(frameRate: number): void {
    if (!this._videoEl) return;

    if (this._useVideoFrameCallback) {
      // Use requestVideoFrameCallback for efficient frame capture
      const captureLoop = () => {
        if (!this._videoEl) return;
        this.captureAndCallback();
        this._captureHandle = (
          this._videoEl as unknown as {
            requestVideoFrameCallback: (callback: () => void) => number;
          }
        ).requestVideoFrameCallback(captureLoop);
      };
      captureLoop();
    } else {
      // Fallback to setInterval
      const intervalMs = 1000 / frameRate;
      this._captureHandle = window.setInterval(() => {
        this.captureAndCallback();
      }, intervalMs);
    }
  }

  /**
   * Stop frame capture
   */
  stopCapture(): void {
    if (this._captureHandle !== null) {
      if (this._useVideoFrameCallback && this._videoEl) {
        // Cancel video frame callback if supported
        const video = this._videoEl as unknown as {
          cancelVideoFrameCallback?: (handle: number) => void;
        };
        if (video.cancelVideoFrameCallback) {
          video.cancelVideoFrameCallback(this._captureHandle);
        }
      } else {
        clearInterval(this._captureHandle);
      }
      this._captureHandle = null;
    }
  }

  /**
   * Get the current frame as ImageData
   */
  getCurrentFrame(): VideoFrame | null {
    if (!this._videoEl || !this._canvas || !this._ctx) return null;

    const video = this._videoEl;
    const width = video.videoWidth || 320;
    const height = video.videoHeight || 240;

    // Resize canvas if needed
    if (this._canvas.width !== width || this._canvas.height !== height) {
      this._canvas.width = width;
      this._canvas.height = height;
    }

    // Draw video to canvas
    this._ctx.drawImage(video, 0, 0, width, height);

    // Get image data
    const imageData = this._ctx.getImageData(0, 0, width, height);

    return {
      data: imageData,
      timestamp: Date.now(),
      width,
      height,
    };
  }

  /**
   * Register frame callback
   */
  onFrameReady(callback: (frame: VideoFrame) => void): void {
    this._frameCallback = callback;
  }

  /**
   * Check if requestVideoFrameCallback is supported
   */
  supportsVideoFrameCallback(): boolean {
    return this._useVideoFrameCallback;
  }

  /**
   * Capture current frame and call callback
   */
  private captureAndCallback(): void {
    const frame = this.getCurrentFrame();
    if (frame && this._frameCallback) {
      this._frameCallback(frame);
    }
  }
}
