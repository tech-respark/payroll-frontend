import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStoreConfig } from '../hooks/queries';
import styles from './Navigation.module.scss';
import StoreIcon from '@mui/icons-material/Store';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Menu Icons
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PaymentsIcon from '@mui/icons-material/Payments';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';

const NavGroup = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // If no children (meaning permissions hid all sub-items), don't render group
  const hasChildren = React.Children.toArray(children).some(child => child !== false);
  if (!hasChildren) return null;

  return (
    <li className={styles.navGroupContainer}>
      <div className={styles.navGroupHeader} onClick={() => setIsOpen(!isOpen)}>
        <div className={styles.navGroupHeaderLeft}>
          <Icon className={styles.navGroupIcon} fontSize="small" />
          <span>{title}</span>
        </div>
        {isOpen ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
      </div>
      {isOpen && <ul className={styles.navGroupSubList}>{children}</ul>}
    </li>
  );
};

const Navigation = () => {
  const { logout, hasAccess } = useAuth();
  const { storeConfig } = useStoreConfig();

  return (
    <nav className={styles.mainNavigation}>
      <div className={styles.navBrand}>
        <div className={styles.brandLogo}>
          <span className={styles.logoIcon}>💼</span>
        </div>
        <div className={styles.brandText}>
          <h1>Relfor <span>Payroll</span></h1>
          <p>Enterprise Suite</p>
        </div>
      </div>

      <ul className={styles.navLinks}>
        
        <NavGroup title="Staff Mgmt" icon={PeopleIcon} defaultOpen={true}>
          <li>
            <NavLink to="/staff" activeClassName={styles.activeLink}>
              Staff Dashboard
            </NavLink>
          </li>
          {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN']) && (
            <li>
              <NavLink to="/roles" activeClassName={styles.activeLink}>
                Role Management
              </NavLink>
            </li>
          )}
        </NavGroup>

        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SHIFTS', 'MANAGE_SHIFTS']) && (
          <NavGroup title="Shift & Roster Mgmt" icon={CalendarMonthIcon} defaultOpen={true}>
            <li>
              <NavLink to="/shifts" activeClassName={styles.activeLink}>
                Shift Management
              </NavLink>
            </li>
          </NavGroup>
        )}

        <NavGroup title="Attendance Module" icon={EventAvailableIcon} defaultOpen={true}>
          <li>
            <NavLink to="/attendance" activeClassName={styles.activeLink}>
              Attendance
            </NavLink>
          </li>
          {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'MANAGE_ATTENDANCE']) && (
            <li>
              <NavLink to="/approvals" activeClassName={styles.activeLink}>
                Regularization Approvals
              </NavLink>
            </li>
          )}
        </NavGroup>

        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SALARY', 'MANAGE_SALARY']) && (
          <NavGroup title="Salary Mgmt" icon={PaymentsIcon} defaultOpen={true}>
            <li>
              <NavLink to="/salary" activeClassName={styles.activeLink}>
                Salary Management
              </NavLink>
            </li>
            <li>
              <NavLink to="/payslips" activeClassName={styles.activeLink}>
                Payslips
              </NavLink>
            </li>
          </NavGroup>
        )}

        <NavGroup title="Leave Mgmt" icon={FlightTakeoffIcon} defaultOpen={true}>
          {hasAccess(['MANAGE_LEAVES']) && (
            <li>
              <NavLink to="/leave-configuration" activeClassName={styles.activeLink}>
                Leave Config
              </NavLink>
            </li>
          )}
          {hasAccess(['VIEW_LEAVES', 'MANAGE_LEAVES']) && (
            <li>
              <NavLink to="/leave-dashboard" activeClassName={styles.activeLink}>
                Leave Dashboard
              </NavLink>
            </li>
          )}
          {hasAccess(['MANAGE_LEAVES']) && (
            <li>
              <NavLink to="/leave-approvals" activeClassName={styles.activeLink}>
                Leave Approval
              </NavLink>
            </li>
          )}
          {hasAccess(['VIEW_LEAVES', 'MANAGE_LEAVES']) && (
            <li>
              <NavLink to="/submit-leave" activeClassName={styles.activeLink}>
                Request Leave
              </NavLink>
            </li>
          )}
        </NavGroup>

      </ul>

      <div className={styles.navFooter}>
        <div className={styles.storeCard}>
          <StoreIcon fontSize="small" className={styles.storeIcon} />
          <div className={styles.storeDetails}>
            <span className={styles.storeName}>{storeConfig?.storeName || 'Main Store'}</span>
            <span className={styles.storeLabel}>CURRENT STORE</span>
          </div>
        </div>
        
        <button onClick={logout} className={styles.signOutBtn}>
          <LogoutIcon fontSize="small" />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
