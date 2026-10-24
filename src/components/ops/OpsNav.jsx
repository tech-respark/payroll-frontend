import React, { useEffect, useRef } from 'react';
import { NavLink, useHistory } from 'react-router-dom';
import { LuBriefcase, LuBuilding2, LuChevronLeft, LuChevronRight, LuBoxes, LuLogOut, LuUserPlus, LuUsers } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import styles from '../Navigation.module.scss';

const cx = (...parts) => parts.filter(Boolean).join(' ');

const isClientsPath = (pathname) => pathname === '/ops' || /^\/ops\/clients\/\d+$/.test(pathname);

const OpsNavItem = ({ to, icon: Icon, children, isActive, isCollapsed, onNavigate }) => (
  <li className={styles.navGroup}>
    <NavLink
      to={to}
      className={styles.navItem}
      activeClassName={styles.navItemActive}
      isActive={isActive}
      onClick={onNavigate}
      title={children}
      aria-label={isCollapsed ? children : undefined}
    >
      <span className={styles.navGroupHeaderLeft}>
        <Icon className={styles.navIcon} size={22} strokeWidth={1.75} />
        <span className={styles.navGroupTitle}>{children}</span>
      </span>
    </NavLink>
  </li>
);

const OpsNav = ({ isCollapsed, onToggle, onNavigate }) => {
  const { isSuperAdmin, logout } = useAuth();
  const history = useHistory();
  const collapseRef = useRef(null);
  const expandRef = useRef(null);
  const userToggledRef = useRef(false);

  const handleToggleClick = () => {
    userToggledRef.current = true;
    onToggle?.();
  };

  useEffect(() => {
    if (!userToggledRef.current) return undefined;
    userToggledRef.current = false;
    const id = window.setTimeout(() => {
      if (isCollapsed) expandRef.current?.focus({ preventScroll: true });
      else collapseRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(id);
  }, [isCollapsed]);

  const handleLogout = () => {
    const next = logout();
    history.replace(next);
  };

  return (
    <nav
      className={cx(styles.mainNavigation, isCollapsed && styles.collapsed)}
      aria-label="Ops"
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
          <h1>Relfor <span>Ops</span></h1>
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
          <OpsNavItem
            to="/ops"
            icon={LuBuilding2}
            isCollapsed={isCollapsed}
            onNavigate={onNavigate}
            isActive={(_, loc) => isClientsPath(loc.pathname)}
          >
            Clients
          </OpsNavItem>
          <OpsNavItem
            to="/ops/clients/new"
            icon={LuUserPlus}
            isCollapsed={isCollapsed}
            onNavigate={onNavigate}
          >
            New client
          </OpsNavItem>
        </ul>

        {isSuperAdmin && (
          <>
            <p className={cx(styles.sectionLabel, styles.sectionLabelSecond)} aria-hidden={isCollapsed ? 'true' : undefined}>
              Management
            </p>
            <div className={cx(styles.miniDivider, styles.miniDividerSecond)} aria-hidden="true" />
            <ul className={styles.navLinks}>
              <OpsNavItem
                to="/ops/products"
                icon={LuBoxes}
                isCollapsed={isCollapsed}
                onNavigate={onNavigate}
              >
                Products
              </OpsNavItem>
              <OpsNavItem
                to="/ops/operators"
                icon={LuUsers}
                isCollapsed={isCollapsed}
                onNavigate={onNavigate}
              >
                Operators
              </OpsNavItem>
            </ul>
          </>
        )}
        <div className={styles.navSpacer} />
      </div>

      <div className={styles.navFooter}>
        <button
          type="button"
          onClick={handleLogout}
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

export default OpsNav;
