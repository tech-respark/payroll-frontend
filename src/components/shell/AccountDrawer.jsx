import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  LuBoxes,
  LuBuilding2,
  LuCalendarOff,
  LuChevronDown,
  LuChevronRight,
  LuClipboardCheck,
  LuHistory,
  LuHouse,
  LuLogOut,
  LuStore,
  LuUserPlus,
  LuUsers,
  LuWallet,
} from 'react-icons/lu';
import { prettyStatus } from '../../helpers/displayUtils';
import { Button, Drawer, Input, Switch } from '../ui';
import { apiService } from '../../api/apiService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useStoreConfig } from '../../hooks/queries';
import { totpQrDataUrl } from '../../helpers/totpQr';
import { isOpsUser } from '../../access/homeAccess';
import styles from './AccountDrawer.module.scss';

const formatName = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const staffCapabilities = (hasAccess) => [
  { id: 'attendance', label: 'View your attendance calendar' },
  { id: 'my-work', label: 'Clock in and request shift swaps' },
  { id: 'leaves', label: 'Request leave and check balances' },
  hasAccess(['VIEW_SALARY', 'MANAGE_SALARY']) && { id: 'salary', label: 'View your salary and payslips' },
  { id: 'profile', label: 'View your profile' },
].filter(Boolean);

/**
 * Right account panel — profile, store context, quick links, theme, logout.
 */
