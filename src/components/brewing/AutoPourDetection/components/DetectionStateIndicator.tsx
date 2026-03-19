'use client';

import React from 'react';
import type { StateMachineState } from '../types';

interface DetectionStateIndicatorProps {
  state: StateMachineState;
  consecutiveCount: number;
  motionScore: number;
  processingTimeMs: number;
  visible: boolean;
}

export default function DetectionStateIndicator({
  state,
  consecutiveCount,
  motionScore,
  processingTimeMs,
  visible,
}: DetectionStateIndicatorProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="rounded bg-black/60 p-2 font-mono text-xs text-white">
      <div>状态: {state}</div>
      <div>连续检测: {consecutiveCount}</div>
      <div>运动分数: {motionScore.toFixed(2)}</div>
      <div>处理时间: {processingTimeMs.toFixed(1)}ms</div>
    </div>
  );
}
