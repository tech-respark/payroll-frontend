import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './Overlay.module.scss';

/**
 * Right-side panel for create/edit forms and settings (Minimal pattern).
 * Use Modal for short confirmations or dense single-purpose dialogs.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  hideTitle = false,
  children,
  footer,
  width = 480,
  closeOnOverlay = true,
}) {
  const panelRef = useRef(null);
  useBodyScrollLock(open);
  useFocusTrap(open, panelRef);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.drawerRoot} role="presentation">
      <div
        className={styles.overlay}
        onClick={() => closeOnOverlay && onClose?.()}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        className={styles.drawer}
        style={{ width: `min(100vw, ${width}px)` }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Panel'}
        tabIndex={-1}
      >
        <div className={`${styles.header}${hideTitle ? ` ${styles.headerCompact}` : ''}`}>
          {!hideTitle && (
            <div className={styles.headerText}>
              {title && <h2 className={styles.title}>{title}</h2>}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          )}
          {onClose && (
            <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
              <LuX size={18} />
            </button>
          )}
        </div>
        <div className={`${styles.drawerBody}${hideTitle ? ` ${styles.drawerBodyCompact}` : ''}`}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </aside>
    </div>,
    document.body
  );
}

export default Drawer;
