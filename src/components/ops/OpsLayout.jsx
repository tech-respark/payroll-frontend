import React, { useEffect, useState } from 'react';
import appStyles from '../../App.module.scss';
import OpsHeader from './OpsHeader';
import OpsNav from './OpsNav';

const MOBILE_BREAKPOINT = 1024;
const SIDEBAR_PREF_KEY = 'payroll.opsSidebarCollapsed';

const readDesktopSidebarPref = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_PREF_KEY) === 'true';
};

const OpsLayout = ({ children }) => {
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
    const onKey = (event) => {
      if (event.key === 'Escape') setIsSidebarCollapsed(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (!isMobile) {
        window.localStorage.setItem(SIDEBAR_PREF_KEY, String(next));
      }
      return next;
    });
  };
  const closeSidebar = () => {
    if (isMobile) setIsSidebarCollapsed(true);
  };

  return (
    <div className="app-layout">
      {isMobile && !isSidebarCollapsed && (
        <div className={appStyles.sidebarOverlay} onClick={closeSidebar} aria-hidden="true" />
      )}
      <OpsNav
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        onNavigate={closeSidebar}
      />
      <div className={`content-wrapper ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <OpsHeader onMenuClick={toggleSidebar} isMobile={isMobile} />
        <main className="main-content animate-fade-in">{children}</main>
      </div>
    </div>
  );
};

export default OpsLayout;
