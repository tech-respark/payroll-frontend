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
import OpsLogin from './screens/ops/OpsLogin';
import OpsSupportLaunch from './screens/ops/OpsSupportLaunch';
import OpsSupportEnded from './screens/ops/OpsSupportEnded';
import OpsLayout from './components/ops/OpsLayout';

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
const OpsHome                 = lazy(() => import('./screens/ops/OpsHome'));
const OpsOnboardingWizard     = lazy(() => import('./screens/ops/OpsOnboardingWizard'));
const OpsClientDetail         = lazy(() => import('./screens/ops/OpsClientDetail'));
const OpsOperators            = lazy(() => import('./screens/ops/OpsOperators'));
const OpsProducts             = lazy(() => import('./screens/ops/OpsProducts'));
const PayRunDashboard         = lazy(() => import('./screens/payroll/PayRunDashboard'));
const ClaimsDashboard         = lazy(() => import('./screens/payroll/ClaimsDashboard'));
const LoansDashboard          = lazy(() => import('./screens/payroll/LoansDashboard'));
const SettlementsDashboard    = lazy(() => import('./screens/payroll/SettlementsDashboard'));
const PayrollCostReport       = lazy(() => import('./screens/payroll/PayrollCostReport'));

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
  const { isAuthenticated, hasAccess, isPlatform, isSuperAdmin, isSupportSession, user, logout } = useAuth();
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

  if (location.pathname === '/ops/support-launch') {
    return <OpsSupportLaunch />;
  }
  if (location.pathname === '/ops/support-ended') {
    return <OpsSupportEnded />;
  }

  if (!isAuthenticated) {
    const wantsOps = location.pathname === '/ops' || location.pathname.startsWith('/ops/');
    const next = location.pathname.startsWith('/docs')
      ? `${location.pathname}${location.search}${location.hash}`
      : '';
    return (
      <Switch>
        <Route path="/ops/login" component={OpsLogin} />
        <Route path="/login" component={Login} />
        <Redirect to={wantsOps ? '/ops/login' : (next ? `/login?next=${encodeURIComponent(next)}` : '/login')} />
      </Switch>
    );
  }

  if (isPlatform) {
    if (!location.pathname.startsWith('/ops')) {
      return <Redirect to="/ops" />;
    }
    return (
      <OpsLayout>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/ops" exact component={OpsHome} />
            <Route path="/ops/clients/new" component={OpsOnboardingWizard} />
            <Route path="/ops/clients/:tenantId" component={OpsClientDetail} />
            {isSuperAdmin && <Route path="/ops/products" component={OpsProducts} />}
            {isSuperAdmin && <Route path="/ops/operators" component={OpsOperators} />}
            <Redirect to="/ops" />
          </Switch>
        </Suspense>
      </OpsLayout>
    );
  }

  if (location.pathname === '/ops' || location.pathname.startsWith('/ops/')) {
    return <Redirect to="/home" />;
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
      {isSupportSession && (
        <div className={styles.supportBanner} role="status">
          Support session as {user?.username || 'client'} — this tab does not replace the ops console.
          <button type="button" className={styles.supportEnd} onClick={() => { window.location.href = logout(); }}>
            End session
          </button>
        </div>
      )}
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
            {hasAccess(['VIEW_SALARY', 'MANAGE_SALARY'])       && <Route path="/pay-run" component={PayRunDashboard} />}
            <Route path="/claims" component={ClaimsDashboard} />
            <Route path="/loans" component={LoansDashboard} />
            {hasAccess(['VIEW_SALARY', 'MANAGE_SALARY'])       && <Route path="/settlements" component={SettlementsDashboard} />}
            {hasAccess(['MANAGE_SALARY', 'VIEW_HOSPITALITY', 'MANAGE_HOSPITALITY']) && (
              <Route path="/hospitality" component={HospitalityDashboard} />
            )}
            {hasAccess(['VIEW_SALARY', 'VIEW_REPORTS', 'MANAGE_SALARY']) && <Route path="/reports/payroll" component={PayrollCostReport} />}
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
