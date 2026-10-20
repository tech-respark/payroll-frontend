import React from 'react';
import { useHistory } from 'react-router-dom';
import { LuBell, LuCalendarOff, LuClipboardCheck, LuInbox, LuUsers } from 'react-icons/lu';
import { Drawer } from '../ui';
import { useHeaderNotifications } from '../../hooks/queries/useHeaderNotifications';
import styles from './NotificationsDrawer.module.scss';

/**
 * Actionable inbox: pending leave + regularization approvals.
 */
export function NotificationsDrawer({ open, onClose }) {
  const history = useHistory();
  const { items, isLoading, canReceive, total } = useHeaderNotifications();

  const go = (path) => {
    onClose?.();
    history.push(path);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Notifications"
      subtitle={total > 0 ? `${total} needing attention` : 'Inbox'}
      width={360}
    >
      {!canReceive ? (
        <div className={styles.empty}>
          <LuBell size={28} color="var(--text-disabled)" />
          <p className={styles.emptyTitle}>No approval inbox</p>
          <p className={styles.emptyHint}>
            Your role does not include leave or attendance approval permissions.
          </p>
        </div>
      ) : isLoading ? (
        <div className={styles.loading}>Checking pending actions…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <LuInbox size={28} color="var(--text-disabled)" />
          <p className={styles.emptyTitle}>All caught up</p>
          <p className={styles.emptyHint}>No pending leave or regularization approvals.</p>
        </div>
      ) : (
        <>
          <p className={styles.intro}>Open an item to review and approve or reject.</p>
          <ul className={styles.list}>
            {items.map((item) => {
              const Icon =
                item.id === 'leave-approvals'
                  ? LuCalendarOff
                  : item.id === 'on-leave-today'
                    ? LuUsers
                    : LuClipboardCheck;
              return (
                <li key={item.id}>
                  <button type="button" className={styles.item} onClick={() => go(item.path)}>
                    <span
                      className={`${styles.iconWrap} ${item.tone === 'warn' ? styles.iconWarn : ''}`}
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className={styles.body}>
                      <p className={styles.title}>{item.title}</p>
                      <p className={styles.detail}>{item.detail}</p>
                    </span>
                    <span
                      className={item.informational ? styles.countMuted : styles.count}
                    >
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Drawer>
  );
}

export default NotificationsDrawer;