export function AccountDrawer({ open, onClose }) {
  const history = useHistory();
  const { user, logout, hasAccess, isPlatform, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { storeConfig } = useStoreConfig();

  const rawName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.username || user?.staffId || 'User';
  const displayName = formatName(rawName) || 'User';
  const email = user?.email || user?.username || '';
  const role = isPlatform
    ? prettyStatus(user?.opsRole)
    : user?.designation ||
      user?.roles?.find((r) => String(r).startsWith('ROLE_'))?.replace('ROLE_', '') ||
      'Staff';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const storeName = storeConfig?.storeName || 'Main Store';
  const isStaffOnly = !isOpsUser(hasAccess);
  const capabilities = isStaffOnly ? staffCapabilities(hasAccess) : [];
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUrl, setTotpUrl] = useState('');
  const [totpQr, setTotpQr] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const loadTotp = async () => {
    if (isPlatform) return;
    try {
      const res = await apiService.get('/payroll/me/totp');
      setTotpEnabled(Boolean(res?.data?.enabled ?? res?.enabled));
    } catch {
      setTotpEnabled(false);
    }
  };

  React.useEffect(() => {
    if (open && !isPlatform) loadTotp();
  }, [open, isPlatform]);

  const go = (path) => {
    onClose?.();
    history.push(path);
  };

  const handleLogout = () => {
    onClose?.();
    history.push(logout());
  };

  const shortcuts = isPlatform
    ? [
        { id: 'clients', label: 'Clients', path: '/ops', icon: LuBuilding2, show: true },
        { id: 'new', label: 'New client', path: '/ops/clients/new', icon: LuUserPlus, show: true },
        { id: 'products', label: 'Products', path: '/ops/products', icon: LuBoxes, show: isSuperAdmin },
        { id: 'operators', label: 'Operators', path: '/ops/operators', icon: LuUsers, show: isSuperAdmin },
      ].filter((item) => item.show)
    : [
    { id: 'home', label: 'Home', path: '/home', icon: LuHouse, show: true },
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
    {
      id: 'staff',
      label: hasAccess(['VIEW_OTHER_STAFF', 'MANAGE_STAFF']) ? 'Staff directory' : 'Profile',
      path: '/staff',
      icon: LuUsers,
      show: true,
    },
    {
      id: 'activity',
      label: 'Activity log',
      path: '/activity',
      icon: LuHistory,
      show: hasAccess(['VIEW_ACTIVITY_LOG']),
    },
  ].filter((s) => s.show);

  return (
    <Drawer open={open} onClose={onClose} title="Account" hideTitle width={320}>
      <div className={styles.profile}>
        <div className={styles.avatar} aria-hidden>
          {initials}
        </div>
        <h3 className={styles.name}>{displayName}</h3>
        {email && <p className={styles.email}>{email}</p>}
        <div className={styles.metaRow}>
          <span className={styles.chip}>{role}</span>
          {!isPlatform && (
            <span className={styles.chip}>
              <LuStore size={12} aria-hidden />
              {storeName}
            </span>
          )}
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

      {isPlatform && (
        <>
          <p className={styles.sectionLabel}>Password</p>
          <Input label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input label="New password" type="password" value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} />
          <Button
            variant="outline"
            disabled={passwordBusy || !currentPassword || nextPassword.length < 8}
            onClick={async () => {
              setPasswordBusy(true);
              try {
                await apiService.put('/ops/me/password', { currentPassword, password: nextPassword });
                setCurrentPassword('');
                setNextPassword('');
              } finally {
                setPasswordBusy(false);
              }
            }}
          >
            {passwordBusy ? 'Saving…' : 'Update password'}
          </Button>
        </>
      )}

      {!isPlatform && (
        <>
          <p className={styles.sectionLabel}>Two-factor authentication</p>
          <p className={styles.email}>{totpEnabled ? 'Authenticator is on for this account.' : 'Add an authenticator app code after password.'}</p>
          {!totpEnabled && !totpSecret && (
            <Button variant="outline" disabled={totpBusy} onClick={async () => {
              setTotpBusy(true);
              try {
                const res = await apiService.post('/payroll/me/totp/start', {});
                const data = res?.data || res;
                setTotpSecret(data.secret || '');
                setTotpUrl(data.otpauthUrl || '');
                setTotpQr(await totpQrDataUrl(data.otpauthUrl || ''));
              } catch (err) {
                showToast(err.message || 'Could not start authenticator setup.', 'error');
              } finally {
                setTotpBusy(false);
              }
            }}>{totpBusy ? 'Starting…' : 'Set up authenticator'}</Button>
          )}
          {totpSecret && (
            <div>
              {totpQr ? <img className={styles.totpQr} src={totpQr} alt="Authenticator QR code" /> : null}
              <p className={styles.email}>Scan this code in your authenticator app, or enter the secret manually: {totpSecret}</p>
              {totpUrl ? <p className={styles.email}>{totpUrl}</p> : null}
              <Input label="Confirm code" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} maxLength={6} />
              <Button disabled={totpBusy || totpCode.length < 6} onClick={async () => {
                setTotpBusy(true);
                try {
                  await apiService.post('/payroll/me/totp/confirm', { code: totpCode, secret: totpSecret });
                  setTotpEnabled(true);
                  setTotpSecret('');
                  setTotpUrl('');
                  setTotpQr('');
                  setTotpCode('');
                  showToast('Authenticator is on.', 'success');
                } catch (err) {
                  showToast(err.message || 'That code did not match.', 'error');
                } finally {
                  setTotpBusy(false);
                }
              }}>Turn on</Button>
            </div>
          )}
          {totpEnabled && (
            <div>
              <Input label="Code to turn off" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} maxLength={6} />
              <Button variant="outline" disabled={totpBusy || totpCode.length < 6} onClick={async () => {
                setTotpBusy(true);
                try {
                  await apiService.post('/payroll/me/totp/disable', { code: totpCode });
                  setTotpEnabled(false);
                  setTotpCode('');
                  showToast('Authenticator is off.', 'success');
                } catch (err) {
                  showToast(err.message || 'That code did not match.', 'error');
                } finally {
                  setTotpBusy(false);
                }
              }}>Turn off</Button>
            </div>
          )}
        </>
      )}

      <p className={styles.sectionLabel}>Preferences</p>
      <Switch
        row
        label="Dark mode"
        hint={theme === 'dark' ? 'Using dark theme' : 'Using light theme'}
        checked={theme === 'dark'}
        onChange={toggleTheme}
      />

      {capabilities.length > 0 && (
        <div className={styles.capabilityBlock}>
          <button
            type="button"
            className={styles.capabilityToggle}
            onClick={() => setCapabilitiesOpen((open) => !open)}
            aria-expanded={capabilitiesOpen}
          >
            <span>What you can do</span>
            {capabilitiesOpen
              ? <LuChevronDown size={16} aria-hidden />
              : <LuChevronRight size={16} aria-hidden />}
          </button>
          {capabilitiesOpen && (
            <ul className={styles.capabilityList}>
              {capabilities.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          )}
        </div>
      )}

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
