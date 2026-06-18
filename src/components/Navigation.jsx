import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navigation.scss';

const Navigation = () => {
  const { logout, user, hasAccess } = useAuth();

  return (
    <nav className="main-navigation">
      <div className="nav-brand">
        <h1>Relfor <span>Payroll</span></h1>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/staff" activeClassName="active-link">
            Staff Dashboard
          </NavLink>
        </li>
        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SHIFTS', 'MANAGE_SHIFTS']) && (
          <li>
            <NavLink to="/shifts" activeClassName="active-link">
              Shift and Roster Management
            </NavLink>
          </li>
        )}
        <li>
          <NavLink to="/attendance" activeClassName="active-link">
            Attendance
          </NavLink>
        </li>
        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'MANAGE_ATTENDANCE']) && (
          <li>
            <NavLink to="/approvals" activeClassName="active-link">
              Regularization Approvals
            </NavLink>
          </li>
        )}
        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SALARY', 'MANAGE_SALARY']) && (
          <li>
            <NavLink to="/salary" activeClassName="active-link">
              Salary Management
            </NavLink>
          </li>
        )}
        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SALARY', 'MANAGE_SALARY']) && (
          <li>
            <NavLink to="/payslips" activeClassName="active-link">
              Payslips
            </NavLink>
          </li>
        )}
        {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN']) && (
          <li>
            <NavLink to="/roles" activeClassName="active-link">
              Role Management
            </NavLink>
          </li>
        )}
      </ul>
      <div className="nav-footer">
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#f8fafc', fontWeight: '500' }}>
          Store: Main Store
        </p>
        <button 
          onClick={logout} 
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#cbd5e1',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '16px',
            width: '100%',
            transition: 'all 0.2s ease',
            fontSize: '14px'
          }}
          onMouseOver={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
          onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#cbd5e1'; }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
