import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  LuCalendarOff,
  LuClipboardCheck,
  LuLogOut,
  LuStore,
  LuUsers,
  LuWallet,
} from 'react-icons/lu';
import { Drawer, Switch } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useStoreConfig } from '../../hooks/queries';
import styles from './AccountDrawer.module.scss';

const formatName = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Right account panel — profile, store context, quick links, theme, logout.
 */
export function AccountDrawer({ open, onClose }) {
  const history = useHistory();
  const { user, logout, hasAccess } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { storeConfig } = useStoreConfig();

  const rawName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.username || user?.staffId || 'User';
  const displayName = formatName(rawName) || 'User';
  const email = user?.email || user?.username || '';
  const role =
    user?.designation ||
    user?.roles?.find((r) => String(r).startsWith('ROLE_'))?.replace('ROLE_', '') ||
    'Staff';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const storeName = storeConfig?.storeName || 'Main Store';

  const go = (path) => {
    onClose?.();
    history.push(path);
  };

  const handleLogout = () => {
    onClose?.();
    logout();
    history.push('/login');
  };

  const shortcuts = [
    { id: 'attendance', label: 'Attendance', path: '/attendance', icon: LuClipboardCheck, show: true },
    { id: 'my-work', label: 'My Work', path: '/my-work', icon: LuClipboardCheck, show: true },
    { id: 'leaves', label: 'My Leaves', path: '/leave-dashboard', icon: LuCalendarOff, show: true },
    {
      id: 'payslips',
      label: 'Payslips',
      path: '/payslips',
      icon: LuWallet,
      show: hasAccess(['VIEW_SALARY', 'MANAGE_SALARY']),
    },
    {
      id: 'hospitality',
      label: 'Hospitality Payroll',
      path: '/hospitality',
      icon: LuWallet,
      show: hasAccess(['MANAGE_SALARY', 'VIEW_HOSPITALITY', 'MANAGE_HOSPITALITY']),
    },
    { id: 'staff', label: 'Staff directory', path: '/staff', icon: LuUsers, show: true },
  ].filter((s) => s.show);

  return (
    <Drawer open={open} onClose={onClose} title="Account" width={320}>
      <div className={styles.profile}>
        <div className={styles.avatar} aria-hidden>
          {initials}
        </div>
        <h3 className={styles.name}>{displayName}</h3>
        {email && <p className={styles.email}>{email}</p>}
        <div className={styles.metaRow}>
          <span className={styles.chip}>{role}</span>
          <span className={styles.chip}>
            <LuStore size={12} aria-hidden />
            {storeName}
          </span>
        </div>
      </div>

      <p className={styles.sectionLabel}>Quick access</p>
      <ul className={styles.menu}>
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button type="button" className={styles.menuBtn} onClick={() => go(item.path)}>
                <Icon size={18} strokeWidth={1.75} />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <p className={styles.sectionLabel}>Preferences</p>
      <Switch
        row
        label="Dark mode"
        hint={theme === 'dark' ? 'Using dark theme' : 'Using light theme'}
        checked={theme === 'dark'}
        onChange={toggleTheme}
      />

      <p className={styles.sectionLabel}>Session</p>
      <ul className={styles.menu}>
        <li>
          <button
            type="button"
            className={`${styles.menuBtn} ${styles.menuBtnDanger}`}
            onClick={handleLogout}
          >
            <LuLogOut size={18} strokeWidth={1.75} />
            Sign out
          </button>
        </li>
      </ul>
    </Drawer>
  );
}

export default AccountDrawer;
