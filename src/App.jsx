import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from './components/Toast';
import GlobalLoader from './components/GlobalLoader';
import Navigation from './components/Navigation';
import TopHeader from './components/TopHeader';
import styles from './App.module.scss';

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
const ReportsDashboard     = lazy(() => import('./screens/ReportsDashboard'));

// Leave Management Screens
const EmployeeDashboard       = lazy(() => import('./screens/EmployeeDashboard'));
const ManagerApprovalPortal   = lazy(() => import('./screens/ManagerApprovalPortal'));
const LeaveConfiguration      = lazy(() => import('./screens/LeaveConfiguration'));
const HolidayCalendarScreen   = lazy(() => import('./screens/HolidayCalendarScreen'));
const StaffDetailedReport     = lazy(() => import('./screens/StaffDetailedReport'));

// ─── Route-level loading fallback ────────────────────────────────────────────
const PageLoader = () => (
  <div className={styles.pageLoader}>
    <div className={styles.spinner} />
    <span className={styles.loadingText}>
      Loading module...
    </span>
  </div>
);

const AppContent = () => {
  const { isAuthenticated, hasAccess } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
      <Navigation isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div 
        className="content-wrapper" 
        style={{ 
          flex: 1, 
          marginLeft: isSidebarCollapsed ? '80px' : 'var(--sidebar-width)', 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh', 
          background: 'var(--bg-color)',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <TopHeader onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isCollapsed={isSidebarCollapsed} />
        <main className="main-content" style={{ flex: 1, padding: '30px', margin: 0 }}>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/staff"      component={StaffDashboard} />
            <Route path="/attendance" component={AttendanceDashboard} />

            {/* Leave Management Routes */}
            <Route path="/leave-dashboard" component={EmployeeDashboard} />
            {hasAccess(['MANAGE_LEAVES']) && <Route path="/leave-approvals" component={ManagerApprovalPortal} />}
            {hasAccess(['MANAGE_LEAVES']) && <Route path="/leave-configuration" component={LeaveConfiguration} />}
            {hasAccess(['MANAGE_LEAVES']) && <Route path="/settings/holidays" component={HolidayCalendarScreen} />}

            {/* Protected Routes */}
            {hasAccess(['VIEW_SHIFTS', 'MANAGE_SHIFTS'])      && <Route path="/shifts"    component={ShiftsDashboard} />}
            {hasAccess(['MANAGE_ATTENDANCE'])                  && <Route path="/approvals" component={RegularizationApprovals} />}
            {hasAccess(['VIEW_SALARY', 'MANAGE_SALARY'])       && <Route path="/salary"    component={SalaryDashboard} />}
            {hasAccess(['VIEW_SALARY', 'MANAGE_SALARY'])       && <Route path="/payslips"  component={PayslipsDashboard} />}
            {hasAccess(['MANAGE_ATTENDANCE', 'MANAGE_SALARY'])     && <Route path="/reports/detailed" component={StaffDetailedReport} />}
            {hasAccess(['VIEW_REPORTS'])     && <Route path="/reports"   component={ReportsDashboard} />}
            {hasAccess(['MANAGE_ROLES'])       && <Route path="/roles"     component={RoleManagement} />}

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
