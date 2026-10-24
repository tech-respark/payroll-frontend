import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const visible = (el) => el.getClientRects().length > 0;

export function useFocusTrap(open, panelRef) {
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    triggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const nodes = () => Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) || []).filter(visible);

    const onKey = (event) => {
      if (event.key !== 'Tab') return;
      const list = nodes();
      if (list.length === 0) {
        event.preventDefault();
        panelRef.current?.focus?.();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => {
      (nodes()[0] || panelRef.current)?.focus?.();
    }, 0);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      triggerRef.current?.focus?.();
    };
  }, [open, panelRef]);
}
