import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import styles from './TopHeader.module.scss';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

const TopHeader = ({ onMenuClick, isCollapsed }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  // Simple breadcrumb logic based on route
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path.includes('staff')) return 'Admin > Staff Management > Dashboard Overview';
    if (path.includes('attendance') || path.includes('approvals')) return 'Admin > Attendance Module > Overview';
    if (path.includes('leave')) return 'Admin > Leave Management > Overview';
    if (path.includes('shift')) return 'Admin > Shift & Roster Management > Schedules';
    if (path.includes('salary') || path.includes('payslip')) return 'Admin > Salary Management > Overview';
    return 'Admin > Overview';
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('staff')) return 'Staff Dashboard';
    if (path.includes('attendance')) return 'Attendance Dashboard';
    if (path.includes('approvals')) return 'Regularization Approvals';
    if (path.includes('leave-dashboard')) return 'Leave Dashboard';
    if (path.includes('submit-leave')) return 'Request Leave';
    if (path.includes('leave-approvals')) return 'Leave Approvals';
    if (path.includes('leave-configuration')) return 'Leave Configuration';
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

  return (
    <header className={styles.topHeader}>
      <div className={styles.headerLeft}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <h2 className={styles.pageTitle} style={{ margin: 0 }}>{getPageTitle()}</h2>
        </div>
        <div className={styles.breadcrumbs}>{getBreadcrumbs()}</div>
      </div>
      <div className={styles.headerRight}>
        <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
        </button>
        <button className={styles.iconBtn} title="Notifications">
          <NotificationsIcon fontSize="small" />
          <span className={styles.badge}>3</span>
        </button>
        <div className={styles.userProfile}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.userRole}>{displayRole}</span>
          </div>
          <div className={styles.avatar}>
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
