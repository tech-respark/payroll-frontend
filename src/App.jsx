import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from './components/Toast';
import GlobalLoader from './components/GlobalLoader';
import Navigation from './components/Navigation';
import TopHeader from './components/TopHeader';

// ─── Eagerly loaded (always needed) ──────────────────────────────────────────
import Login from './screens/Login';

// ─── Lazy loaded (downloaded only when first visited) ────────────────────────
const StaffDashboard       = lazy(() => import('./screens/StaffDashboard'));
const ShiftsDashboard      = lazy(() => import('./screens/ShiftsDashboard'));
const AttendanceDashboard  = lazy(() => import('./screens/AttendanceDashboard'));
const SalaryDashboard      = lazy(() => import('./screens/SalaryDashboard'));
const RoleManagement       = lazy(() => import('./screens/RoleManagement'));
const RegularizationApprovals = lazy(() => import('./screens/RegularizationApprovals'));
const PayslipsDashboard    = lazy(() => import('./screens/PayslipsDashboard'));

// Leave Management Screens
const EmployeeDashboard       = lazy(() => import('./screens/EmployeeDashboard'));
const SubmitLeaveRequest      = lazy(() => import('./screens/SubmitLeaveRequest'));
const ManagerApprovalPortal   = lazy(() => import('./screens/ManagerApprovalPortal'));
const LeaveConfiguration      = lazy(() => import('./screens/LeaveConfiguration'));

// ─── Route-level loading fallback ────────────────────────────────────────────
const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '60vh',
    gap: '16px',
  }}>
    <div style={{
      width: '44px',
      height: '44px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #3f97ef',
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite',
    }} />
    <span style={{
      fontSize: '13px',
      color: '#7b809a',
      fontFamily: 'Poppins, sans-serif',
      letterSpacing: '0.02em',
    }}>
      Loading module...
    </span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const AppContent = () => {
  const { isAuthenticated, hasAccess } = useAuth();

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
      <div className="content-wrapper" style={{ flex: 1, marginLeft: 'var(--sidebar-width)', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-color)' }}>
        <TopHeader />
        <main className="main-content" style={{ flex: 1, padding: '30px', margin: 0 }}>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/staff"      component={StaffDashboard} />
            <Route path="/attendance" component={AttendanceDashboard} />

            {/* Leave Management Routes */}
            {hasAccess(['VIEW_LEAVES', 'MANAGE_LEAVES']) && <Route path="/leave-dashboard" component={EmployeeDashboard} />}
            {hasAccess(['VIEW_LEAVES', 'MANAGE_LEAVES']) && <Route path="/submit-leave"    component={SubmitLeaveRequest} />}
            {hasAccess(['MANAGE_LEAVES']) && <Route path="/leave-approvals" component={ManagerApprovalPortal} />}
            {hasAccess(['MANAGE_LEAVES']) && <Route path="/leave-configuration" component={LeaveConfiguration} />}

            {/* Protected Routes */}
            {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SHIFTS', 'MANAGE_SHIFTS'])      && <Route path="/shifts"    component={ShiftsDashboard} />}
            {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'MANAGE_ATTENDANCE'])                 && <Route path="/approvals" component={RegularizationApprovals} />}
            {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SALARY', 'MANAGE_SALARY'])      && <Route path="/salary"    component={SalaryDashboard} />}
            {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'VIEW_SALARY', 'MANAGE_SALARY'])      && <Route path="/payslips"  component={PayslipsDashboard} />}
            {hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN'])                                      && <Route path="/roles"     component={RoleManagement} />}

            <Redirect from="/login" to="/staff" />
            <Redirect from="/"      to="/staff" />
          </Switch>
        </Suspense>
        </main>
      </div>
    </div>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 60 * 1000, // 1 minute
      retry: 1
    },
  },
});

// Connect TanStack Query DevTools extension
if (typeof window !== 'undefined') {
  window.__TANSTACK_QUERY_CLIENT__ = queryClient;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Router>
              <AppContent />
              <Toast />
              <GlobalLoader />
            </Router>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
