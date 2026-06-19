import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navigation.module.scss';

const Navigation = () => {
  const { logout, user, hasAccess } = useAuth();

  return (
    <nav className={styles.mainNavigation}>
      <div className={styles.navBrand}>
        <h1>Relfor <span>Payroll</span></h1>
      </div>
      <ul className={styles.navLinks}>
        <li>
          <NavLink to="/staff" activeClassName={styles.activeLink}>
            Staff Dashboard
          </NavLink>
        </li>
        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SHIFTS', 'MANAGE_SHIFTS']) && (
          <li>
            <NavLink to="/shifts" activeClassName={styles.activeLink}>
              Shift and Roster Management
            </NavLink>
          </li>
        )}
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
        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SALARY', 'MANAGE_SALARY']) && (
          <li>
            <NavLink to="/salary" activeClassName={styles.activeLink}>
              Salary Management
            </NavLink>
          </li>
        )}
        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SALARY', 'MANAGE_SALARY']) && (
          <li>
            <NavLink to="/payslips" activeClassName={styles.activeLink}>
              Payslips
            </NavLink>
          </li>
        )}
        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN']) && (
          <li>
            <NavLink to="/roles" activeClassName={styles.activeLink}>
              Role Management
            </NavLink>
          </li>
        )}
      </ul>
      <div className={styles.navFooter}>
        <p className={styles.storeName}>
          Store: Main Store
        </p>
        <button 
          onClick={logout} 
          className={styles.signOutBtn}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
