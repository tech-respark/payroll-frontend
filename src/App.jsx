import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from './components/Toast';
import GlobalLoader from './components/GlobalLoader';
import Navigation from './components/Navigation';
import TopHeader from './components/TopHeader';
import { PageHelpProvider } from './context/PageHelpContext';
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
const HospitalityDashboard    = lazy(() => import('./screens/HospitalityDashboard'));
const MyWorkDashboard         = lazy(() => import('./screens/MyWorkDashboard'));
const DocsApp                 = lazy(() => import('./docs/DocsApp'));
const HomeDashboard           = lazy(() => import('./screens/HomeDashboard'));
const ActivityLogDashboard    = lazy(() => import('./screens/ActivityLogDashboard'));

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
const SIDEBAR_PREF_KEY = 'payroll.sidebarCollapsed';

const readDesktopSidebarPref = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_PREF_KEY) === 'true';
};

const AppContent = () => {
  const { isAuthenticated, hasAccess } = useAuth();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.innerWidth <= MOBILE_BREAKPOINT) return true;
    return readDesktopSidebarPref();
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile((wasMobile) => {
        if (!wasMobile && mobile) {
          setIsSidebarCollapsed(true);
        } else if (wasMobile && !mobile) {
          setIsSidebarCollapsed(readDesktopSidebarPref());
        }
        return mobile;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile || isSidebarCollapsed) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsSidebarCollapsed(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, isSidebarCollapsed]);

  if (!isAuthenticated) {
    const next = location.pathname.startsWith('/docs')
      ? `${location.pathname}${location.search}${location.hash}`
      : '';
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Redirect to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} />
      </Switch>
    );
  }

  if (location.pathname === '/docs' || location.pathname.startsWith('/docs/')) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/docs/:slug?" component={DocsApp} />
        </Switch>
      </Suspense>
    );
  }

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (!isMobile) {
        window.localStorage.setItem(SIDEBAR_PREF_KEY, String(next));
      }
      return next;
    });
  };
  const closeSidebar = () => { if (isMobile) setIsSidebarCollapsed(true); };

  return (
    <PageHelpProvider>
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
              <Route path="/home"       component={HomeDashboard} />
              {hasAccess(['VIEW_ACTIVITY_LOG']) && <Route path="/activity" component={ActivityLogDashboard} />}
              <Route path="/staff"      component={StaffDashboard} />
            <Route path="/attendance" component={AttendanceDashboard} />
            <Route path="/my-work"    component={MyWorkDashboard} />

            {/* Leave Management Routes */}
            <Redirect from="/hr-dashboard" to="/home" />
            <Route path="/leave-dashboard" component={EmployeeDashboard} />
            {hasAccess(['MANAGE_LEAVES']) && <Route path="/leave-approvals" component={ManagerApprovalPortal} />}
            {hasAccess(['MANAGE_LEAVES']) && <Route path="/leave-configuration" component={LeaveConfiguration} />}
            {hasAccess(['MANAGE_LEAVES']) && <Route path="/settings/holidays" component={HolidayCalendarScreen} />}

            {/* Protected Routes */}
            {hasAccess(['VIEW_SHIFTS', 'MANAGE_SHIFTS'])      && <Route path="/shifts"    component={ShiftsDashboard} />}
            {hasAccess(['MANAGE_ATTENDANCE'])                  && <Route path="/approvals" component={RegularizationApprovals} />}
            {hasAccess(['VIEW_SALARY', 'MANAGE_SALARY'])       && <Route path="/salary"    component={SalaryDashboard} />}
            {hasAccess(['VIEW_SALARY', 'MANAGE_SALARY'])       && <Route path="/payslips"  component={PayslipsDashboard} />}
            {hasAccess(['MANAGE_SALARY', 'VIEW_HOSPITALITY', 'MANAGE_HOSPITALITY']) && (
              <Route path="/hospitality" component={HospitalityDashboard} />
            )}
            {hasAccess(['MANAGE_ATTENDANCE', 'MANAGE_SALARY'])     && <Route path="/reports/detailed" component={StaffDetailedReport} />}
            {hasAccess(['VIEW_REPORTS'])     && <Route path="/reports"   component={ReportsDashboard} />}
            {hasAccess(['MANAGE_ROLES'])       && <Route path="/roles"     component={RoleManagement} />}

            <Redirect from="/login" to="/home" />
            <Redirect from="/"      to="/home" />
            <Redirect to="/home" />
          </Switch>
        </Suspense>
        </main>
      </div>
    </div>
    </PageHelpProvider>
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
