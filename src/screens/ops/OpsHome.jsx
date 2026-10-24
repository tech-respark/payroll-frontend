import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { LuLayoutGrid, LuLayoutList } from 'react-icons/lu';
import { apiService } from '../../api/apiService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { parseLocalDate } from '../../helpers/dateUtils';
import { formatDisplayDate, prettyStatus } from '../../helpers/displayUtils';
import { Badge, Button, Card, CardBody } from '../../components/ui';
import styles from './opsShared.module.scss';

const VIEW_KEY = 'payroll.opsClientsView';
const FILTER_KEY = 'payroll.opsClientsFilters';

const statusVariant = (status) => {
  if (status === 'ACTIVE' || status === 'TRIAL') return 'success';
  if (status === 'DRAFT') return 'default';
  if (status === 'SUSPENDED') return 'warning';
  return 'danger';
};

const daysUntil = (value) => {
  const date = parseLocalDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
};

const matchesExpiry = (sub, expiry) => {
  if (!expiry) return true;
  const days = daysUntil(sub.endsOn);
  if (expiry === 'open') return !sub.endsOn;
  if (expiry === 'expired') return sub.status === 'EXPIRED' || (days != null && days < 0);
  if (expiry === '30') return days != null && days >= 0 && days <= 30;
  if (expiry === '90') return days != null && days >= 0 && days <= 90;
  return true;
};

const ownerLabel = (sub) => sub.salesOwnerName || sub.salesOwnerUsername || 'Unassigned';

const readFilters = () => {
  try {
    return JSON.parse(localStorage.getItem(FILTER_KEY) || '{}');
  } catch {
    return {};
  }
};

const usageLabel = (used, max) => (max ? `${used ?? 0} / ${max}` : String(used ?? 0));
const usageHot = (used, max) => max > 0 && (used ?? 0) / max >= 0.8;

