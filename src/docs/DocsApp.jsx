import React, { useEffect, useMemo, useState } from 'react';
import { Link, Redirect, useLocation, useParams } from 'react-router-dom';
import {
  LuBookOpen,
  LuCalendarDays,
  LuCalendarOff,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuCircleHelp,
  LuClipboardCheck,
  LuCopy,
  LuLink,
  LuMap,
  LuMenu,
  LuMoon,
  LuReceipt,
  LuRocket,
  LuSearch,
  LuSun,
  LuX,
} from 'react-icons/lu';
import { useTheme } from '../context/ThemeContext';
import { DOCS_NAV, HOME_CARDS, getAdjacentPages, getDocPage } from './catalog';
import { getPageContent } from './content';
import { extractToc } from './searchIndex';
import { docsPath } from './openDocs';
import { DocsMarkdown } from './DocsMarkdown';
import { DocsSearch } from './DocsSearch';
import styles from './DocsApp.module.scss';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const CARD_ICONS = {
  rocket: LuRocket,
  map: LuMap,
  calendar: LuClipboardCheck,
  leave: LuCalendarOff,
  payslip: LuReceipt,
  shifts: LuCalendarDays,
};

const cx = (...parts) => parts.filter(Boolean).join(' ');

const DocsHomeCards = () => (
  <div className={styles.cards}>
    {HOME_CARDS.map((card) => {
      const Icon = CARD_ICONS[card.icon] || LuBookOpen;
      return (
        <Link key={card.slug} to={docsPath(card.slug)} className={styles.card}>
          <span className={styles.cardIcon} aria-hidden>
            <Icon size={22} strokeWidth={1.6} />
          </span>
          <strong>{card.title}</strong>
          <p>{card.description}</p>
        </Link>
      );
    })}
  </div>
);

