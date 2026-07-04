'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from its previous value to `target` over `duration` ms.
 * Jumps instantly if the user prefers reduced motion.
 */
export function useCountUp(target, duration = 500, skipAnimation = false) {
  const [value, setValue] = useState(target);
  const previousTarget = useRef(target);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = previousTarget.current;
    previousTarget.current = target;

    if (skipAnimation || from === target) {
      setValue(target);
      return;
    }

    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, skipAnimation]);

  return value;
}