const OpsHome = () => {
  const { showToast } = useToast();
  const { isSuperAdmin } = useAuth();
  const history = useHistory();
  const stored = readFilters();
  const [clients, setClients] = useState([]);
  const [owners, setOwners] = useState([]);
  const [environment, setEnvironment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'list');
  const [query, setQuery] = useState(stored.query || '');
  const [plan, setPlan] = useState(stored.plan || '');
  const [expiry, setExpiry] = useState(stored.expiry || '');
  const [ownerId, setOwnerId] = useState(stored.ownerId || '');
  const [status, setStatus] = useState(stored.status || '');
  const [productCode, setProductCode] = useState(stored.productCode || '');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    Promise.all([
      apiService.get('/ops/tenants'),
      apiService.get('/ops/sales-owners'),
      apiService.get('/ops/environment'),
      apiService.get('/ops/products'),
    ])
      .then(([tenantRes, ownerRes, envRes, productRes]) => {
        setClients(tenantRes.data || []);
        setOwners(ownerRes.data || []);
        setEnvironment(envRes.data || null);
        setProducts(productRes.data || []);
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ query, plan, expiry, ownerId, status, productCode }));
  }, [query, plan, expiry, ownerId, status, productCode]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clients.filter((client) => {
      const sub = client.subscription || {};
      if (plan && sub.planCode !== plan) return false;
      if (productCode && client.product?.code !== productCode) return false;
      if (status && sub.status !== status) return false;
      if (ownerId === 'unassigned' && sub.salesOwnerId) return false;
      if (ownerId && ownerId !== 'unassigned' && String(sub.salesOwnerId) !== ownerId) return false;
      if (!matchesExpiry(sub, expiry)) return false;
      if (!needle) return true;
      return [
        client.tenantName,
        client.applicationName,
        client.product?.code,
        client.product?.displayName,
        client.tenantId,
        sub.planCode,
        ownerLabel(sub),
      ].some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [clients, query, plan, expiry, ownerId, status, productCode]);

  const clearFilters = () => {
    setQuery('');
    setPlan('');
    setExpiry('');
    setOwnerId('');
    setStatus('');
    setProductCode('');
  };

  const hasFilters = query || plan || expiry || ownerId || status || productCode;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <p className={styles.lead}>
          {loading
            ? 'Loading clients…'
            : `${filtered.length} of ${clients.length} ${clients.length === 1 ? 'client' : 'clients'}${isSuperAdmin ? '' : ' in your book'}`}
          {environment && (
            <span className={styles.muted}>
              {' · '}RabbitMQ {environment.rabbitConfigured ? 'on' : 'off'} · Mail {environment.mailConfigured ? 'on' : 'off'}
            </span>
          )}
        </p>
        <div className={styles.toolbarActions}>
          <div className={styles.viewToggle} role="group" aria-label="View">
            <button
              type="button"
              className={view === 'list' ? styles.viewActive : styles.viewBtn}
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
            >
              <LuLayoutList size={16} aria-hidden />
              List
            </button>
            <button
              type="button"
              className={view === 'cards' ? styles.viewActive : styles.viewBtn}
              onClick={() => setView('cards')}
              aria-pressed={view === 'cards'}
            >
              <LuLayoutGrid size={16} aria-hidden />
              Cards
            </button>
          </div>
          <Button variant="primary" onClick={() => history.push('/ops/clients/new')}>
            Onboard client
          </Button>
        </div>
      </div>

      <form className={styles.filters} onSubmit={(event) => event.preventDefault()}>
        <label className={styles.selectGroup}>
          <span>Search</span>
          <input
            className={styles.control}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Client, product, or salesperson"
          />
        </label>
        <label className={styles.selectGroup}>
          <span>Product</span>
          <select className={styles.control} value={productCode} onChange={(event) => setProductCode(event.target.value)}>
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product.code} value={product.code}>{product.displayName}</option>
            ))}
          </select>
        </label>
        <label className={styles.selectGroup}>
          <span>Payroll plan</span>
          <select className={styles.control} value={plan} onChange={(event) => setPlan(event.target.value)}>
            <option value="">All types</option>
            <option value="STANDARD">Standard</option>
            <option value="HOSPITALITY">Hospitality</option>
          </select>
        </label>
        <label className={styles.selectGroup}>
          <span>Expiry</span>
          <select className={styles.control} value={expiry} onChange={(event) => setExpiry(event.target.value)}>
            <option value="">Any date</option>
            <option value="expired">Expired</option>
            <option value="30">Ends in 30 days</option>
            <option value="90">Ends in 90 days</option>
            <option value="open">No end date</option>
          </select>
        </label>
        {isSuperAdmin && (
        <label className={styles.selectGroup}>
          <span>Salesperson</span>
          <select className={styles.control} value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {owners.map((owner) => (
              <option key={owner.id} value={String(owner.id)}>{owner.displayName}</option>
            ))}
          </select>
        </label>
        )}
        <label className={styles.selectGroup}>
          <span>Status</span>
          <select className={styles.control} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </label>
        {hasFilters && (
          <div className={styles.filterActions}>
            <Button type="button" variant="text" onClick={clearFilters}>Clear</Button>
          </div>
        )}
      </form>

      {!loading && clients.length === 0 && (
        <div className="mp-empty">
          <p className="mp-empty-title">No clients yet</p>
          <p className="mp-empty-hint">Start the onboarding wizard to provision the first tenant.</p>
        </div>
      )}
      {!loading && clients.length > 0 && filtered.length === 0 && (
        <div className="mp-empty">
          <p className="mp-empty-title">No clients match</p>
          <p className="mp-empty-hint">Clear a filter or search to see the full list.</p>
        </div>
      )}

      {view === 'list' && filtered.length > 0 && (
        <Card>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Salesperson</th>
                  <th>Usage</th>
                  <th>Ends</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const sub = client.subscription || {};
                  const days = daysUntil(sub.endsOn);
                  return (
                    <tr
                      key={client.tenantId}
                      className={styles.clickRow}
                      onClick={() => history.push(`/ops/clients/${client.tenantId}`)}
                    >
                      <td>
                        <strong>{client.tenantName}</strong>
                        <div className={styles.muted}>Tenant {client.tenantId}</div>
                      </td>
                      <td>{client.product?.displayName || '—'}</td>
                      <td>{prettyStatus(sub.planCode)}</td>
                      <td><Badge variant={statusVariant(sub.status)}>{prettyStatus(sub.status || 'NONE')}</Badge></td>
                      <td>{ownerLabel(sub)}</td>
                      <td>
                        <div className={usageHot(client.storeCount, sub.maxStores) ? styles.warn : undefined}>
                          Stores {usageLabel(client.storeCount, sub.maxStores)}
                        </div>
                        <div className={usageHot(client.staffCount, sub.maxStaff) ? styles.warn : styles.muted}>
                          Staff {usageLabel(client.staffCount, sub.maxStaff)}
                        </div>
                      </td>
                      <td>
                        {sub.endsOn ? formatDisplayDate(sub.endsOn) : 'Open'}
                        {days != null && days >= 0 && days <= 30 && (
                          <div className={styles.muted}>{days} days left</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === 'cards' && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map((client) => {
            const sub = client.subscription || {};
            return (
              <Link key={client.tenantId} to={`/ops/clients/${client.tenantId}`} className={styles.clientCard}>
                <Card>
                  <CardBody>
                    <div className={styles.clientMeta}>
                      <Badge variant={statusVariant(sub.status)}>{prettyStatus(sub.status || 'NONE')}</Badge>
                      <h3 className={styles.clientName}>{client.tenantName}</h3>
                      <p className={styles.muted}>
                        {client.product?.displayName || 'No product'} · {prettyStatus(sub.planCode)} · {ownerLabel(sub)}
                      </p>
                      <p className={styles.muted}>
                        Tenant {client.tenantId} · stores {usageLabel(client.storeCount, sub.maxStores)} · staff {usageLabel(client.staffCount, sub.maxStaff)}
                      </p>
                      <p className={styles.muted}>
                        {sub.endsOn ? `Ends ${formatDisplayDate(sub.endsOn)}` : 'No end date'}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OpsHome;
