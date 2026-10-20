import React from 'react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

export function ConfirmDialog({
  open,
  title,
  subtitle,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onClose,
  onConfirm,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Saving…' : confirmLabel}
          </Button>
        </>
      )}
    >
      {typeof body === 'string' ? <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{body}</p> : body}
    </Modal>
  );
}

export default ConfirmDialog;
