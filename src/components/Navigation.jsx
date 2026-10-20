import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navigation.module.scss';
import {
  LuBriefcase,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuUsers,
  LuCalendarDays,
  LuClipboardCheck,
  LuClock,
  LuWallet,
  LuReceipt,
  LuCalendarOff,
  LuChartColumn,
  LuLogOut,
  LuUser,
  LuBookOpen,
  LuHouse,
  LuHistory,
  LuListChecks,
} from 'react-icons/lu';
import { isOpsUser } from '../access/homeAccess';

const cx = (...parts) => parts.filter(Boolean).join(' ');

const NavItem = ({ to, icon: Icon, children, exact, onNavigate, isCollapsed }) => (
  <li className={styles.navGroup}>
    <NavLink
      to={to}
      exact={exact}
      className={styles.navItem}
      activeClassName={styles.navItemActive}
      onClick={onNavigate}
      title={typeof children === 'string' ? children : undefined}
      aria-label={isCollapsed && typeof children === 'string' ? children : undefined}
    >
      <span className={styles.navGroupHeaderLeft}>
        <Icon className={styles.navIcon} size={22} strokeWidth={1.75} />
        <span className={styles.navGroupTitle}>{children}</span>
      </span>
    </NavLink>
  </li>
);

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
  forceGroup = false,
}) => {
  const history = useHistory();
  const childNodes = React.Children.toArray(children).filter(
    (child) => child !== false && child != null
  );
  if (childNodes.length === 0) return null;

  if (childNodes.length === 1 && !forceGroup) {
    const only = React.Children.toArray(childNodes[0]?.props?.children)[0];
    const to = only?.props?.to || defaultPath;
    return (
      <NavItem
        to={to}
        icon={Icon}
        onNavigate={onNavigate}
        isCollapsed={isCollapsed}
      >
        {title}
      </NavItem>
    );
  }

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
  if (pathname === '/home' || pathname === '/' || pathname.startsWith('/activity')) return 'Home';
  if (pathname.startsWith('/staff') || pathname.startsWith('/roles')) return 'Staff';
  if (pathname.startsWith('/shifts')) return 'Shifts';
  if (pathname.startsWith('/attendance') || pathname.startsWith('/my-work')) return 'Attendance';
  if (pathname.startsWith('/approvals') || pathname.startsWith('/leave-approvals')) return 'Approvals';
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
    case 'Approvals':
      return hasAccess(['MANAGE_LEAVES']) ? '/leave-approvals' : '/approvals';
    case 'Payroll':
      return hasAccess(['VIEW_SALARY', 'MANAGE_SALARY']) ? '/salary' : '/hospitality';
    case 'Reports':
      return hasAccess(['VIEW_REPORTS']) ? '/reports' : '/reports/detailed';
    case 'Leave':
      return '/leave-dashboard';
    default:
      return '/staff';
  }
};

const NavFooter = ({ onNavigate }) => {
  const { logout } = useAuth();

  return (
    <div className={styles.navFooter}>
      <a
        href="/docs"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.docsButton}
        title="Documentation (opens in a new tab)"
        aria-label="Documentation (opens in a new tab)"
        onClick={onNavigate}
      >
        <LuBookOpen size={18} strokeWidth={1.75} />
        <span className={styles.docsLabel}>Documentation</span>
      </a>

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
  );
};

const Navigation = ({ isCollapsed, onToggle, onNavigate }) => {
  const { hasAccess } = useAuth();
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
  const isStaffNav = !isOpsUser(hasAccess);

  if (isStaffNav) {
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
            <NavItem to="/home" icon={LuHouse} exact onNavigate={handleNavClick} isCollapsed={isCollapsed}>
              Home
            </NavItem>
            {hasAccess(['VIEW_ACTIVITY_LOG']) && (
              <NavItem to="/activity" icon={LuHistory} onNavigate={handleNavClick} isCollapsed={isCollapsed}>
                Activity log
              </NavItem>
            )}
            <NavItem to="/attendance" icon={LuClipboardCheck} onNavigate={handleNavClick} isCollapsed={isCollapsed}>
              Attendance
            </NavItem>
            <NavItem to="/my-work" icon={LuClock} onNavigate={handleNavClick} isCollapsed={isCollapsed}>
              My Work
            </NavItem>
          </ul>

          <p
            className={cx(styles.sectionLabel, styles.sectionLabelSecond)}
            aria-hidden={isCollapsed ? 'true' : undefined}
          >
            Management
          </p>
          <div className={cx(styles.miniDivider, styles.miniDividerSecond)} aria-hidden="true" />
          <ul className={styles.navLinks}>
            <NavItem to="/leave-dashboard" icon={LuCalendarOff} onNavigate={handleNavClick} isCollapsed={isCollapsed}>
              My Leaves
            </NavItem>
            {hasAccess(['VIEW_SALARY', 'MANAGE_SALARY']) && (
              <>
                <NavItem to="/salary" icon={LuWallet} onNavigate={handleNavClick} isCollapsed={isCollapsed}>
                  Salary
                </NavItem>
                <NavItem to="/payslips" icon={LuReceipt} onNavigate={handleNavClick} isCollapsed={isCollapsed}>
                  Payslips
                </NavItem>
              </>
            )}
          </ul>

          <div className={styles.navSpacer} aria-hidden="true" />
          <ul className={styles.navLinks}>
            <NavItem to="/staff" icon={LuUser} onNavigate={handleNavClick} isCollapsed={isCollapsed}>
              Profile
            </NavItem>
          </ul>
        </div>

        <NavFooter onNavigate={handleNavClick} />
      </nav>
    );
  }

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
          <NavItem to="/home" icon={LuHouse} exact onNavigate={handleNavClick} isCollapsed={isCollapsed}>
            Home
          </NavItem>
          {hasAccess(['VIEW_ACTIVITY_LOG']) && (
            <NavItem to="/activity" icon={LuHistory} onNavigate={handleNavClick} isCollapsed={isCollapsed}>
              Activity log
            </NavItem>
          )}
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
          {(hasAccess(['MANAGE_LEAVES']) || hasAccess(['MANAGE_ATTENDANCE'])) && (
            <NavGroup
              title="Approvals"
              icon={LuListChecks}
              forceGroup
              isCollapsed={isCollapsed}
              isOpen={openGroup === 'Approvals'}
              isActive={activeGroup === 'Approvals'}
              defaultPath={defaultPathForGroup('Approvals', hasAccess)}
              onNavigate={handleNavClick}
              onToggleGroup={() => handleGroupToggle('Approvals')}
            >
              {hasAccess(['MANAGE_LEAVES']) && (
                <li>
                  <NavLink to="/leave-approvals" activeClassName={styles.activeLink} onClick={handleNavClick}>
                    Leave Approvals
                  </NavLink>
                </li>
              )}
              {hasAccess(['MANAGE_ATTENDANCE']) && (
                <li>
                  <NavLink to="/approvals" activeClassName={styles.activeLink} onClick={handleNavClick}>
                    Regularization Approvals
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
            <li>
              <NavLink to="/leave-dashboard" activeClassName={styles.activeLink} onClick={handleNavClick}>
                My Leaves
              </NavLink>
            </li>
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
          </NavGroup>

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
              {hasAccess(['VIEW_SALARY', 'MANAGE_SALARY']) && (
                <>
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
                </>
              )}
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
        </ul>
      </div>

      <NavFooter onNavigate={handleNavClick} />
    </nav>
  );
};

export default Navigation;
