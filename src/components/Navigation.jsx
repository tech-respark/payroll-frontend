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

const NavGroup = ({ title, icon: Icon, children, defaultOpen = true, isCollapsed }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // If no children (meaning permissions hid all sub-items), don't render group
  const hasChildren = React.Children.toArray(children).some(child => child !== false);
  if (!hasChildren) return null;

  return (
    <li className={`${styles.navGroupContainer} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.navGroupHeader} onClick={() => !isCollapsed && setIsOpen(!isOpen)}>
        <div className={styles.navGroupHeaderLeft}>
          <Icon className={styles.navGroupIcon} fontSize="small" />
          {!isCollapsed && <span>{title}</span>}
        </div>
        {!isCollapsed && (isOpen ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />)}
      </div>
      {(isOpen && !isCollapsed) && <ul className={styles.navGroupSubList}>{children}</ul>}
    </li>
  );
};

const Navigation = ({ isCollapsed }) => {
  const { logout, hasAccess } = useAuth();
  const { storeConfig } = useStoreConfig();

  return (
    <nav className={`${styles.mainNavigation} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.navBrand}>
        <div className={styles.brandLogo}>
          <span className={styles.logoIcon}>💼</span>
        </div>
        {!isCollapsed && (
          <div className={styles.brandText}>
            <h1>Relfor <span>Payroll</span></h1>
            <p>Enterprise Suite</p>
          </div>
        )}
      </div>

      <ul className={styles.navLinks}>
        
        <NavGroup title="Core Management" icon={PeopleIcon} isCollapsed={isCollapsed}>
          <li>
            <NavLink to="/staff" activeClassName={styles.activeLink}>
              Staff Details
            </NavLink>
          </li>
          {hasAccess(['MANAGE_ROLES']) && (
            <li>
              <NavLink to="/roles" activeClassName={styles.activeLink}>
                Roles & Permissions
              </NavLink>
            </li>
          )}
        </NavGroup>

        {hasAccess(['VIEW_SHIFTS', 'MANAGE_SHIFTS']) && (
          <NavGroup title="Shift & Roster Mgmt" icon={CalendarMonthIcon} isCollapsed={isCollapsed}>
            <li>
              <NavLink to="/shifts" activeClassName={styles.activeLink}>
                Shift Management
              </NavLink>
            </li>
          </NavGroup>
        )}

        <NavGroup title="Attendance Module" icon={EventAvailableIcon} isCollapsed={isCollapsed}>
          <li>
            <NavLink to="/attendance" activeClassName={styles.activeLink}>
              Attendance
            </NavLink>
          </li>
          {hasAccess(['MANAGE_ATTENDANCE']) && (
            <li>
              <NavLink to="/approvals" activeClassName={styles.activeLink}>
                Regularization Approvals
              </NavLink>
            </li>
          )}
        </NavGroup>

        {hasAccess(['VIEW_SALARY', 'MANAGE_SALARY']) && (
          <NavGroup title="Salary Mgmt" icon={PaymentsIcon} isCollapsed={isCollapsed}>
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

        <NavGroup title="Leave Management" icon={FlightTakeoffIcon} isCollapsed={isCollapsed}>
          {hasAccess(['MANAGE_LEAVES']) && (
            <li>
              <NavLink to="/leave-configuration" activeClassName={styles.activeLink}>
                Leave Config
              </NavLink>
            </li>
          )}
          <li>
            <NavLink to="/leave-dashboard" activeClassName={styles.activeLink}>
              My Leaves
            </NavLink>
          </li>
          {hasAccess(['MANAGE_LEAVES']) && (
            <li>
              <NavLink to="/leave-approvals" activeClassName={styles.activeLink}>
                Leave Approvals
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
        
        <div className={styles.logoutWrapper}>
          <button onClick={logout} className={`${styles.logoutButton} ${isCollapsed ? styles.collapsedBtn : ''}`}>
            <LogoutIcon fontSize="small" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
