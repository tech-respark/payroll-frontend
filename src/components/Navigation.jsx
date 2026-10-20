import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStoreConfig } from '../hooks/queries';
import styles from './Navigation.module.scss';
import {
  LuBriefcase,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuUsers,
  LuCalendarDays,
  LuClipboardCheck,
  LuWallet,
  LuCalendarOff,
  LuChartColumn,
  LuStore,
  LuLogOut,
} from 'react-icons/lu';

const cx = (...parts) => parts.filter(Boolean).join(' ');

const NavGroup = ({
  title,
  icon: Icon,
  children,
  isOpen,
  onToggleGroup,
  isCollapsed,
  isActive,
  defaultPath,
  onNavigate,
}) => {
  const history = useHistory();
  const childNodes = React.Children.toArray(children).filter(
    (child) => child !== false && child != null
  );
  if (childNodes.length === 0) return null;

  const handleClick = () => {
    if (isCollapsed) {
      if (defaultPath) {
        history.push(defaultPath);
        onNavigate?.();
      }
      return;
    }
    onToggleGroup();
  };

  const subOpen = isOpen && !isCollapsed;
  // Highlight the group header only when the rail is mini, or the accordion is closed.
  // When children are visible, the active child link carries the highlight instead.
  const headerActive = isActive && !subOpen;

  return (
    <li className={styles.navGroup}>
      <button
        type="button"
        className={cx(styles.navGroupHeader, headerActive && styles.navGroupHeaderActive)}
        onClick={handleClick}
        title={title}
        aria-label={isCollapsed ? `Go to ${title}` : title}
        aria-expanded={isCollapsed ? undefined : subOpen}
      >
        <span className={styles.navGroupHeaderLeft}>
          <Icon className={styles.navIcon} size={22} strokeWidth={1.75} />
          <span className={styles.navGroupTitle}>{title}</span>
        </span>
        <span className={styles.chevronWrap} aria-hidden>
          {subOpen
            ? <LuChevronDown size={16} className={styles.chevron} />
            : <LuChevronRight size={16} className={styles.chevron} />}
        </span>
      </button>
      <ul
        className={cx(styles.navSubList, subOpen && styles.navSubListOpen)}
        aria-hidden={!subOpen}
        {...(!subOpen ? { inert: '' } : {})}
      >
        {childNodes}
      </ul>
    </li>
  );
};

const groupForPath = (pathname) => {
  if (pathname.startsWith('/staff') || pathname.startsWith('/roles')) return 'Staff';
  if (pathname.startsWith('/shifts')) return 'Shifts';
  if (pathname.startsWith('/attendance') || pathname.startsWith('/approvals') || pathname.startsWith('/my-work')) return 'Attendance';
  if (pathname.startsWith('/salary') || pathname.startsWith('/payslips') || pathname.startsWith('/hospitality')) return 'Payroll';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (
    pathname.startsWith('/leave') ||
    pathname.startsWith('/hr-dashboard') ||
    pathname.startsWith('/settings/holidays')
  ) {
    return 'Leave';
  }
  return 'Staff';
};

const defaultPathForGroup = (title, hasAccess) => {
  switch (title) {
    case 'Staff':
      return '/staff';
    case 'Shifts':
      return '/shifts';
    case 'Attendance':
      return '/attendance';
    case 'Payroll':
      return '/salary';
    case 'Reports':
      return hasAccess(['VIEW_REPORTS']) ? '/reports' : '/reports/detailed';
    case 'Leave':
      if (hasAccess(['VIEW_HR_DASHBOARD'])) return '/hr-dashboard';
      if (hasAccess(['MANAGE_LEAVES'])) return '/leave-configuration';
      return '/leave-dashboard';
    default:
      return '/staff';
  }
};

