import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './Overlay.module.scss';

/**
 * Centered dialog for focused tasks (confirm, short forms, regularization).
 * Prefer Drawer for multi-field create/edit flows from calendars/lists.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
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
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => closeOnOverlay && onClose?.()}
    >
      <div
        ref={panelRef}
        className={`${styles.modal} ${styles[`size-${size}`]}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className={styles.header}>
            <div className={styles.headerText}>
              {title && <h2 className={styles.title}>{title}</h2>}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {onClose && (
              <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
                <LuX size={18} />
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
