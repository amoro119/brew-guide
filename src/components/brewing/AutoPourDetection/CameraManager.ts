/**
 * CameraManager
 *
 * Manages device camera access, video stream lifecycle, and cross-platform compatibility.
 * Uses browser MediaDevices API (Capacitor plugin support for future).
 */

import type {
  CameraInitResult,
  CameraDevice,
  VideoStreamConfig,
  PermissionStatus,
  VideoStreamStatus,
} from './types';

export default class CameraManager {
  private _stream: MediaStream | null = null;
  private _status: VideoStreamStatus = 'idle';
  private _currentDeviceId: string | null = null;

  /**
   * Initialize the camera manager
   */
  async initialize(): Promise<CameraInitResult> {
    try {
      // Check if MediaDevices API is available
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        return {
          success: false,
          error: 'MediaDevices API not available',
          supportedFeatures: {
            multipleCamera: false,
            focusControl: false,
            exposureControl: false,
          },
        };
      }

      // Check for multiple cameras support
      const devices = await this.getAvailableCameras();
      const multipleCamera = devices.length > 1;

      return {
        success: true,
        supportedFeatures: {
          multipleCamera,
          focusControl: false, // Not exposed in basic MediaDevices API
          exposureControl: false, // Not exposed in basic MediaDevices API
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        supportedFeatures: {
          multipleCamera: false,
          focusControl: false,
          exposureControl: false,
        },
      };
    }
  }

  /**
   * Request camera permission
   */
  async requestPermission(): Promise<PermissionStatus> {
    try {
      // Try to get user media to trigger permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      // Stop the stream immediately - we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());

      return 'granted';
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          return 'denied';
        }
        if (error.name === 'NotFoundError') {
          throw new Error('DEVICE_NOT_FOUND');
        }
      }
      return 'prompt';
    }
  }

  /**
   * Start video stream with given config
   */
  async startVideoStream(config: VideoStreamConfig): Promise<MediaStream> {
    try {
      this._status = 'initializing';

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: config.deviceId ? { exact: config.deviceId } : undefined,
          width: config.width ? { ideal: config.width } : undefined,
          height: config.height ? { ideal: config.height } : undefined,
          frameRate: config.frameRate ? { ideal: config.frameRate } : undefined,
          facingMode: config.facingMode
            ? { ideal: config.facingMode }
            : undefined,
        },
      };

      this._stream = await navigator.mediaDevices.getUserMedia(constraints);
      this._currentDeviceId = config.deviceId ?? null;
      this._status = 'active';

      return this._stream;
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  /**
   * Stop the current video stream
   */
  stopVideoStream(): void {
    if (this._stream) {
      this._stream.getTracks().forEach(track => track.stop());
      this._stream = null;
    }
    this._currentDeviceId = null;
    this._status = 'idle';
  }

  /**
   * Get list of available cameras
   */
  async getAvailableCameras(): Promise<CameraDevice[]> {
    try {
      // Request permission first to get labeled devices
      await navigator.mediaDevices.getUserMedia({ video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: 'videoinput' as const,
        }));

      return videoDevices;
    } catch {
      return [];
    }
  }

  /**
   * Switch to a different camera
   */
  async switchCamera(deviceId: string): Promise<void> {
    if (this._stream) {
      this.stopVideoStream();
    }

    await this.startVideoStream({ deviceId });
  }

  /**
   * Get current stream status
   */
  getStreamStatus(): VideoStreamStatus {
    return this._status;
  }

  /**
   * Get the current MediaStream
   */
  getStream(): MediaStream | null {
    return this._stream;
  }
}
