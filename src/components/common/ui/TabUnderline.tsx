'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { getTabUnderlinePosition } from './tabUnderlinePosition';

const TRANSITION = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 35,
  mass: 1,
};
export default function TabUnderline({ layoutId }: { layoutId: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{
    row: HTMLElement;
    left: number;
    top: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const row = anchor?.closest<HTMLElement>('[data-tab-list]');
    if (!anchor || !row) return;
    const viewport = anchor.closest<HTMLElement>('[data-tab-scroll]');
    const measure = () => {
      const bounds = getTabUnderlinePosition(
        anchor.getBoundingClientRect(),
        row.getBoundingClientRect(),
        viewport?.getBoundingClientRect()
      );
      setPosition(current =>
        current?.row === row &&
        current.left === bounds.left &&
        current.top === bounds.top &&
        current.width === bounds.width
          ? current
          : { row, ...bounds }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(anchor);
    observer.observe(row);
    row.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      row.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [layoutId]);

  return (
    <>
      <span
        ref={anchorRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
      />
      {position &&
        createPortal(
          <motion.span
            aria-hidden
            layoutId={layoutId}
            className="pointer-events-none absolute z-20 h-px bg-neutral-800 dark:bg-white"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
            }}
            transition={TRANSITION}
          />,
          position.row
        )}
    </>
  );
}
