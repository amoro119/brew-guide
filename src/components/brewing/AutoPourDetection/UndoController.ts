/**
 * UndoController
 *
 * Manages the 2-second undo window after automatic timer start.
 * Allows users to undo the auto-start and return to the pre-detection state.
 */

interface TimerSnapshot {
  currentTime: number;
  isRunning: boolean;
  hasStartedOnce: boolean;
}

interface UndoCallbacks {
  onUndo: () => void;
  onExpire: () => void;
  onTick: (remaining: number) => void;
}

export default class UndoController {
  private _timerSnapshot: TimerSnapshot | null = null;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _remainingMs = 0;
  private _onUndo: (() => void) | null = null;
  private _onExpire: (() => void) | null = null;
  private _onTick: ((remaining: number) => void) | null = null;
  private _isUndoing = false;

  /**
   * Start the undo window
   * @param duration Window duration in milliseconds (default 2000ms)
   * @param snapshot Timer state to restore on undo
   * @param callbacks Callbacks for undo, expiry, and tick events
   */
  startUndoWindow(
    duration: number,
    snapshot: TimerSnapshot,
    callbacks: UndoCallbacks
  ): void {
    // Clear any existing window
    this.cancelUndoWindow();

    this._timerSnapshot = snapshot;
    this._remainingMs = duration;
    this._onUndo = callbacks.onUndo;
    this._onExpire = callbacks.onExpire;
    this._onTick = callbacks.onTick;
    this._isUndoing = false;

    // Initial tick
    this._onTick?.(this._remainingMs);

    // Start countdown
    const tickInterval = 100; // Update every 100ms
    this._intervalId = setInterval(() => {
      this._remainingMs -= tickInterval;

      if (this._remainingMs <= 0) {
        // Window expired
        this._remainingMs = 0;
        this.cancelUndoWindow();
        this._onExpire?.();
      } else {
        // Tick
        this._onTick?.(this._remainingMs);
      }
    }, tickInterval);
  }

  /**
   * Execute undo action
   * Restores timer to pre-detection state
   */
  undo(): void {
    // Prevent double-undo
    if (this._isUndoing || this._remainingMs <= 0) {
      return;
    }

    this._isUndoing = true;
    this.cancelUndoWindow();
    this._onUndo?.();
  }

  /**
   * Cancel the undo window without executing undo
   */
  cancelUndoWindow(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._remainingMs = 0;
    this._timerSnapshot = null;
  }

  /**
   * Check if undo is currently available
   */
  isUndoAvailable(): boolean {
    return this._remainingMs > 0 && !this._isUndoing;
  }

  /**
   * Get remaining undo window time in milliseconds
   */
  getRemainingTime(): number {
    return this._remainingMs;
  }

  /**
   * Get the timer snapshot (for testing/debugging)
   */
  getTimerSnapshot(): TimerSnapshot | null {
    return this._timerSnapshot;
  }
}
