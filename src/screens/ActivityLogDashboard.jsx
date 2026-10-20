import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { LuChevronDown, LuHistory, LuSearch } from 'react-icons/lu';
import { Badge, Button, Input } from '../components/ui';
import { formatActivitySummary } from '../helpers/displayUtils';
import { useActivityCatalog, useActivityLog } from '../hooks/queries/useActivityLog';
import styles from './ActivityLogDashboard.module.scss';

const PAGE_SIZES = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 20;
const FILTER_STORAGE_KEY = 'payroll.activityFilters';

const moduleVariant = (module) => {
  switch (module) {
    case 'LEAVE':
    case 'HOSPITALITY':
      return 'success';
    case 'ATTENDANCE':
    case 'PAYROLL':
      return 'info';
    case 'ROLES':
    case 'AUTH':
      return 'warning';
    case 'STAFF':
    case 'SHIFTS':
      return 'primary';
    default:
      return 'default';
  }
};

const formatWhen = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const contextEntries = (context) => {
  if (!context || typeof context !== 'object') return [];
  return Object.entries(context).filter(([, value]) => value !== null && value !== undefined && value !== '');
};

const titleCase = (value) => String(value || '')
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatContextKey = (key) => titleCase(key.replace(/([A-Z])/g, ' $1'));

const formatContextValue = (value) => {
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return text;
};

const formatIp = (ip) => {
  if (!ip) return '';
  if (ip === '::1' || ip === 'https://example.net/id/garnet' || ip === '0:0:0:0:0:0:0:1') {
    return '127.0.0.1';
  }
  return ip;
};

const formatRecord = (item) => {
  if (!item.resourceType) return '';
  if (item.resourceType === 'SESSION') return 'Sign-in';
  const label = titleCase(item.resourceType);
  return item.resourceId ? `${label} #${item.resourceId}` : label;
};

const readFilters = (search) => {
  const params = new URLSearchParams(search);
  const sizeRaw = Number(params.get('size'));
  const pageRaw = Number(params.get('page'));
  return {
    module: params.get('module') || '',
    action: params.get('action') || '',
    q: params.get('q') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 0,
    size: PAGE_SIZES.includes(sizeRaw) ? sizeRaw : DEFAULT_PAGE_SIZE,
  };
};

const toSearch = (filters) => {
  const params = new URLSearchParams();
  if (filters.module) params.set('module', filters.module);
  if (filters.action) params.set('action', filters.action);
  if (filters.q) params.set('q', filters.q);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.page > 0) params.set('page', String(filters.page));
  if (filters.size && filters.size !== DEFAULT_PAGE_SIZE) params.set('size', String(filters.size));
  const query = params.toString();
  return query ? `?${query}` : '';
};

const readStoredFilters = () => {
  try {
    const raw = sessionStorage.getItem(FILTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const storeFilters = (filters) => {
  try {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      module: filters.module || '',
      action: filters.action || '',
      q: filters.q || '',
      from: filters.from || '',
      to: filters.to || '',
      page: filters.page || 0,
      size: filters.size || DEFAULT_PAGE_SIZE,
    }));
  } catch {
    // Ignore private-mode quota errors.
  }
};

