/**
 * DetectionStateMachine
 *
 * Layer 2: Manages detection state transitions and debouncing.
 * Prevents false triggers and manages the detection lifecycle.
 */

import type {
  StateMachineState,
  StateMachineEvent,
  StateTransitionResult,
  StateHistoryEntry,
} from './types';

interface StateMachineConfig {
  requiredConsecutiveDetections: number;
  stateTimeout: number;
  cooldownDuration: number;
}

export default class DetectionStateMachine {
  private _state: StateMachineState = 'idle';
  private _consecutiveCount = 0;
  private _consecutiveNoMotion = 0;
  private _cooldownStart: number | null = null;
  private _lastEventTime: number = Date.now();
  private _stateHistory: StateHistoryEntry[] = [];
  private _config: StateMachineConfig;

  constructor(config: StateMachineConfig) {
    this._config = config;
  }

  /**
   * Process state transition based on event
   */
  transition(event: StateMachineEvent): StateTransitionResult {
    const currentTime = Date.now();
    const previousState = this._state;
    let shouldTriggerTimer = false;
    let transitionReason = '';

    // Check for timeout
    if (currentTime - this._lastEventTime > this._config.stateTimeout) {
      if (this._state !== 'idle' && this._state !== 'triggered') {
        this._state = 'idle';
        this._consecutiveCount = 0;
        transitionReason = 'timeout';
      }
    }

    this._lastEventTime = currentTime;

    // State machine logic
    switch (this._state) {
      case 'idle':
        if (event.type === 'motion_detected' && event.motionRegion === 'top') {
          this._state = 'monitoring';
          this._consecutiveCount = 0;
          transitionReason = 'motion_in_top_region';
        }
        break;

      case 'monitoring':
        if (
          event.type === 'motion_detected' &&
          event.motionRegion === 'top' &&
          event.motionScore >= 0.5
        ) {
          this._state = 'preparing';
          this._consecutiveCount = 1;
          transitionReason = 'strong_motion_detected';
        } else if (
          event.type === 'no_motion' ||
          event.type === 'scene_change'
        ) {
          this._state = 'idle';
          this._consecutiveCount = 0;
          transitionReason = 'motion_lost';
        }
        break;

      case 'preparing':
        if (
          event.type === 'motion_detected' &&
          event.motionRegion === 'top' &&
          event.motionScore >= 0.5
        ) {
          this._consecutiveCount++;

          if (
            this._consecutiveCount >= this._config.requiredConsecutiveDetections
          ) {
            this._state = 'triggered';
            shouldTriggerTimer = true;
            transitionReason = 'consecutive_detections_met';
          }
        } else if (
          event.type === 'no_motion' ||
          event.type === 'scene_change'
        ) {
          // Reset and go back to monitoring
          this._consecutiveCount = 0;
          this._state = 'monitoring';
          transitionReason = 'motion_interrupted';
        }
        break;

      case 'triggered':
        // Terminal state - only manual reset can move to cooldown
        if (event.type === 'manual_reset') {
          this._state = 'cooldown';
          this._cooldownStart = currentTime;
          this._consecutiveNoMotion = 0;
          transitionReason = 'manual_reset';
        }
        break;

      case 'cooldown':
        if (this._cooldownStart) {
          const cooldownElapsed = currentTime - this._cooldownStart;

          if (cooldownElapsed >= this._config.cooldownDuration) {
            this._state = 'idle';
            this._consecutiveCount = 0;
            this._consecutiveNoMotion = 0;
            transitionReason = 'cooldown_complete';
          } else if (event.type === 'no_motion') {
            this._consecutiveNoMotion++;
            if (this._consecutiveNoMotion >= 10) {
              this._state = 'idle';
              this._consecutiveCount = 0;
              this._consecutiveNoMotion = 0;
              transitionReason = 'extended_stillness';
            }
          } else if (event.type === 'motion_detected') {
            // Reset stillness counter on motion
            this._consecutiveNoMotion = 0;
          }
        }
        break;
    }

    // Record state transition
    if (previousState !== this._state) {
      this._stateHistory.push({
        state: this._state,
        timestamp: currentTime,
        duration: 0, // Will be updated on next transition
        consecutiveCount: this._consecutiveCount,
      });

      // Update duration of previous state
      const prevIndex = this._stateHistory.length - 2;
      if (prevIndex >= 0) {
        this._stateHistory[prevIndex].duration =
          currentTime - this._stateHistory[prevIndex].timestamp;
      }
    }

    return {
      previousState,
      currentState: this._state,
      shouldTriggerTimer,
      consecutiveCount: this._consecutiveCount,
      transitionReason,
    };
  }

  /**
   * Reset state machine to cooldown (not idle)
   */
  reset(): void {
    this._state = 'cooldown';
    this._cooldownStart = Date.now();
    this._consecutiveCount = 0;
    this._consecutiveNoMotion = 0;
  }

  /**
   * Get current consecutive detection count
   */
  getConsecutiveCount(): number {
    return this._consecutiveCount;
  }

  /**
   * Get remaining cooldown time in ms
   */
  getCooldownRemaining(): number {
    if (this._state !== 'cooldown' || !this._cooldownStart) {
      return 0;
    }
    const elapsed = Date.now() - this._cooldownStart;
    return Math.max(0, this._config.cooldownDuration - elapsed);
  }

  /**
   * Get state history
   */
  getStateHistory(): StateHistoryEntry[] {
    return [...this._stateHistory];
  }

  /**
   * Get current state
   */
  getState(): StateMachineState {
    return this._state;
  }
}