const DocsApp = () => {
  const { slug } = useParams();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [activeHeading, setActiveHeading] = useState('');
  const [copied, setCopied] = useState('');
  const [helpful, setHelpful] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('payroll.docsFeedback') || '{}');
    } catch {
      return {};
    }
  });

  const pageSlug = !slug || slug === 'introduction' ? 'introduction' : slug;
  const page = getDocPage(pageSlug);
  const markdown = page ? getPageContent(pageSlug) : '';
  const toc = useMemo(() => extractToc(markdown), [markdown]);
  const { prev, next } = getAdjacentPages(pageSlug);
  const isDark = theme === 'dark';

  useEffect(() => {
    document.title = page
      ? `${page.title} · Relfor Payroll Docs`
      : 'Documentation · Relfor Payroll';
    return () => {
      document.title = 'Relfor Payroll';
    };
  }, [page]);

  useEffect(() => {
    setNavOpen(false);
    setCopied('');
    if (location.hash) {
      const id = location.hash.replace('#', '');
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pageSlug, location.hash]);

  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA'].includes(e.target?.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((open) => !open);
        return;
      }
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (toc.length === 0) return undefined;
    const nodes = toc
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);
    if (nodes.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveHeading(visible.target.id);
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0.1, 0.5, 1] }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [toc, markdown]);

  const copyPage = async (mode) => {
    const value =
      mode === 'link'
        ? `${window.location.origin}${docsPath(pageSlug)}`
        : `# ${page?.title || ''}\n\n${markdown}`;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(mode);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      setCopied('');
    }
  };

  const saveHelpful = (value) => {
    const nextValue = { ...helpful, [pageSlug]: value };
    setHelpful(nextValue);
    localStorage.setItem('payroll.docsFeedback', JSON.stringify(nextValue));
  };

  if (slug === 'introduction') {
    return <Redirect to="/docs" />;
  }

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setNavOpen(true)}
            aria-label="Open documentation menu"
          >
            <LuMenu size={18} />
          </button>
          <Link to="/docs" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden>
              <LuBookOpen size={18} />
            </span>
            <span>
              Relfor Payroll
              <em>Documentation</em>
            </span>
          </Link>
        </div>
        <div className={styles.topbarRight}>
          <button
            type="button"
            className={styles.searchLaunch}
            onClick={() => setSearchOpen(true)}
          >
            <LuSearch size={16} aria-hidden />
            <span>Search…</span>
            <kbd>{isMac ? '⌘' : 'Ctrl'}K</kbd>
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <LuSun size={16} /> : <LuMoon size={16} />}
          </button>
          <a className={styles.appLink} href="/home" target="_blank" rel="noopener noreferrer">
            Open app
          </a>
        </div>
      </header>

      <div className={styles.shell}>
        {navOpen && (
          <button
            type="button"
            className={styles.navBackdrop}
            aria-label="Close documentation menu"
            onClick={() => setNavOpen(false)}
          />
        )}
        <aside className={cx(styles.sidebar, navOpen && styles.sidebarOpen)} aria-label="Documentation">
          <div className={styles.sidebarHead}>
            <span>Guides</span>
            <button type="button" className={styles.sidebarClose} onClick={() => setNavOpen(false)} aria-label="Close menu">
              <LuX size={16} />
            </button>
          </div>
          {DOCS_NAV.map((section) => (
            <div key={section.id} className={styles.navSection}>
              <p className={styles.navLabel}>{section.title}</p>
              <ul>
                {section.items.map((item) => {
                  const active = item.slug === pageSlug;
                  return (
                    <li key={item.slug}>
                      <Link
                        to={docsPath(item.slug === 'introduction' ? '' : item.slug)}
                        className={cx(styles.navLink, active && styles.navLinkActive)}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setNavOpen(false)}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        <main className={styles.main}>
          {!page ? (
            <article className={styles.article}>
              <p className={styles.eyebrow}>404</p>
              <h1 className={styles.title}>This page is not in the guide</h1>
              <p className={styles.lede}>
                The link may have changed. Search the help center or start from the introduction.
              </p>
              <Link to="/docs" className={styles.backHome}>Back to documentation</Link>
            </article>
          ) : (
            <article className={styles.article}>
              <nav className={styles.crumbs} aria-label="Breadcrumb">
                <Link to="/docs">Docs</Link>
                <span aria-hidden>•</span>
                <span>{page.sectionTitle}</span>
                <span aria-hidden>•</span>
                <span>{page.title}</span>
              </nav>
              <div className={styles.titleRow}>
                <div>
                  <h1 className={styles.title}>{page.title}</h1>
                  <p className={styles.lede}>{page.description}</p>
                </div>
                <div className={styles.pageActions}>
                  <button type="button" onClick={() => copyPage('markdown')}>
                    {copied === 'markdown' ? <LuCheck size={14} /> : <LuCopy size={14} />}
                    {copied === 'markdown' ? 'Copied' : 'Copy page'}
                  </button>
                  <button type="button" onClick={() => copyPage('link')}>
                    {copied === 'link' ? <LuCheck size={14} /> : <LuLink size={14} />}
                    {copied === 'link' ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </div>

              {pageSlug === 'introduction' && <DocsHomeCards />}
              <DocsMarkdown content={markdown} />

              <div className={styles.feedback}>
                <p>Was this page helpful?</p>
                <div className={styles.feedbackActions}>
                  <button
                    type="button"
                    className={styles.feedbackBtn}
                    data-active={helpful[pageSlug] === 'yes' ? 'true' : 'false'}
                    onClick={() => saveHelpful('yes')}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={styles.feedbackBtn}
                    data-active={helpful[pageSlug] === 'no' ? 'true' : 'false'}
                    onClick={() => saveHelpful('no')}
                  >
                    No
                  </button>
                </div>
              </div>

              <nav className={styles.pager} aria-label="Page">
                {prev ? (
                  <Link to={docsPath(prev.slug === 'introduction' ? '' : prev.slug)} className={styles.pagerLink}>
                    <LuChevronLeft size={16} />
                    <span>
                      <em>Previous</em>
                      {prev.title}
                    </span>
                  </Link>
                ) : <span />}
                {next ? (
                  <Link to={docsPath(next.slug === 'introduction' ? '' : next.slug)} className={cx(styles.pagerLink, styles.pagerNext)}>
                    <span>
                      <em>Next</em>
                      {next.title}
                    </span>
                    <LuChevronRight size={16} />
                  </Link>
                ) : <span />}
              </nav>
            </article>
          )}
        </main>

        <aside className={styles.toc} aria-label="On this page">
          <p>On this page</p>
          {toc.length === 0 ? (
            <span className={styles.tocEmpty}>No sections</span>
          ) : (
            <ul>
              {toc.map((item) => (
                <li key={item.id} data-depth={item.depth}>
                  <a
                    href={`#${item.id}`}
                    className={cx(activeHeading === item.id && styles.tocActive)}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      window.history.replaceState(null, '', `#${item.id}`);
                      setActiveHeading(item.id);
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.tocHelp}>
            <LuCircleHelp size={14} aria-hidden />
            Press <kbd>/</kbd> or <kbd>{isMac ? '⌘' : 'Ctrl'}K</kbd> to search.
          </div>
        </aside>
      </div>

      <DocsSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default DocsApp;