export default function ActivityLogDashboard() {
  const history = useHistory();
  const location = useLocation();
  const filters = useMemo(() => readFilters(location.search), [location.search]);
  const { module, action, q, from, to, page, size: pageSize } = filters;
  const [qInput, setQInput] = useState(filters.q);
  const [openId, setOpenId] = useState(null);

  const writeFilters = (patch) => {
    const current = readFilters(history.location.search);
    const next = { ...current, ...patch };
    storeFilters(next);
    const search = toSearch(next);
    if (search === (history.location.search || '')) return;
    history.replace({ pathname: history.location.pathname, search });
  };

  useEffect(() => {
    if (location.search) {
      storeFilters(filters);
      return;
    }
    const stored = readStoredFilters();
    if (!stored) return;
    const search = toSearch({ ...readFilters(''), ...stored });
    if (search) history.replace({ pathname: location.pathname, search });
  }, []);

  useEffect(() => {
    setQInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (qInput === filters.q) return;
      writeFilters({ q: qInput, page: 0 });
    }, 300);
    return () => clearTimeout(timer);
  }, [qInput]);

  const { data: catalog } = useActivityCatalog();
  const { data, isLoading, isFetching } = useActivityLog({
    module,
    action,
    q,
    from,
    to,
    page,
    size: pageSize,
  });

  const items = data?.items || [];
  const total = Number(data?.total || 0);
  const currentPage = Number(data?.page ?? page);
  const currentSize = Number(data?.size ?? pageSize);
  const pageCount = total === 0
    ? 0
    : (Number(data?.totalPages) || Math.ceil(total / currentSize) || 1);
  const fromRow = total === 0 ? 0 : currentPage * currentSize + 1;
  const toRow = Math.min((currentPage + 1) * currentSize, total);

  useEffect(() => {
    if (!data || total === 0) return;
    const lastPage = Math.max(0, pageCount - 1);
    if (page > lastPage) writeFilters({ page: lastPage });
  }, [data, page, pageCount, total]);

  const actions = useMemo(() => {
    const all = catalog?.actions || [];
    return module ? all.filter((row) => row.module === module) : all;
  }, [catalog, module]);

  const resetFilters = () => {
    setQInput('');
    writeFilters({
      module: '',
      action: '',
      q: '',
      from: '',
      to: '',
      page: 0,
      size: pageSize,
    });
  };

  return (
    <div className={styles.page}>
      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault();
          writeFilters({ q: qInput, page: 0 });
        }}
      >
        <label className={styles.selectGroup}>
          <span>Module</span>
          <select
            value={module}
            onChange={(event) => {
              writeFilters({ module: event.target.value, action: '', page: 0 });
            }}
          >
            <option value="">All modules</option>
            {(catalog?.modules || []).map((row) => (
              <option key={row.id} value={row.id}>{row.label}</option>
            ))}
          </select>
        </label>
        <label className={styles.selectGroup}>
          <span>Action</span>
          <select
            value={action}
            onChange={(event) => {
              writeFilters({ action: event.target.value, page: 0 });
            }}
          >
            <option value="">All actions</option>
            {actions.map((row) => (
              <option key={row.id} value={row.id}>{row.label}</option>
            ))}
          </select>
        </label>
        <Input
          id="activity-from"
          label="From"
          type="date"
          value={from}
          onChange={(event) => {
            writeFilters({ from: event.target.value, page: 0 });
          }}
        />
        <Input
          id="activity-to"
          label="To"
          type="date"
          value={to}
          onChange={(event) => {
            writeFilters({ to: event.target.value, page: 0 });
          }}
        />
        <Input
          id="activity-search"
          label="Search"
          type="search"
          placeholder="Person, username, or summary"
          containerClassName={styles.searchField}
          value={qInput}
          onChange={(event) => setQInput(event.target.value)}
        />
        <div className={styles.filterActions}>
          <Button type="submit" variant="soft">
            <LuSearch size={16} aria-hidden />
            Search
          </Button>
          <Button type="button" variant="text" onClick={resetFilters}>Clear</Button>
        </div>
      </form>

      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          <h2>
            <LuHistory size={18} aria-hidden />
            {isLoading ? 'Loading activity' : `${total} ${total === 1 ? 'event' : 'events'}`}
          </h2>
          {isFetching && !isLoading && <span className={styles.muted}>Refreshing</span>}
        </div>

        {isLoading ? (
          <p className={styles.empty}>Loading the activity log…</p>
        ) : items.length === 0 ? (
          <p className={styles.empty}>
            No activity matches these filters. Approvals, role changes, roster edits, and payroll runs appear here as they happen.
          </p>
        ) : (
          <ol className={styles.timeline}>
            {items.map((item) => {
              const open = openId === item.id;
              const details = contextEntries(item.context);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.row}
                    onClick={() => setOpenId(open ? null : item.id)}
                    aria-expanded={open}
                  >
                    <span className={styles.when}>{formatWhen(item.occurredAt)}</span>
                    <span className={styles.body}>
                      <span className={styles.summary}>{formatActivitySummary(item.summary)}</span>
                      <span className={styles.meta}>
                        {item.actorDisplayName || 'System'}
                        {item.resourceLabel && item.resourceLabel !== item.actorDisplayName
                          ? ` · ${formatActivitySummary(item.resourceLabel)}`
                          : ''}
                      </span>
                    </span>
                    <Badge variant={item.outcome === 'FAILURE' || item.outcome === 'DENIED' ? 'danger' : moduleVariant(item.module)}>
                      {item.outcome === 'FAILURE' || item.outcome === 'DENIED'
                        ? 'Failed'
                        : (item.moduleLabel || item.module)}
                    </Badge>
                    <LuChevronDown className={open ? styles.chevronOpen : styles.chevron} size={16} aria-hidden />
                  </button>
                  {open && (
                    <dl className={styles.details}>
                      <div><dt>Action</dt><dd>{item.actionLabel || item.action}</dd></div>
                      {item.actorUsername && <div><dt>Username</dt><dd>{item.actorUsername}</dd></div>}
                      {item.resourceType && <div><dt>Record</dt><dd>{formatRecord(item)}</dd></div>}
                      {item.ipAddress && <div><dt>IP</dt><dd>{formatIp(item.ipAddress)}</dd></div>}
                      {details.map(([key, value]) => (
                        <div key={key}><dt>{formatContextKey(key)}</dt><dd>{formatContextValue(value)}</dd></div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {!isLoading && (
          <div className={styles.pager}>
            <span className={styles.pagerInfo}>
              {total === 0 ? 'No events' : `Showing ${fromRow}–${toRow} of ${total}`}
            </span>
            <label className={styles.pageSize}>
              <span>Per page</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  writeFilters({ size: Number(event.target.value), page: 0 });
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <div className={styles.pagerBtns}>
              <Button
                variant="outline"
                disabled={page <= 0 || total === 0}
                onClick={() => writeFilters({ page: Math.max(0, page - 1) })}
              >
                Previous
              </Button>
              <span className={styles.muted}>
                Page {total === 0 ? 0 : page + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                disabled={total === 0 || page + 1 >= pageCount}
                onClick={() => writeFilters({ page: page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
