import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../../api/apiService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { formatDisplayDate, formatSlot, prettyStatus, staffName } from '../../helpers/displayUtils';
import { Badge, Button, Card, CardBody, CardHeader, Drawer, Input, Switch } from '../../components/ui';
import styles from './opsShared.module.scss';

const READY_LABELS = {
  tenant: 'Company',
  store: 'Store',
  subscription: 'License',
  adminUser: 'Client admin',
  salaryDefinitions: 'Salary pack',
  leavePack: 'Leave pack',
  storeProfile: 'Store profile',
  letterhead: 'Letterhead',
  holidays: 'Holiday pack',
  lockDate: 'Payroll lock date',
  attendanceSource: 'Attendance source',
  canClientLogin: 'Client login allowed',
  firstAdminSignedIn: 'First admin signed in',
};

const emptySalary = {
  id: null,
  componentName: '',
  componentNameAlias: '',
  componentType: 'FIXED',
  componentCategory: 'EARNING',
  priorityIndex: 10,
  computable: false,
  includeInTotal: true,
  isCalculatedMonthly: false,
  formula: '',
  conditionExpression: '',
};

const emptyStore = {
  storeId: null,
  storeName: '',
  timeZone: 'Asia/Kolkata',
  storeOpenTime: '09:00',
  storeCloseTime: '18:00',
  financialYearStartMonth: 4,
  currencySymbol: '₹',
  payrollLockedUpToDate: '',
  companyName: '',
  address: '',
  gstNo: '',
  workingDaysPerMonth: 30,
  workingHoursPerDay: 9.5,
};

const statusVariant = (status) => {
  if (status === 'ACTIVE' || status === 'TRIAL') return 'success';
  if (status === 'DRAFT') return 'default';
  if (status === 'SUSPENDED') return 'warning';
  return 'danger';
};

const usageLabel = (used, max) => (max ? `${used ?? 0} / ${max}` : String(used ?? 0));
const usageHot = (used, max) => max > 0 && (used ?? 0) / max >= 0.8;

