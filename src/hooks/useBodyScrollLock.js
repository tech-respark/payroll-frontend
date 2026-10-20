import { useEffect } from 'react';

let lockCount = 0;

export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;

    lockCount += 1;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        body.style.overflow = previousOverflow || '';
      }
    };
  }, [locked]);
}
