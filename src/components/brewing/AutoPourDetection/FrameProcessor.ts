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
  
  // 【新增】：用于记录上一次实际处理帧的高精度时间戳
  private _lastCaptureTime = 0;

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

    // 【新增】：计算两帧之间需要等待的最小时间间隔（毫秒）
    const intervalMs = 1000 / frameRate;

    if (this._useVideoFrameCallback) {
      // 初始化时间戳，确保启动后能顺利开始判断
      this._lastCaptureTime = performance.now();

      // Use requestVideoFrameCallback for efficient frame capture
      // 【修改】：接收 requestVideoFrameCallback 自动传入的当前高精度时间 `now`
      const captureLoop = (now: number) => {
        if (!this._videoEl) return;
        
        // 【核心节流逻辑】：只有当逝去的时间大于或等于我们设定的间隔时，才抓取并回调
        if (now - this._lastCaptureTime >= intervalMs) {
          this.captureAndCallback();
          this._lastCaptureTime = now;
        }
        
        // 无论是否抓取，都继续请求下一帧，维持循环运转
        this._captureHandle = (
          this._videoEl as unknown as {
            requestVideoFrameCallback: (callback: (now: number) => void) => number;
          }
        ).requestVideoFrameCallback(captureLoop);
      };
      
      // 启动第一次循环
      this._captureHandle = (
        this._videoEl as unknown as {
          requestVideoFrameCallback: (callback: (now: number) => void) => number;
        }
      ).requestVideoFrameCallback(captureLoop);
      
    } else {
      // Fallback to setInterval (这里原本就使用了 intervalMs，逻辑是正确的)
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