/**
 * Auto Pour Detection Types
 *
 * TypeScript interfaces for the auto pour detection feature.
 * Based on specs/auto-timer-on-pour-detection/design.md
 */

// ============================================================================
// Detection Modes
// ============================================================================

export type DetectionMode = 'auto-start' | 'remind-only' | 'off';

export type StateMachineState =
  | 'idle'
  | 'monitoring'
  | 'preparing'
  | 'triggered'
  | 'cooldown';

// ============================================================================
// Auto Pour Detection Settings
// ============================================================================

export interface AutoPourDetectionSettings {
  /** Whether auto detection is enabled */
  enabled: boolean;

  /** Detection mode: auto-start, remind-only, or off */
  mode: DetectionMode;

  // Layer 1: Frame difference detection config
  /** Frame difference threshold (0-255) */
  frameDiffThreshold: number;

  /** Minimum motion pixel ratio (0-1) */
  minMotionRatio: number;

  /** Maximum motion pixel ratio (0-1, default 0.8, prevents fullscreen changes) */
  maxMotionRatio: number;

  // Layer 2: State machine config
  /** Number of consecutive detections required to trigger */
  requiredConsecutiveDetections: number;

  /** State timeout in milliseconds */
  stateTimeout: number;

  /** Cooldown duration after undo in milliseconds (default 2000) */
  cooldownDuration: number;

  // Camera config
  /** Selected camera device ID */
  cameraDeviceId: string | null;

  /** Camera facing mode: 'user' = front (recommended), 'environment' = back */
  cameraFacingMode: 'user' | 'environment';

  /** Video resolution */
  videoResolution: {
    width: number;
    height: number;
  };

  /** Frame rate (15/30/60) */
  frameRate: number;

  // UI config
  /** Whether to show camera preview */
  showCameraPreview: boolean;

  /** Whether to show debug overlay (frame diff, motion regions) */
  showDebugOverlay: boolean;

  /** Whether to auto-stop camera after successful detection */
  autoStopCamera: boolean;

  // UX config
  /** Whether to show toast notifications */
  showToastNotification: boolean;

  /** Undo window duration in milliseconds (default 2000) */
  undoWindowDuration: number;

  // Performance config
  /** Whether to use Web Worker */
  useWebWorker: boolean;

  /** Downsample scale (0.25-1.0) */
  downsampleScale: number;

  /** Region of interest for detection */
  regionOfInterest: {
    enabled: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

// ============================================================================
// Camera Types
// ============================================================================

export interface CameraState {
  status:
    | 'idle'
    | 'requesting-permission'
    | 'initializing'
    | 'active'
    | 'error';
  permissionStatus: PermissionStatus | 'unknown';
  currentDeviceId: string | null;
  availableDevices: CameraDevice[];
  stream: MediaStream | null;
  error: CameraError | null;
}

export interface CameraError {
  code: 'PERMISSION_DENIED' | 'DEVICE_NOT_FOUND' | 'STREAM_ERROR' | 'UNKNOWN';
  message: string;
  timestamp: number;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
}

export interface VideoStreamConfig {
  deviceId?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  facingMode?: 'user' | 'environment';
}

export interface CameraInitResult {
  success: boolean;
  error?: string;
  supportedFeatures: {
    multipleCamera: boolean;
    focusControl: boolean;
    exposureControl: boolean;
  };
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt';

export type VideoStreamStatus = 'idle' | 'initializing' | 'active' | 'error';

// ============================================================================
// Video Frame
// ============================================================================

export interface VideoFrame {
  data: ImageData;
  timestamp: number;
  width: number;
  height: number;
}

// ============================================================================
// Frame Difference Detection (Layer 1)
// ============================================================================

export interface FrameDiffResult {
  /** Pixel-level difference map */
  diffMap: number[][];

  /** Total difference value */
  totalDiff: number;

  /** Number of motion pixels */
  motionPixelCount: number;

  /** Motion pixel ratio (0-1) */
  motionRatio: number;

  /** Maximum difference value */
  maxDiff: number;

  /** Motion center Y coordinate (normalized 0-1) */
  motionCenterY: number;

  /** Whether this is a large scene change (motionRatio > 0.8) */
  isLargeSceneChange: boolean;
}

export interface MotionAnalysis {
  /** Whether there is significant motion */
  hasMotion: boolean;

  /** Whether motion is downward */
  isDownward: boolean;

  /** Motion score (0-1) */
  motionScore: number;

  /** Vertical bias (-1 to 1, positive = downward) */
  verticalBias: number;

  /** Motion region position */
  motionRegion: 'top' | 'middle' | 'bottom';

  /** Area change ratio (positive = expanding, negative = shrinking) */
  areaChangeRatio: number;

  /** Whether this is a large scene change */
  isLargeSceneChange: boolean;
}

// ============================================================================
// Detection (Layer 2)
// ============================================================================

export interface DetectionConfig {
  /** Sensitivity (0-100) */
  sensitivity: number;

  /** Frame difference threshold (0-255) */
  frameDiffThreshold: number;

  /** Minimum motion pixel ratio (0-1) */
  minMotionRatio: number;

  /** Maximum motion pixel ratio (0-1) */
  maxMotionRatio: number;

  /** Required consecutive detections for state transition */
  requiredConsecutiveDetections: number;

  /** State timeout in milliseconds */
  stateTimeout: number;

  /** Cooldown duration in milliseconds */
  cooldownDuration: number;

  /** Region of interest */
  regionOfInterest?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DetectionResult {
  // Layer 1 results
  hasMotion: boolean;
  motionScore: number;
  isDownward: boolean;
  motionRegion: 'top' | 'middle' | 'bottom';

  // Layer 2 results
  currentState: StateMachineState;
  shouldTrigger: boolean;
  consecutiveCount: number;

  // Metadata
  timestamp: number;
  processingTime: number;
}

export interface DetectionStatus {
  isActive: boolean;
  currentState: StateMachineState;
  frameCount: number;
  processedFrameCount: number;
  lastDetectionTime: number | null;
  averageProcessingTime: number;
  performanceMetrics: {
    layer1AvgTime: number;
    layer2AvgTime: number;
    fps: number;
    droppedFrames: number;
  };
}

// ============================================================================
// State Machine
// ============================================================================

export interface StateMachineEvent {
  type:
    | 'motion_detected'
    | 'no_motion'
    | 'scene_change'
    | 'timeout'
    | 'manual_reset';
  motionScore: number;
  isDownward: boolean;
  motionRegion: 'top' | 'middle' | 'bottom';
  timestamp: number;
}

export interface StateTransitionResult {
  previousState: StateMachineState;
  currentState: StateMachineState;
  shouldTriggerTimer: boolean;
  consecutiveCount: number;
  transitionReason: string;
}

export interface StateHistoryEntry {
  state: StateMachineState;
  timestamp: number;
  duration: number;
  consecutiveCount: number;
}

// ============================================================================
// Undo Controller
// ============================================================================

export interface UndoState {
  isAvailable: boolean;
  remainingTime: number;
  timerSnapshot: {
    currentTime: number;
    isRunning: boolean;
    hasStartedOnce: boolean;
  };
}
