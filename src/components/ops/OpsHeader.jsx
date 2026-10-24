import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LuInfo, LuMenu } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { AccountDrawer } from '../shell/AccountDrawer';
import { resolvePageHelp } from '../shell/pageHelp';
import styles from '../TopHeader.module.scss';

const PAGE_META = [
  { match: (p) => p === '/ops' || p === '/ops/', title: 'Clients', crumbs: ['Ops', 'Clients'] },
  { match: (p) => p === '/ops/clients/new', title: 'New client', crumbs: ['Ops', 'Clients', 'New'] },
  { match: (p) => /^\/ops\/clients\/\d+$/.test(p), title: 'Client', crumbs: ['Ops', 'Clients', 'Detail'] },
  { match: (p) => p.startsWith('/ops/products'), title: 'Products', crumbs: ['Ops', 'Products'] },
  { match: (p) => p.startsWith('/ops/operators'), title: 'Operators', crumbs: ['Ops', 'Operators'] },
];

const formatName = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

function PageHelpTip({ text }) {
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!text) return null;

  return (
    <>
      <span className={styles.crumbSep} aria-hidden>•</span>
      <span ref={wrapRef} className={`${styles.helpWrap} ${open ? styles.helpOpen : ''}`}>
        <button
          type="button"
          className={styles.helpBtn}
          aria-label="About this page"
          aria-expanded={open}
          aria-describedby="ops-page-help-tip"
          onClick={() => setOpen((prev) => !prev)}
        >
          <LuInfo size={13} strokeWidth={2} aria-hidden />
        </button>
        <span id="ops-page-help-tip" role="tooltip" className={styles.helpTip}>
          {text}
        </span>
      </span>
    </>
  );
}

const OpsHeader = ({ onMenuClick, isMobile }) => {
  const location = useLocation();
  const { user, hasAccess } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const found = PAGE_META.find((item) => item.match(location.pathname));
  const meta = found || { title: 'Ops', crumbs: ['Ops'] };
  const pageHelp = resolvePageHelp(location.pathname, hasAccess);

  const displayName = formatName(user?.firstName || user?.username) || 'Operator';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      <header className={styles.topHeader}>
        <div className={styles.headerLeft}>
          {isMobile && (
            <button type="button" className={styles.menuBtn} onClick={onMenuClick} aria-label="Toggle menu">
              <LuMenu size={20} />
            </button>
          )}
          <div className={styles.titleBlock}>
            <h2 className={styles.pageTitle}>{meta.title}</h2>
            <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
              {meta.crumbs.map((crumb, index) => (
                <React.Fragment key={`${crumb}-${index}`}>
                  {index > 0 && <span className={styles.crumbSep}>•</span>}
                  <span className={index === meta.crumbs.length - 1 ? styles.crumbCurrent : styles.crumb}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
              <PageHelpTip text={pageHelp} />
            </nav>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => setAccountOpen(true)}
            aria-label="Open account menu"
            title={displayName}
          >
            <span className={styles.avatar}>{initials}</span>
          </button>
        </div>
      </header>
      <AccountDrawer open={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
};

export default OpsHeader;