const Navigation = ({ isCollapsed, onToggle, onNavigate }) => {
  const { logout, hasAccess } = useAuth();
  const { storeConfig } = useStoreConfig();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState(() =>
    isCollapsed ? null : groupForPath(location.pathname)
  );
  const wasCollapsedRef = useRef(isCollapsed);
  const userToggledRef = useRef(false);
  const expandRef = useRef(null);
  const collapseRef = useRef(null);
  const activeGroup = groupForPath(location.pathname);

  const handleToggleClick = () => {
    userToggledRef.current = true;
    onToggle?.();
  };

  useEffect(() => {
    if (!userToggledRef.current) return undefined;
    userToggledRef.current = false;
    // Wait a tick so the newly mounted expand/collapse control exists.
    const id = window.setTimeout(() => {
      if (isCollapsed) expandRef.current?.focus({ preventScroll: true });
      else collapseRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(id);
  }, [isCollapsed]);

  useEffect(() => {
    if (isCollapsed) {
      setOpenGroup(null);
      wasCollapsedRef.current = true;
      return undefined;
    }

    const pathGroup = groupForPath(location.pathname);
    // After expand, let the rail width lead before reopening the accordion.
    if (wasCollapsedRef.current) {
      wasCollapsedRef.current = false;
      const t = window.setTimeout(() => setOpenGroup(pathGroup), 180);
      return () => window.clearTimeout(t);
    }

    setOpenGroup(pathGroup);
    return undefined;
  }, [location.pathname, isCollapsed]);

  const handleGroupToggle = (title) => {
    setOpenGroup((prev) => (prev === title ? null : title));
  };

  const handleNavClick = () => onNavigate?.();

  return (
    <nav
      className={cx(styles.mainNavigation, isCollapsed && styles.collapsed)}
      aria-label="Main"
      data-collapsed={isCollapsed ? 'true' : 'false'}
    >
      <div className={styles.navBrand}>
        {isCollapsed ? (
          <button
            type="button"
            className={cx(styles.brandLogo, styles.brandLogoInteractive)}
            onClick={handleToggleClick}
            title="Expand menu"
            tabIndex={-1}
            aria-hidden="true"
          >
            <LuBriefcase size={22} strokeWidth={1.75} />
          </button>
        ) : (
          <div className={styles.brandLogo} aria-hidden="true">
            <LuBriefcase size={22} strokeWidth={1.75} />
          </div>
        )}
        <div className={styles.brandText}>
          <h1>Relfor <span>Payroll</span></h1>
        </div>
        {!isCollapsed && (
          <button
            ref={collapseRef}
            type="button"
            className={styles.collapseBtn}
            onClick={handleToggleClick}
            title="Collapse menu"
            aria-label="Collapse menu"
          >
            <LuChevronLeft size={16} />
          </button>
        )}
        {isCollapsed && (
          <button
            ref={expandRef}
            type="button"
            className={styles.expandRailBtn}
            onClick={handleToggleClick}
            title="Expand menu"
            aria-label="Expand menu"
          >
            <LuChevronRight size={14} />
          </button>
        )}
      </div>

      <div className={styles.navScroll}>
        <p className={styles.sectionLabel} aria-hidden={isCollapsed ? 'true' : undefined}>
          Overview
        </p>
        <div className={styles.miniDivider} aria-hidden="true" />
        <ul className={styles.navLinks}>
          <NavGroup
            title="Staff"
            icon={LuUsers}
            isCollapsed={isCollapsed}
            isOpen={openGroup === 'Staff'}
            isActive={activeGroup === 'Staff'}
            defaultPath={defaultPathForGroup('Staff', hasAccess)}
            onNavigate={handleNavClick}
            onToggleGroup={() => handleGroupToggle('Staff')}
          >
            <li>
              <NavLink to="/staff" activeClassName={styles.activeLink} onClick={handleNavClick}>
                Staff Details
              </NavLink>
            </li>
            {hasAccess(['MANAGE_ROLES']) && (
              <li>
                <NavLink to="/roles" activeClassName={styles.activeLink} onClick={handleNavClick}>
                  Roles & Permissions
                </NavLink>
              </li>
            )}
          </NavGroup>

          {hasAccess(['VIEW_SHIFTS', 'MANAGE_SHIFTS']) && (
            <NavGroup
              title="Shifts"
              icon={LuCalendarDays}
              isCollapsed={isCollapsed}
              isOpen={openGroup === 'Shifts'}
              isActive={activeGroup === 'Shifts'}
              defaultPath={defaultPathForGroup('Shifts', hasAccess)}
              onNavigate={handleNavClick}
              onToggleGroup={() => handleGroupToggle('Shifts')}
            >
              <li>
                <NavLink to="/shifts" activeClassName={styles.activeLink} onClick={handleNavClick}>
                  Shift Management
                </NavLink>
              </li>
            </NavGroup>
          )}

          <NavGroup
            title="Attendance"
            icon={LuClipboardCheck}
            isCollapsed={isCollapsed}
            isOpen={openGroup === 'Attendance'}
            isActive={activeGroup === 'Attendance'}
            defaultPath={defaultPathForGroup('Attendance', hasAccess)}
            onNavigate={handleNavClick}
            onToggleGroup={() => handleGroupToggle('Attendance')}
          >
            <li>
              <NavLink to="/attendance" activeClassName={styles.activeLink} onClick={handleNavClick}>
                Attendance
              </NavLink>
            </li>
            <li>
              <NavLink to="/my-work" activeClassName={styles.activeLink} onClick={handleNavClick}>
                My Work
              </NavLink>
            </li>
            {hasAccess(['MANAGE_ATTENDANCE']) && (
              <li>
                <NavLink to="/approvals" activeClassName={styles.activeLink} onClick={handleNavClick}>
                  Regularization Approvals
                </NavLink>
              </li>
            )}
          </NavGroup>
        </ul>

        <p
          className={cx(styles.sectionLabel, styles.sectionLabelSecond)}
          aria-hidden={isCollapsed ? 'true' : undefined}
        >
          Management
        </p>
        <div className={cx(styles.miniDivider, styles.miniDividerSecond)} aria-hidden="true" />
        <ul className={styles.navLinks}>
          {hasAccess(['VIEW_SALARY', 'MANAGE_SALARY', 'VIEW_HOSPITALITY', 'MANAGE_HOSPITALITY']) && (
            <NavGroup
              title="Payroll"
              icon={LuWallet}
              isCollapsed={isCollapsed}
              isOpen={openGroup === 'Payroll'}
              isActive={activeGroup === 'Payroll'}
              defaultPath={defaultPathForGroup('Payroll', hasAccess)}
              onNavigate={handleNavClick}
              onToggleGroup={() => handleGroupToggle('Payroll')}
            >
              <li>
                <NavLink to="/salary" activeClassName={styles.activeLink} onClick={handleNavClick}>
                  Salary Management
                </NavLink>
              </li>
              <li>
                <NavLink to="/payslips" activeClassName={styles.activeLink} onClick={handleNavClick}>
                  Payslips
                </NavLink>
              </li>
              {hasAccess(['MANAGE_SALARY', 'VIEW_HOSPITALITY', 'MANAGE_HOSPITALITY']) && (
                <li>
                  <NavLink to="/hospitality" activeClassName={styles.activeLink} onClick={handleNavClick}>
                    Hospitality Payroll
                  </NavLink>
                </li>
              )}
            </NavGroup>
          )}

          {(hasAccess(['VIEW_REPORTS']) || hasAccess(['MANAGE_ATTENDANCE', 'MANAGE_SALARY'])) && (
            <NavGroup
              title="Reports"
              icon={LuChartColumn}
              isCollapsed={isCollapsed}
              isOpen={openGroup === 'Reports'}
              isActive={activeGroup === 'Reports'}
              defaultPath={defaultPathForGroup('Reports', hasAccess)}
              onNavigate={handleNavClick}
              onToggleGroup={() => handleGroupToggle('Reports')}
            >
              {hasAccess(['VIEW_REPORTS']) && (
                <li>
                  <NavLink to="/reports" activeClassName={styles.activeLink} onClick={handleNavClick} exact>
                    Attendance Summary
                  </NavLink>
                </li>
              )}
              {hasAccess(['MANAGE_ATTENDANCE', 'MANAGE_SALARY']) && (
                <li>
                  <NavLink to="/reports/detailed" activeClassName={styles.activeLink} onClick={handleNavClick}>
                    Staff Detailed Report
                  </NavLink>
                </li>
              )}
            </NavGroup>
          )}

          <NavGroup
            title="Leave"
            icon={LuCalendarOff}
            isCollapsed={isCollapsed}
            isOpen={openGroup === 'Leave'}
            isActive={activeGroup === 'Leave'}
            defaultPath={defaultPathForGroup('Leave', hasAccess)}
            onNavigate={handleNavClick}
            onToggleGroup={() => handleGroupToggle('Leave')}
          >
            {hasAccess(['VIEW_HR_DASHBOARD']) && (
              <li>
                <NavLink to="/hr-dashboard" activeClassName={styles.activeLink} onClick={handleNavClick}>
                  HR Dashboard
                </NavLink>
              </li>
            )}
            {hasAccess(['MANAGE_LEAVES']) && (
              <li>
                <NavLink to="/leave-configuration" activeClassName={styles.activeLink} onClick={handleNavClick}>
                  Leave Config
                </NavLink>
              </li>
            )}
            {hasAccess(['MANAGE_LEAVES']) && (
              <li>
                <NavLink to="/settings/holidays" activeClassName={styles.activeLink} onClick={handleNavClick}>
                  Holiday Calendar
                </NavLink>
              </li>
            )}
            <li>
              <NavLink to="/leave-dashboard" activeClassName={styles.activeLink} onClick={handleNavClick}>
                My Leaves
              </NavLink>
            </li>
            {hasAccess(['MANAGE_LEAVES']) && (
              <li>
                <NavLink to="/leave-approvals" activeClassName={styles.activeLink} onClick={handleNavClick}>
                  Leave Approvals
                </NavLink>
              </li>
            )}
          </NavGroup>
        </ul>
      </div>

      <div className={styles.navFooter}>
        <div
          className={styles.storeCard}
          title={storeConfig?.storeName || 'Current store'}
          aria-label={storeConfig?.storeName || 'Current store'}
        >
          <div className={styles.storeIconWrap}>
            <LuStore size={18} strokeWidth={1.75} />
          </div>
          <div className={styles.storeDetails}>
            <span className={styles.storeName}>{storeConfig?.storeName || 'Main Store'}</span>
            <span className={styles.storeLabel}>Current store</span>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className={styles.logoutButton}
          title="Logout"
          aria-label="Logout"
        >
          <LuLogOut size={18} strokeWidth={1.75} />
          <span className={styles.logoutLabel}>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