const OpsClientDetail = () => {
  const { tenantId } = useParams();
  const { showToast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [owners, setOwners] = useState([]);
  const [clients, setClients] = useState([]);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [cloneId, setCloneId] = useState('');
  const [preview, setPreview] = useState('');
  const [salaryForm, setSalaryForm] = useState(emptySalary);
  const [storeForm, setStoreForm] = useState(emptyStore);
  const [licenseForm, setLicenseForm] = useState({});
  const [adminForm, setAdminForm] = useState({ storeId: '', username: '', password: '', firstName: 'Admin', email: '' });
  const [integrationForm, setIntegrationForm] = useState({});
  const [resetPasswords, setResetPasswords] = useState({});

  const load = () => {
    Promise.all([
      apiService.get(`/ops/tenants/${tenantId}`),
      apiService.get('/ops/sales-owners'),
      apiService.get('/ops/tenants'),
      apiService.get('/ops/products'),
    ])
      .then(([tenantRes, ownerRes, clientRes, productRes]) => {
        setLoadError('');
        setDetail(tenantRes.data);
        setOwners(ownerRes.data || []);
        setClients((clientRes.data || []).filter((item) => String(item.tenantId) !== String(tenantId)));
        const assigned = tenantRes.data?.product;
        const rows = productRes.data || [];
        setProducts(assigned && !rows.some((item) => String(item.id) === String(assigned.id))
          ? [assigned, ...rows]
          : rows);
        setProductId(assigned?.id || '');
      })
      .catch((err) => {
        setDetail(null);
        setLoadError(err.message || 'This client is not available.');
        showToast(err.message, 'error');
      });
  };

  useEffect(load, [tenantId, showToast]);

  if (loadError && !detail) return <p className={styles.muted}>{loadError}</p>;
  if (!detail) return <p className={styles.muted}>Loading client…</p>;

  const sub = detail.subscription || {};
  const ready = detail.readiness || {};
  const health = detail.health || {};
  const integrations = detail.integrations || {};

  const saveProduct = async (event) => {
    event.preventDefault();
    try {
      await apiService.put(`/ops/tenants/${tenantId}`, { productId: productId ? Number(productId) : null });
      showToast('Source product saved.', 'success');
      setProductOpen(false);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const saveLicense = async (patch) => {
    try {
      await apiService.put(`/ops/tenants/${tenantId}/subscription`, patch);
      showToast('License saved.', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const applyPack = async (path) => {
    try {
      await apiService.post(path);
      showToast('Applied.', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const saveSalary = async (e) => {
    e.preventDefault();
    try {
      await apiService.post(`/ops/tenants/${tenantId}/salary-definitions`, {
        ...salaryForm,
        storeId: 0,
        computable: salaryForm.componentType === 'FORMULA' || salaryForm.computable,
        rules: salaryForm.formula
          ? [{ conditionExpression: salaryForm.conditionExpression, formula: salaryForm.formula }]
          : [],
      });
      setSalaryOpen(false);
      setPreview('');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const previewSalary = async () => {
    try {
      const result = await apiService.post(`/ops/tenants/${tenantId}/salary-preview`, {
        formula: salaryForm.formula,
        inputs: { basic: 30000, special_allowance: 10000, totalPenaltyAbsentDays: 1, workingHours: 9.5 },
      });
      setPreview(String(result.data?.result ?? result.data));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const deleteSalary = async (definitionId) => {
    try {
      await apiService.delete(`/ops/tenants/${tenantId}/salary-definitions/${definitionId}`);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const saveStore = async (e) => {
    e.preventDefault();
    try {
      if (storeForm.storeId) {
        await apiService.put(`/ops/tenants/${tenantId}/stores/${storeForm.storeId}`, storeForm);
      } else {
        await apiService.post(`/ops/tenants/${tenantId}/stores`, storeForm);
      }
      setStoreOpen(false);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const saveAdmin = async (e) => {
    e.preventDefault();
    try {
      const result = await apiService.post(`/ops/tenants/${tenantId}/admin`, adminForm);
      showToast(`Admin created. Temporary password: ${result.data?.temporaryPassword || adminForm.password}`, 'success');
      setAdminOpen(false);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const saveIntegrations = async (e) => {
    e.preventDefault();
    try {
      await apiService.put(`/ops/tenants/${tenantId}/integrations`, {
        ...integrationForm,
        createAttendanceScheduler: Boolean(integrationForm.biometricVendorName),
      });
      if (sub.planCode === 'HOSPITALITY') {
        await apiService.post(`/ops/tenants/${tenantId}/statutory`);
      }
      showToast('Integrations saved.', 'success');
      setIntegrationsOpen(false);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const cloneFrom = async () => {
    if (!cloneId) return;
    try {
      await apiService.post(`/ops/tenants/${tenantId}/clone-from/${cloneId}`);
      showToast('Packs copied.', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openSupport = async (admin) => {
    try {
      const result = await apiService.post(
        `/ops/tenants/${tenantId}/stores/${admin.storeId}/support-session?staffId=${admin.id}`
      );
      const path = result.data?.launchPath;
      if (path) {
        window.open(path, '_blank', 'noopener');
        showToast(`Support session opened for ${result.data.username}.`, 'success');
      }
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const revokeSupport = async (sessionId) => {
    try {
      await apiService.post(`/ops/tenants/${tenantId}/support-sessions/${sessionId}/revoke`);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const resetPassword = async (admin) => {
    const password = resetPasswords[admin.id];
    if (!password || password.length < 8) {
      showToast('Enter an 8-character temporary password.', 'error');
      return;
    }
    try {
      const result = await apiService.post(`/ops/tenants/${tenantId}/admins/${admin.id}/reset-password`, { password });
      showToast(`Password reset. Shown once: ${result.data?.temporaryPassword || password}`, 'success');
      setResetPasswords((prev) => ({ ...prev, [admin.id]: '' }));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleAdmin = async (admin) => {
    try {
      await apiService.put(`/ops/tenants/${tenantId}/admins/${admin.id}`, { active: !admin.active });
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.sectionTitle}>{detail.tenantName}</h2>
          <p className={styles.muted}>
            Tenant {detail.tenantId} · {detail.product?.displayName || 'No product'} · {prettyStatus(sub.planCode)} · {prettyStatus(sub.status)}
          </p>
        </div>
        <Badge variant={statusVariant(sub.status)}>{prettyStatus(sub.status)}</Badge>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader><span className={styles.sectionTitle}>Readiness</span></CardHeader>
          <CardBody>
            <ul className={styles.readinessList}>
              {Object.entries(ready).map(([key, value]) => (
                <li key={key} className={styles.readinessRow}>
                  <span>{READY_LABELS[key] || key}</span>
                  <Badge variant={value ? 'success' : 'warning'}>{value ? 'Yes' : 'No'}</Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <span className={styles.sectionTitle}>License</span>
            <Button variant="outline" onClick={() => {
              setLicenseForm({
                status: sub.storedStatus || sub.status || 'TRIAL',
                planCode: sub.planCode || 'STANDARD',
                startsOn: sub.startsOn || '',
                endsOn: sub.endsOn || '',
                maxStores: sub.maxStores ?? '',
                maxStaff: sub.maxStaff ?? '',
                notes: sub.notes || '',
                moduleSalary: sub.moduleSalary !== false,
                moduleLeave: sub.moduleLeave !== false,
                moduleShifts: sub.moduleShifts !== false,
                moduleReports: sub.moduleReports !== false,
                moduleHospitality: Boolean(sub.moduleHospitality),
                moduleBiometric: Boolean(sub.moduleBiometric),
                moduleStaffSync: Boolean(sub.moduleStaffSync),
                salesOwnerId: sub.salesOwnerId || '',
              });
              setLicenseOpen(true);
            }}
            >
              Edit license
            </Button>
          </CardHeader>
          <CardBody>
            <p className={styles.muted}>
              {formatDisplayDate(sub.startsOn)} to {sub.endsOn ? formatDisplayDate(sub.endsOn) : 'open'}
            </p>
            <p className={usageHot(detail.storeCount, sub.maxStores) ? styles.warn : styles.note}>
              Stores {usageLabel(detail.storeCount, sub.maxStores)}
            </p>
            <p className={usageHot(detail.staffCount, sub.maxStaff) ? styles.warn : styles.note}>
              Staff {usageLabel(detail.staffCount, sub.maxStaff)}
            </p>
            <p className={styles.muted}>
              Salesperson: {sub.salesOwnerName || sub.salesOwnerUsername || 'Unassigned'}
            </p>
            {sub.notes && <p className={styles.muted}>{sub.notes}</p>}
            <div className={styles.actions}>
              <Button variant="outline" onClick={() => saveLicense({ status: 'ACTIVE' })}>Activate</Button>
              {isSuperAdmin && (
                <>
                  <Button variant="outline" onClick={() => saveLicense({ status: 'SUSPENDED' })}>Suspend</Button>
                  <Button variant="outline" onClick={() => saveLicense({ status: 'EXPIRED' })}>Expire</Button>
                </>
              )}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <span className={styles.sectionTitle}>Source product</span>
            <Button variant="outline" onClick={() => {
              setProductId(detail.product?.id || '');
              setProductOpen(true);
            }}
            >
              Change
            </Button>
          </CardHeader>
          <CardBody>
            <p className={styles.note}>{detail.product?.displayName || 'Not assigned'}</p>
            <p className={styles.muted}>
              {[detail.product?.category, detail.product?.origin].filter(Boolean).map(prettyStatus).join(' · ') || 'Catalog product'}
              {detail.product?.standalone === false
                ? '. Connector mode is reserved. Payroll still runs standalone.'
                : '. Payroll is standalone. No live sync yet.'}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><span className={styles.sectionTitle}>Health</span></CardHeader>
          <CardBody>
            <p className={styles.muted}>RabbitMQ: {health.rabbitConfigured ? 'configured' : 'not set'}</p>
            <p className={styles.muted}>Mail: {health.mailConfigured ? 'configured' : 'not set'}</p>
            <p className={styles.muted}>Vendor: {health.biometricVendorName || 'none'}</p>
            <p className={styles.muted}>
              Last attendance job: {health.lastAttendanceReminderAt
                ? `${health.lastAttendanceReminderAt}${health.lastAttendanceReminderProcessed ? ' · processed' : ' · pending'}`
                : 'none'}
            </p>
            <p className={styles.muted}>Holidays: {health.holidayCount || 0}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><span className={styles.sectionTitle}>License history</span></CardHeader>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>When</th><th>Who</th><th>Change</th><th>Ends</th></tr>
            </thead>
            <tbody>
              {(detail.subscriptionHistory || []).map((event) => (
                <tr key={event.id}>
                  <td>{event.createdAt ? event.createdAt.replace('T', ' ').slice(0, 16) : '—'}</td>
                  <td>{event.actorUsername || '—'}</td>
                  <td>{prettyStatus(event.oldStatus)} → {prettyStatus(event.newStatus)}</td>
                  <td>{event.newEndsOn ? formatDisplayDate(event.newEndsOn) : 'open'}</td>
                </tr>
              ))}
              {(!detail.subscriptionHistory || detail.subscriptionHistory.length === 0) && (
                <tr><td colSpan={4} className={styles.muted}>No license changes yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader><span className={styles.sectionTitle}>Packs</span></CardHeader>
        <CardBody>
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => applyPack(`/ops/tenants/${tenantId}/salary-pack`)}>Salary pack</Button>
            <Button variant="outline" onClick={() => applyPack(`/ops/tenants/${tenantId}/leave-pack`)}>Leave pack</Button>
            <Button variant="outline" onClick={() => applyPack(`/ops/tenants/${tenantId}/holiday-pack`)}>Holiday pack</Button>
            <Button variant="outline" onClick={() => applyPack(`/ops/tenants/${tenantId}/default-shift`)}>Default shift</Button>
          </div>
          <div className={styles.inlineFields}>
            <label className={styles.field}>
              <span>Clone from another client</span>
              <select className={styles.control} value={cloneId} onChange={(e) => setCloneId(e.target.value)}>
                <option value="">Select a source</option>
                {clients.map((client) => (
                  <option key={client.tenantId} value={client.tenantId}>{client.tenantName}</option>
                ))}
              </select>
            </label>
            <Button variant="outline" disabled={!cloneId} onClick={cloneFrom}>Copy packs</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className={styles.sectionTitle}>Stores and letterhead</span>
          <Button variant="outline" onClick={() => { setStoreForm({ ...emptyStore, companyName: detail.tenantName }); setStoreOpen(true); }}>Add store</Button>
        </CardHeader>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Hours</th><th>Letterhead</th><th>Lock</th><th></th></tr>
            </thead>
            <tbody>
              {(detail.stores || []).map((store) => (
                <tr key={store.storeId}>
                  <td>{store.storeId}</td>
                  <td>{store.storeName}</td>
                  <td>{formatSlot(`${store.storeOpenTime}-${store.storeCloseTime}`)}</td>
                  <td>{store.companyName || '—'}{store.address ? ` · ${store.address}` : ''}</td>
                  <td>{store.payrollLockedUpToDate ? formatDisplayDate(store.payrollLockedUpToDate) : '—'}</td>
                  <td>
                    <Button variant="outline" onClick={() => {
                      setStoreForm({
                        ...emptyStore,
                        ...store,
                        payrollLockedUpToDate: store.payrollLockedUpToDate || '',
                      });
                      setStoreOpen(true);
                    }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <span className={styles.sectionTitle}>Integrations</span>
          <Button variant="outline" onClick={() => { setIntegrationForm(integrations); setIntegrationsOpen(true); }}>Edit</Button>
        </CardHeader>
        <CardBody>
          <p className={styles.muted}>Vendor: {integrations.biometricVendorName || 'none'}</p>
          <p className={styles.muted}>Vendor URL: {integrations.vendorUrl || '—'}</p>
          <p className={styles.muted}>Staff sync: {integrations.externalSoftwareUrl || '—'}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className={styles.sectionTitle}>Client users</span>
          <Button variant="outline" onClick={() => {
            setAdminForm({
              storeId: detail.stores?.[0]?.storeId || '',
              username: '',
              password: '',
              firstName: 'Admin',
              email: '',
            });
            setAdminOpen(true);
          }}
          >
            Add admin
          </Button>
        </CardHeader>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Store</th>
                <th>Status</th>
                <th>Signed in</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(detail.admins || []).map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.username}</td>
                  <td>{staffName(admin)}</td>
                  <td>{admin.storeId}</td>
                  <td>
                    <Badge variant={admin.active ? 'success' : 'default'}>
                      {admin.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>{admin.lastLoginAt ? admin.lastLoginAt.replace('T', ' ').slice(0, 16) : 'Never'}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <input
                        className={styles.control}
                        type="password"
                        placeholder="Temp password"
                        value={resetPasswords[admin.id] || ''}
                        onChange={(e) => setResetPasswords((prev) => ({ ...prev, [admin.id]: e.target.value }))}
                      />
                      <Button variant="outline" onClick={() => resetPassword(admin)}>Reset</Button>
                      <Button variant="outline" onClick={() => toggleAdmin(admin)}>
                        {admin.active ? 'Deactivate' : 'Activate'}
                      </Button>
                      {isSuperAdmin && admin.active && (
                        <Button variant="outline" onClick={() => openSupport(admin)}>Open support</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isSuperAdmin && (detail.supportSessions || []).some((session) => session.active && !session.revoked) && (
          <CardBody>
            <p className={styles.note}>Active support sessions</p>
            {(detail.supportSessions || []).filter((session) => session.active && !session.revoked).map((session) => (
              <div key={session.id} className={styles.rowActions}>
                <span className={styles.muted}>{session.username} · ends {session.expiresAt}</span>
                <Button variant="outline" onClick={() => revokeSupport(session.id)}>Revoke</Button>
              </div>
            ))}
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader>
          <span className={styles.sectionTitle}>Salary definitions</span>
          {isSuperAdmin && (
            <Button variant="primary" onClick={() => { setSalaryForm(emptySalary); setPreview(''); setSalaryOpen(true); }}>
              Add definition
            </Button>
          )}
        </CardHeader>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Name</th><th>Alias</th><th>Type</th><th>Formula</th>{isSuperAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {(detail.salaryDefinitions || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.componentName}</td>
                  <td>{item.componentNameAlias}</td>
                  <td>{prettyStatus(item.componentType)}</td>
                  <td>{item.rules?.[0]?.formula || '—'}</td>
                  {isSuperAdmin && (
                    <td>
                      <div className={styles.rowActions}>
                        <Button variant="outline" onClick={() => {
                          setSalaryForm({
                            ...emptySalary,
                            ...item,
                            formula: item.rules?.[0]?.formula || '',
                            conditionExpression: item.rules?.[0]?.conditionExpression || '',
                          });
                          setPreview('');
                          setSalaryOpen(true);
                        }}
                        >
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => deleteSalary(item.id)}>Delete</Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer open={licenseOpen} onClose={() => setLicenseOpen(false)} title="License">
        <form className={styles.form} onSubmit={(e) => {
          e.preventDefault();
          saveLicense({
            ...licenseForm,
            maxStores: licenseForm.maxStores === '' ? null : Number(licenseForm.maxStores),
            maxStaff: licenseForm.maxStaff === '' ? null : Number(licenseForm.maxStaff),
            salesOwnerId: isSuperAdmin
              ? (licenseForm.salesOwnerId ? Number(licenseForm.salesOwnerId) : null)
              : undefined,
          }).then(() => setLicenseOpen(false));
        }}
        >
          <div className={styles.field}>
            <label htmlFor="license-status">Status</label>
            <select id="license-status" className={styles.control} value={licenseForm.status || ''} onChange={(e) => setLicenseForm({ ...licenseForm, status: e.target.value })}>
              <option value="DRAFT">Draft</option>
              <option value="TRIAL">Trial</option>
              <option value="ACTIVE">Active</option>
              {isSuperAdmin && <option value="SUSPENDED">Suspended</option>}
              {isSuperAdmin && <option value="EXPIRED">Expired</option>}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="license-plan">Plan</label>
            <select id="license-plan" className={styles.control} value={licenseForm.planCode || ''} onChange={(e) => setLicenseForm({ ...licenseForm, planCode: e.target.value })}>
              <option value="STANDARD">Standard</option>
              <option value="HOSPITALITY">Hospitality</option>
            </select>
          </div>
          <Input label="Starts" type="date" value={licenseForm.startsOn || ''} onChange={(e) => setLicenseForm({ ...licenseForm, startsOn: e.target.value })} />
          <Input label="Ends" type="date" value={licenseForm.endsOn || ''} onChange={(e) => setLicenseForm({ ...licenseForm, endsOn: e.target.value })} />
          <Input label="Max stores" type="number" value={licenseForm.maxStores ?? ''} onChange={(e) => setLicenseForm({ ...licenseForm, maxStores: e.target.value })} />
          <Input label="Max staff" type="number" value={licenseForm.maxStaff ?? ''} onChange={(e) => setLicenseForm({ ...licenseForm, maxStaff: e.target.value })} />
          {isSuperAdmin && (
            <div className={styles.field}>
              <label htmlFor="license-owner">Salesperson</label>
              <select id="license-owner" className={styles.control} value={licenseForm.salesOwnerId || ''} onChange={(e) => setLicenseForm({ ...licenseForm, salesOwnerId: e.target.value })}>
                <option value="">Unassigned</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>{owner.displayName}</option>
                ))}
              </select>
            </div>
          )}
          <div className={styles.fieldWide}>
            <label htmlFor="license-notes">Notes</label>
            <textarea id="license-notes" className={styles.control} rows={3} value={licenseForm.notes || ''} onChange={(e) => setLicenseForm({ ...licenseForm, notes: e.target.value })} />
          </div>
          <Switch row label="Salary" checked={Boolean(licenseForm.moduleSalary)} onChange={(e) => setLicenseForm({ ...licenseForm, moduleSalary: e.target.checked })} />
          <Switch row label="Leave" checked={Boolean(licenseForm.moduleLeave)} onChange={(e) => setLicenseForm({ ...licenseForm, moduleLeave: e.target.checked })} />
          <Switch row label="Shifts" checked={Boolean(licenseForm.moduleShifts)} onChange={(e) => setLicenseForm({ ...licenseForm, moduleShifts: e.target.checked })} />
          <Switch row label="Reports" checked={Boolean(licenseForm.moduleReports)} onChange={(e) => setLicenseForm({ ...licenseForm, moduleReports: e.target.checked })} />
          <Switch row label="Hospitality" checked={Boolean(licenseForm.moduleHospitality)} onChange={(e) => setLicenseForm({ ...licenseForm, moduleHospitality: e.target.checked })} />
          <Switch row label="Biometric" checked={Boolean(licenseForm.moduleBiometric)} onChange={(e) => setLicenseForm({ ...licenseForm, moduleBiometric: e.target.checked })} />
          <Switch row label="Staff sync" checked={Boolean(licenseForm.moduleStaffSync)} onChange={(e) => setLicenseForm({ ...licenseForm, moduleStaffSync: e.target.checked })} />
          <div className={styles.actions}>
            <Button type="submit" variant="primary">Save license</Button>
          </div>
        </form>
      </Drawer>

      <Drawer open={storeOpen} onClose={() => setStoreOpen(false)} title={storeForm.storeId ? 'Edit store' : 'Add store'}>
        <form className={styles.form} onSubmit={saveStore}>
          <Input label="Store name" value={storeForm.storeName} onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })} />
          <Input label="Timezone" value={storeForm.timeZone} onChange={(e) => setStoreForm({ ...storeForm, timeZone: e.target.value })} />
          <Input label="Open" value={storeForm.storeOpenTime} onChange={(e) => setStoreForm({ ...storeForm, storeOpenTime: e.target.value })} />
          <Input label="Close" value={storeForm.storeCloseTime} onChange={(e) => setStoreForm({ ...storeForm, storeCloseTime: e.target.value })} />
          <Input label="FY start month" type="number" value={storeForm.financialYearStartMonth} onChange={(e) => setStoreForm({ ...storeForm, financialYearStartMonth: Number(e.target.value) })} />
          <Input label="Currency" value={storeForm.currencySymbol} onChange={(e) => setStoreForm({ ...storeForm, currencySymbol: e.target.value })} />
          <Input label="Payroll locked through" type="date" value={storeForm.payrollLockedUpToDate || ''} onChange={(e) => setStoreForm({ ...storeForm, payrollLockedUpToDate: e.target.value })} />
          <Input label="Company name" value={storeForm.companyName || ''} onChange={(e) => setStoreForm({ ...storeForm, companyName: e.target.value })} />
          <div className={styles.fieldWide}>
            <label htmlFor="store-address">Address</label>
            <textarea id="store-address" className={styles.control} rows={3} value={storeForm.address || ''} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} />
          </div>
          <Input label="GST" value={storeForm.gstNo || ''} onChange={(e) => setStoreForm({ ...storeForm, gstNo: e.target.value })} />
          <Input label="Working days / month" type="number" value={storeForm.workingDaysPerMonth ?? 30} onChange={(e) => setStoreForm({ ...storeForm, workingDaysPerMonth: Number(e.target.value) })} />
          <Input label="Working hours / day" type="number" value={storeForm.workingHoursPerDay ?? 9.5} onChange={(e) => setStoreForm({ ...storeForm, workingHoursPerDay: Number(e.target.value) })} />
          <div className={styles.actions}>
            <Button type="submit" variant="primary">Save store</Button>
          </div>
        </form>
      </Drawer>

      <Drawer open={adminOpen} onClose={() => setAdminOpen(false)} title="Add client admin">
        <form className={styles.form} onSubmit={saveAdmin}>
          <div className={styles.field}>
            <label htmlFor="admin-store">Store</label>
            <select id="admin-store" className={styles.control} value={adminForm.storeId} onChange={(e) => setAdminForm({ ...adminForm, storeId: Number(e.target.value) })}>
              {(detail.stores || []).map((store) => (
                <option key={store.storeId} value={store.storeId}>{store.storeName}</option>
              ))}
            </select>
          </div>
          <Input label="Username" value={adminForm.username} onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })} />
          <Input label="Temp password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} />
          <Input label="First name" value={adminForm.firstName} onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })} />
          <Input label="Email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
          <div className={styles.actions}>
            <Button type="submit" variant="primary">Create admin</Button>
          </div>
        </form>
      </Drawer>

      <Drawer open={productOpen} onClose={() => setProductOpen(false)} title="Source product">
        <form className={styles.form} onSubmit={saveProduct}>
          <div className={styles.field}>
            <label htmlFor="client-product">Product</label>
            <select id="client-product" className={styles.control} value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.displayName}</option>
              ))}
            </select>
          </div>
          <p className={styles.muted}>This names the software the client came from. Add more products in the catalog. Payroll does not sync yet.</p>
          <div className={styles.actions}>
            <Button type="submit" variant="primary">Save product</Button>
          </div>
        </form>
      </Drawer>

      <Drawer open={integrationsOpen} onClose={() => setIntegrationsOpen(false)} title="Integrations">
        <form className={styles.form} onSubmit={saveIntegrations}>
          <Input label="Biometric vendor" value={integrationForm.biometricVendorName || ''} onChange={(e) => setIntegrationForm({ ...integrationForm, biometricVendorName: e.target.value })} />
          <Input label="Vendor URL" value={integrationForm.vendorUrl || ''} onChange={(e) => setIntegrationForm({ ...integrationForm, vendorUrl: e.target.value })} />
          <Input label="Vendor corporate id" value={integrationForm.vendorCorporateId || ''} onChange={(e) => setIntegrationForm({ ...integrationForm, vendorCorporateId: e.target.value })} />
          <Input label="Vendor username" value={integrationForm.vendorUserName || ''} onChange={(e) => setIntegrationForm({ ...integrationForm, vendorUserName: e.target.value })} />
          <Input label="Vendor password" type="password" value={integrationForm.vendorPassword || ''} onChange={(e) => setIntegrationForm({ ...integrationForm, vendorPassword: e.target.value })} />
          <Input label="Staff sync URL" value={integrationForm.externalSoftwareUrl || ''} onChange={(e) => setIntegrationForm({ ...integrationForm, externalSoftwareUrl: e.target.value })} />
          <Input label="External app name" value={integrationForm.externalAppName || ''} onChange={(e) => setIntegrationForm({ ...integrationForm, externalAppName: e.target.value })} />
          <div className={styles.actions}>
            <Button type="submit" variant="primary">Save integrations</Button>
          </div>
        </form>
      </Drawer>

      <Drawer open={salaryOpen} onClose={() => setSalaryOpen(false)} title={salaryForm.id ? 'Edit salary definition' : 'Salary definition'}>
        <form className={styles.form} onSubmit={saveSalary}>
          <Input label="Name" value={salaryForm.componentName} onChange={(e) => setSalaryForm({ ...salaryForm, componentName: e.target.value })} />
          <Input label="Alias" value={salaryForm.componentNameAlias} onChange={(e) => setSalaryForm({ ...salaryForm, componentNameAlias: e.target.value })} />
          <div className={styles.field}>
            <label htmlFor="salary-type">Type</label>
            <select id="salary-type" className={styles.control} value={salaryForm.componentType} onChange={(e) => setSalaryForm({ ...salaryForm, componentType: e.target.value })}>
              <option value="FIXED">Fixed</option>
              <option value="FORMULA">Formula</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="salary-category">Category</label>
            <select id="salary-category" className={styles.control} value={salaryForm.componentCategory} onChange={(e) => setSalaryForm({ ...salaryForm, componentCategory: e.target.value })}>
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
          </div>
          <Input label="Priority" type="number" value={salaryForm.priorityIndex} onChange={(e) => setSalaryForm({ ...salaryForm, priorityIndex: Number(e.target.value) })} />
          <Input label="Condition" value={salaryForm.conditionExpression} onChange={(e) => setSalaryForm({ ...salaryForm, conditionExpression: e.target.value })} />
          <Input label="Formula" value={salaryForm.formula} onChange={(e) => setSalaryForm({ ...salaryForm, formula: e.target.value })} />
          {preview !== '' && <p className={styles.note}>Preview with sample basic 30000: {preview}</p>}
          <div className={styles.actions}>
            {salaryForm.formula && <Button type="button" variant="outline" onClick={previewSalary}>Preview</Button>}
            <Button type="submit" variant="primary">Save</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default OpsClientDetail;
