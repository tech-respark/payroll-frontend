import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHeaderNotifications } from '../hooks/queries/useHeaderNotifications';
import { CommandPalette } from './shell/CommandPalette';
import { AccountDrawer } from './shell/AccountDrawer';
import { NotificationsDrawer } from './shell/NotificationsDrawer';
import styles from './TopHeader.module.scss';
import { LuBell, LuInfo, LuMenu, LuSearch } from 'react-icons/lu';
import { usePageHelpOverride } from '../context/PageHelpContext';
import { resolvePageHelp } from './shell/pageHelp';

const PAGE_META = [
  { match: (p) => p === '/home' || p === '/', title: 'Home', crumbs: ['Dashboard', 'Home'] },
  { match: (p) => p.startsWith('/activity'), title: 'Activity log', crumbs: ['Dashboard', 'Activity log'] },
  { match: (p) => p.includes('reports/detailed'), title: 'Staff Detailed Report', crumbs: ['Dashboard', 'Reports', 'Detailed'] },
  { match: (p) => p.includes('report'), title: 'Attendance Summary', crumbs: ['Dashboard', 'Reports', 'Summary'] },
  { match: (p) => p.includes('staff'), title: 'Staff', crumbs: ['Dashboard', 'Staff', 'List'] },
  { match: (p) => p.includes('leave-dashboard'), title: 'My Leaves', crumbs: ['Dashboard', 'Leave', 'My Leaves'] },
  { match: (p) => p.includes('leave-approvals'), title: 'Leave Approvals', crumbs: ['Dashboard', 'Approvals', 'Leave'] },
  { match: (p) => p.includes('leave-configuration'), title: 'Leave Configuration', crumbs: ['Dashboard', 'Leave', 'Config'] },
  { match: (p) => p.includes('holidays'), title: 'Holiday Calendar', crumbs: ['Dashboard', 'Settings', 'Holidays'] },
  { match: (p) => p.includes('hr-dashboard'), title: 'HR Dashboard', crumbs: ['Dashboard', 'Leave', 'HR'] },
  { match: (p) => p.includes('my-work'), title: 'My Work', crumbs: ['Dashboard', 'Attendance', 'My Work'] },
  { match: (p) => p.includes('hospitality'), title: 'Hospitality Payroll', crumbs: ['Dashboard', 'Payroll', 'Hospitality'] },
  { match: (p) => p.includes('attendance'), title: 'Attendance', crumbs: ['Dashboard', 'Attendance', 'Overview'] },
  { match: (p) => p.includes('approvals'), title: 'Regularization Approvals', crumbs: ['Dashboard', 'Approvals', 'Regularization'] },
  { match: (p) => p.includes('shifts'), title: 'Shift Management', crumbs: ['Dashboard', 'Shifts', 'Management'] },
  { match: (p) => p.includes('salary'), title: 'Salary Management', crumbs: ['Dashboard', 'Payroll', 'Salary'] },
  { match: (p) => p.includes('payslip'), title: 'Payslips', crumbs: ['Dashboard', 'Payroll', 'Payslips'] },
  { match: (p) => p.includes('roles'), title: 'Role Management', crumbs: ['Dashboard', 'Staff', 'Roles'] },
];

const formatName = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

function PageHelpTip({ text }) {
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!text) return null;

  return (
    <>
      <span className={styles.crumbSep} aria-hidden>•</span>
      <span ref={wrapRef} className={`${styles.helpWrap} ${open ? styles.helpOpen : ''}`}>
        <button
          type="button"
          className={styles.helpBtn}
          aria-label="About this page"
          aria-expanded={open}
          aria-describedby="page-help-tip"
          onClick={() => setOpen((prev) => !prev)}
        >
          <LuInfo size={13} strokeWidth={2} aria-hidden />
        </button>
        <span id="page-help-tip" role="tooltip" className={styles.helpTip}>
          {text}
        </span>
      </span>
    </>
  );
}

const TopHeader = ({ onMenuClick, isMobile }) => {
  const location = useLocation();
  const { user, hasAccess } = useAuth();
  const { total: notifCount } = useHeaderNotifications();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const isSelfProfile = !hasAccess(['VIEW_OTHER_STAFF', 'MANAGE_STAFF']);

  const found = PAGE_META.find((item) => item.match(location.pathname));
  const meta = location.pathname.includes('/staff') && isSelfProfile
    ? { title: 'Profile', crumbs: ['Dashboard', 'Profile'] }
    : found || { title: 'Dashboard', crumbs: ['Dashboard'] };
  const helpOverride = usePageHelpOverride();
  const pageHelp = helpOverride || resolvePageHelp(location.pathname, hasAccess);

  const getRawName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.username || user?.staffId || 'User';
  };

  const displayName = formatName(getRawName()) || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        setAccountOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className={styles.topHeader}>
        <div className={styles.headerLeft}>
          {isMobile && (
            <button type="button" className={styles.menuBtn} onClick={onMenuClick} aria-label="Toggle menu">
              <LuMenu size={20} />
            </button>
          )}
          <div className={styles.titleBlock}>
            <h2 className={styles.pageTitle}>{meta.title}</h2>
            <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
              {meta.crumbs.map((crumb, index) => (
                <React.Fragment key={`${crumb}-${index}`}>
                  {index > 0 && <span className={styles.crumbSep}>•</span>}
                  <span className={index === meta.crumbs.length - 1 ? styles.crumbCurrent : styles.crumb}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
              <PageHelpTip text={pageHelp} />
            </nav>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.searchBtn}
            onClick={() => {
              setPaletteOpen(true);
              setAccountOpen(false);
              setNotifOpen(false);
            }}
            aria-label="Open search"
          >
            <LuSearch size={16} strokeWidth={1.75} aria-hidden />
            <span className={styles.searchLabel}>Search…</span>
            <kbd className={styles.searchKbd}>{isMac ? '⌘' : 'Ctrl'}K</kbd>
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => {
              setNotifOpen(true);
              setAccountOpen(false);
              setPaletteOpen(false);
            }}
            title="Notifications"
            aria-label={notifCount > 0 ? `Notifications, ${notifCount} pending` : 'Notifications'}
          >
            <LuBell size={18} strokeWidth={1.75} />
            {notifCount > 0 && (
              <span className={styles.badge}>{notifCount > 99 ? '99+' : notifCount}</span>
            )}
          </button>

          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => {
              setAccountOpen(true);
              setNotifOpen(false);
              setPaletteOpen(false);
            }}
            aria-label="Open account menu"
            title={displayName}
          >
            <span className={styles.avatar}>{initials}</span>
          </button>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
      <AccountDrawer open={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
};

export default TopHeader;
