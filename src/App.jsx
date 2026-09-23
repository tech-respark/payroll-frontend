import React, { Suspense, lazy, useState, useEffect } from 'react';
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
const HRDashboard             = lazy(() => import('./screens/HRDashboard'));
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

const MOBILE_BREAKPOINT = 1024;

const AppContent = () => {
  const { isAuthenticated, hasAccess } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
  );
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) setIsSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Redirect to="/login" />
      </Switch>
    );
  }

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
  const closeSidebar = () => { if (isMobile) setIsSidebarCollapsed(true); };

  return (
    <div className="app-layout">
      {isMobile && !isSidebarCollapsed && (
        <div className={styles.sidebarOverlay} onClick={closeSidebar} aria-hidden="true" />
      )}
      <Navigation
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        onNavigate={closeSidebar}
      />
      <div className={`content-wrapper ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <TopHeader
          onMenuClick={toggleSidebar}
          isCollapsed={isSidebarCollapsed}
          isMobile={isMobile}
        />
        <main className="main-content animate-fade-in">
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/staff"      component={StaffDashboard} />
            <Route path="/attendance" component={AttendanceDashboard} />

            {/* Leave Management Routes */}
            {hasAccess(['VIEW_HR_DASHBOARD']) && <Route path="/hr-dashboard" component={HRDashboard} />}
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
