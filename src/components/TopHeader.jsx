import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import styles from './TopHeader.module.scss';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import MenuIcon from '@mui/icons-material/Menu';

const TopHeader = ({ onMenuClick, isMobile }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path.includes('reports/detailed')) return 'Report > Staff Detailed Report';
    if (path.includes('report')) return 'Report > Attendance Summary';
    if (path.includes('staff')) return 'Staff Management > Dashboard Overview';
    if (path.includes('leave-dashboard')) return 'Leave Management > Dashboard';
    if (path.includes('submit-leave')) return 'Leave Management > Request Leave';
    if (path.includes('leave-approvals')) return 'Leave Management > Approvals';
    if (path.includes('leave-configuration')) return 'Leave Management > Configuration';
    if (path.includes('leave')) return 'Leave Management > Overview';
    if (path.includes('holidays')) return 'Settings > Holiday Calendar';
    if (path.includes('attendance') || path.endsWith('/approvals') || path.includes('/approvals')) return 'Attendance Module > Overview';
    if (path.includes('shift')) return 'Shift & Roster Management > Schedules';
    if (path.includes('salary') || path.includes('payslip')) return 'Salary Management > Overview';
    return 'Overview';
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('reports/detailed')) return 'Staff Detailed Report';
    if (path.includes('report')) return 'Attendance Summary';
    if (path.includes('staff')) return 'Staff Dashboard';
    if (path.includes('leave-dashboard')) return 'Leave Dashboard';
    if (path.includes('submit-leave')) return 'Request Leave';
    if (path.includes('leave-approvals')) return 'Leave Approvals';
    if (path.includes('leave-configuration')) return 'Leave Configuration';
    if (path.includes('holidays')) return 'Holiday Calendar';
    if (path.includes('attendance')) return 'Attendance Dashboard';
    if (path.endsWith('/approvals') || path.includes('/approvals')) return 'Regularization Approvals';
    if (path.includes('shifts')) return 'Shift Management';
    if (path.includes('salary')) return 'Salary Management';
    if (path.includes('payslip')) return 'Payslips';
    if (path.includes('roles')) return 'Role Management';
    return 'Dashboard';
  };

  const formatName = (name) => {
    if (!name) return '';
    return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const getRawName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.username || user?.staffId || 'User';
  };

  const rawName = getRawName();
  const displayRole = user?.roles?.[0]?.replace('ROLE_', '') || user?.role || 'Staff';
  const displayName = formatName(rawName) || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className={styles.topHeader}>
      <div className={styles.headerLeft}>
        {isMobile && (
          <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Toggle menu">
            <MenuIcon fontSize="small" />
          </button>
        )}
        <div className={styles.titleBlock}>
          <h2 className={styles.pageTitle}>{getPageTitle()}</h2>
          <div className={styles.breadcrumbs}>{getBreadcrumbs()}</div>
        </div>
      </div>
      <div className={styles.headerRight}>
        <span className={styles.dateStr}>{today}</span>
        <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle Theme" aria-label="Toggle theme">
          {theme === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
        </button>
        <div className={styles.userProfile}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.userRole}>{displayRole}</span>
          </div>
          <div className={styles.avatar}>{initials}</div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
