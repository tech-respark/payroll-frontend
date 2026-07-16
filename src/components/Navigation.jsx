import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStoreConfig } from '../hooks/queries';
import styles from './Navigation.module.scss';
import StoreIcon from '@mui/icons-material/Store';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

// Menu Icons
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PaymentsIcon from '@mui/icons-material/Payments';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AssessmentIcon from '@mui/icons-material/Assessment';

const NavGroup = ({ title, icon: Icon, children, isOpen, onToggleGroup, isCollapsed }) => {
  // If no children (meaning permissions hid all sub-items), don't render group
  const hasChildren = React.Children.toArray(children).some(child => child !== false);
  if (!hasChildren) return null;

  return (
    <li className={`${styles.navGroupContainer} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.navGroupHeader} onClick={() => !isCollapsed && onToggleGroup()}>
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

const Navigation = ({ isCollapsed, onToggle }) => {
  const { logout, hasAccess } = useAuth();
  const { storeConfig } = useStoreConfig();
  const [openGroup, setOpenGroup] = useState('Staff Management');

  const handleGroupToggle = (title) => {
    setOpenGroup(prev => prev === title ? null : title);
  };

  return (
    <nav className={`${styles.mainNavigation} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.navBrand}>
        <div 
          className={styles.brandLogo} 
          onClick={isCollapsed ? onToggle : undefined}
          style={{ cursor: isCollapsed ? 'pointer' : 'default' }}
          title={isCollapsed ? "Expand Menu" : ""}
        >
          <span className={styles.logoIcon}>💼</span>
        </div>
        {!isCollapsed && (
          <>
            <div className={styles.brandText}>
              <h1>Relfor <span>Payroll</span></h1>
              <p>Enterprise Suite</p>
            </div>
            <button className={styles.collapseBtn} onClick={onToggle} title="Collapse Menu">
              <ChevronLeftIcon fontSize="small" />
            </button>
          </>
        )}
      </div>

      <ul className={styles.navLinks}>
        
        <NavGroup 
          title="Staff Management" 
          icon={PeopleIcon} 
          isCollapsed={isCollapsed}
          isOpen={openGroup === 'Staff Management'}
          onToggleGroup={() => handleGroupToggle('Staff Management')}
        >
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
          <NavGroup 
            title="Shift & Roster Mgmt" 
            icon={CalendarMonthIcon} 
            isCollapsed={isCollapsed}
            isOpen={openGroup === 'Shift & Roster Mgmt'}
            onToggleGroup={() => handleGroupToggle('Shift & Roster Mgmt')}
          >
            <li>
              <NavLink to="/shifts" activeClassName={styles.activeLink}>
                Shift Management
              </NavLink>
            </li>
          </NavGroup>
        )}

        <NavGroup 
          title="Attendance Module" 
          icon={EventAvailableIcon} 
          isCollapsed={isCollapsed}
          isOpen={openGroup === 'Attendance Module'}
          onToggleGroup={() => handleGroupToggle('Attendance Module')}
        >
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
          <NavGroup 
            title="Salary Mgmt" 
            icon={PaymentsIcon} 
            isCollapsed={isCollapsed}
            isOpen={openGroup === 'Salary Mgmt'}
            onToggleGroup={() => handleGroupToggle('Salary Mgmt')}
          >
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

        {hasAccess(['MANAGE_ATTENDANCE', 'MANAGE_SALARY']) && (
          <NavGroup 
            title="Reports & Analytics" 
            icon={AssessmentIcon} 
            isCollapsed={isCollapsed}
            isOpen={openGroup === 'Reports & Analytics'}
            onToggleGroup={() => handleGroupToggle('Reports & Analytics')}
          >
            <li>
              <NavLink to="/reports" activeClassName={styles.activeLink} exact>
                Attendance Summary
              </NavLink>
            </li>
            <li>
              <NavLink to="/reports/detailed" activeClassName={styles.activeLink}>
                Staff Detailed Report
              </NavLink>
            </li>
          </NavGroup>
        )}

        <NavGroup 
          title="Leave Management" 
          icon={FlightTakeoffIcon} 
          isCollapsed={isCollapsed}
          isOpen={openGroup === 'Leave Management'}
          onToggleGroup={() => handleGroupToggle('Leave Management')}
        >
          {hasAccess(['MANAGE_LEAVES']) && (
            <li>
              <NavLink to="/leave-configuration" activeClassName={styles.activeLink}>
                Leave Config
              </NavLink>
            </li>
          )}
          {hasAccess(['MANAGE_LEAVES']) && (
            <li>
              <NavLink to="/settings/holidays" activeClassName={styles.activeLink}>
                Holiday Calendar
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
