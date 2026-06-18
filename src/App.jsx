import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Toast from './components/Toast';
import Navigation from './components/Navigation';
import Login from './screens/Login';
import StaffDashboard from './screens/StaffDashboard';
import ShiftsDashboard from './screens/ShiftsDashboard';
import AttendanceDashboard from './screens/AttendanceDashboard';
import SalaryDashboard from './screens/SalaryDashboard';
import RoleManagement from './screens/RoleManagement';
import RegularizationApprovals from './screens/RegularizationApprovals';
import PayslipsDashboard from './screens/PayslipsDashboard';

const AppContent = () => {
  const { isAuthenticated, user, hasAccess } = useAuth();

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Redirect to="/login" />
      </Switch>
    );
  }

  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <Switch>
          <Route path="/staff" component={StaffDashboard} />
          <Route path="/attendance" component={AttendanceDashboard} />
          
          {/* Protected Routes */}
          {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SHIFTS', 'MANAGE_SHIFTS']) && <Route path="/shifts" component={ShiftsDashboard} />}
          {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'MANAGE_ATTENDANCE']) && <Route path="/approvals" component={RegularizationApprovals} />}
          {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SALARY', 'MANAGE_SALARY']) && <Route path="/salary" component={SalaryDashboard} />}
          {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SALARY', 'MANAGE_SALARY']) && <Route path="/payslips" component={PayslipsDashboard} />}
          {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN']) && <Route path="/roles" component={RoleManagement} />}
          
          <Redirect from="/login" to="/staff" />
          <Redirect from="/" to="/staff" />
        </Switch>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <AppContent />
          <Toast />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
