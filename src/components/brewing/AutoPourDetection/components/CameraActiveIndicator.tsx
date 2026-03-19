'use client';

import React from 'react';

interface CameraActiveIndicatorProps {
  onStop: () => void;
}

export default function CameraActiveIndicator({
  onStop,
}: CameraActiveIndicatorProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-sm">
      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
      <span>摄像头已启用</span>
      <button
        type="button"
        onClick={onStop}
        className="ml-2 text-xs underline hover:text-neutral-600 dark:hover:text-neutral-400"
      >
        停止
      </button>
    </div>
  );
}
