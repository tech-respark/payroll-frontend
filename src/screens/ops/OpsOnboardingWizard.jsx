import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { apiService } from '../../api/apiService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, CardBody, Input } from '../../components/ui';
import styles from './opsShared.module.scss';

const STEPS = [
  'Company',
  'Store',
  'License',
  'Admin',
  'Salary',
  'Leave',
  'Holiday',
  'Shift',
  'Integrations',
  'Review',
];

const today = () => new Date().toISOString().slice(0, 10);
const nextYear = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

const OpsOnboardingWizard = () => {
  const { showToast } = useToast();
  const { isSuperAdmin } = useAuth();
  const history = useHistory();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [adminSecret, setAdminSecret] = useState('');
  const [form, setForm] = useState({
    tenantName: '',
    salaryCycleStartDay: 1,
    isPaidLeaveApplicable: true,
    storeName: 'Main store',
    timeZone: 'Asia/Kolkata',
    storeOpenTime: '09:00',
    storeCloseTime: '18:00',
    financialYearStartMonth: 4,
    currencySymbol: '₹',
    workingDaysPerMonth: 30,
    workingHoursPerDay: 9.5,
    companyName: '',
    address: '',
    gstNo: '',
    sourceTenantId: '',
    planCode: 'STANDARD',
    status: 'TRIAL',
    startsOn: today(),
    endsOn: nextYear(),
    maxStores: 5,
    maxStaff: 200,
    username: '',
    password: '',
    firstName: 'Admin',
    lastName: '',
    email: '',
    biometricVendorName: '',
    vendorUrl: '',
    salesOwnerId: '',
    productId: '',
  });
  const [owners, setOwners] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    apiService.get('/ops/sales-owners')
      .then((res) => setOwners(res.data || []))
      .catch(() => setOwners([]));
    apiService.get('/ops/tenants')
      .then((res) => setClients(res.data || []))
      .catch(() => setClients([]));
    apiService.get('/ops/products')
      .then((res) => {
        const rows = res.data || [];
        setProducts(rows);
        const preferred = rows.find((item) => item.defaultProduct)
          || rows.find((item) => item.code === 'devourin')
          || rows[0];
        setForm((prev) => (prev.productId ? prev : { ...prev, productId: preferred?.id || '' }));
      })
      .catch(() => setProducts([]));
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const run = async (fn) => {
    setSaving(true);
    try {
      await fn();
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const createCompanyAndStore = () => run(async () => {
    if (!form.tenantName.trim()) {
      throw new Error('Company name is required.');
    }
    const created = await apiService.post('/ops/tenants', {
      ...form,
      productId: form.productId ? Number(form.productId) : undefined,
      moduleHospitality: form.planCode === 'HOSPITALITY',
    });
    setTenantId(created.data.tenantId);
    setStoreId(created.data.firstStoreId);
  });

  const skipOrNext = () => setStep((current) => current + 1);

  const createAdmin = () => run(async () => {
    if (!form.username.trim() || form.password.length < 8) {
      throw new Error('Admin username and an 8-character temporary password are required.');
    }
    const result = await apiService.post(`/ops/tenants/${tenantId}/admin`, {
      storeId,
      username: form.username,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName || form.tenantName,
      email: form.email,
    });
    setAdminSecret(result.data.temporaryPassword);
  });

  const applySalary = () => run(async () => {
    if (form.sourceTenantId) {
      await apiService.post(`/ops/tenants/${tenantId}/clone-from/${form.sourceTenantId}`);
      return;
    }
    await apiService.post(`/ops/tenants/${tenantId}/salary-pack`, {});
  });

  const applyLeave = () => run(async () => {
    await apiService.post(`/ops/tenants/${tenantId}/leave-pack?storeId=${storeId}`);
  });

  const applyHolidays = () => run(async () => {
    await apiService.post(`/ops/tenants/${tenantId}/holiday-pack?storeId=${storeId}`);
  });

  const applyShift = () => run(async () => {
    await apiService.post(`/ops/tenants/${tenantId}/default-shift?storeId=${storeId}`);
  });

  const applyIntegrations = () => run(async () => {
    if (form.planCode === 'HOSPITALITY') {
      await apiService.post(`/ops/tenants/${tenantId}/statutory?storeId=${storeId}`);
    }
    if (form.biometricVendorName) {
      await apiService.put(`/ops/tenants/${tenantId}/integrations`, {
        storeId,
        biometricVendorName: form.biometricVendorName,
        vendorUrl: form.vendorUrl,
        createAttendanceScheduler: true,
      });
    }
  });

  const activate = async () => {
    setSaving(true);
    try {
      await apiService.put(`/ops/tenants/${tenantId}/subscription`, {
        status: form.status === 'DRAFT' ? 'TRIAL' : form.status,
        startsOn: form.startsOn,
        endsOn: form.endsOn,
      });
      showToast('Client is ready.', 'success');
      history.push(`/ops/clients/${tenantId}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.steps}>
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`${styles.step} ${index === step ? styles.stepActive : ''} ${index < step ? styles.stepDone : ''}`}
          >
            {index + 1}. {label}
          </span>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <CardBody>
            <div className={styles.form}>
              <Input label="Company name" value={form.tenantName} onChange={(e) => update('tenantName', e.target.value)} />
              <div className={styles.field}>
                <label htmlFor="wizard-product">Source product</label>
                <select id="wizard-product" className={styles.control} value={form.productId} onChange={(e) => update('productId', e.target.value)}>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.displayName}</option>
                  ))}
                </select>
                <p className={styles.muted}>Pick the suite this client came from. Payroll stays standalone until a connector exists. Superadmin can add more products to the catalog.</p>
              </div>
              <Input label="Salary cycle start day" type="number" value={form.salaryCycleStartDay} onChange={(e) => update('salaryCycleStartDay', Number(e.target.value))} />
            </div>
            <div className={styles.actions}>
              <Button variant="primary" disabled={saving} onClick={createCompanyAndStore}>Save company and store</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardBody>
            <p className={styles.note}>First store was created with the company. Adjust it if needed, then continue.</p>
            <div className={styles.form}>
              <Input label="Store name" value={form.storeName} onChange={(e) => update('storeName', e.target.value)} />
              <Input label="Timezone" value={form.timeZone} onChange={(e) => update('timeZone', e.target.value)} />
              <Input label="Open" value={form.storeOpenTime} onChange={(e) => update('storeOpenTime', e.target.value)} />
              <Input label="Close" value={form.storeCloseTime} onChange={(e) => update('storeCloseTime', e.target.value)} />
              <Input label="Currency" value={form.currencySymbol} onChange={(e) => update('currencySymbol', e.target.value)} />
              <Input label="Company name" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
              <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} />
              <Input label="GST" value={form.gstNo} onChange={(e) => update('gstNo', e.target.value)} />
              <Input label="Working days / month" type="number" value={form.workingDaysPerMonth} onChange={(e) => update('workingDaysPerMonth', Number(e.target.value))} />
            </div>
            <div className={styles.actions}>
              <Button variant="primary" disabled={saving || !tenantId} onClick={() => run(() => apiService.put(`/ops/tenants/${tenantId}/stores/${storeId}`, form))}>Save store</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardBody>
            <div className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="wizard-plan">Plan</label>
                <select id="wizard-plan" className={styles.control} value={form.planCode} onChange={(e) => update('planCode', e.target.value)}>
                  <option value="STANDARD">Standard</option>
                  <option value="HOSPITALITY">Hospitality</option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="wizard-status">Status</label>
                <select id="wizard-status" className={styles.control} value={form.status} onChange={(e) => update('status', e.target.value)}>
                  <option value="DRAFT">Draft</option>
                  <option value="TRIAL">Trial</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>
              <Input label="Starts" type="date" value={form.startsOn} onChange={(e) => update('startsOn', e.target.value)} />
              <Input label="Ends" type="date" value={form.endsOn} onChange={(e) => update('endsOn', e.target.value)} />
              <Input label="Max stores" type="number" value={form.maxStores} onChange={(e) => update('maxStores', Number(e.target.value))} />
              <Input label="Max staff" type="number" value={form.maxStaff} onChange={(e) => update('maxStaff', Number(e.target.value))} />
              {isSuperAdmin && (
              <div className={styles.field}>
                <label htmlFor="wizard-owner">Salesperson</label>
                <select id="wizard-owner" className={styles.control} value={form.salesOwnerId} onChange={(e) => update('salesOwnerId', e.target.value)}>
                  <option value="">Assign to me</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.displayName}</option>
                  ))}
                </select>
              </div>
              )}
            </div>
            <div className={styles.actions}>
              <Button variant="primary" disabled={saving} onClick={() => run(() => apiService.put(`/ops/tenants/${tenantId}/subscription`, { ...form, salesOwnerId: form.salesOwnerId ? Number(form.salesOwnerId) : undefined, moduleHospitality: form.planCode === 'HOSPITALITY' }))}>Save license</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardBody>
            <div className={styles.form}>
              <Input label="Admin username" value={form.username} onChange={(e) => update('username', e.target.value)} />
              <Input label="Temp password" value={form.password} onChange={(e) => update('password', e.target.value)} />
              <Input label="First name" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
              <Input label="Email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className={styles.actions}>
              <Button variant="primary" disabled={saving} onClick={createAdmin}>Create client admin</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardBody>
            <p className={styles.note}>Apply the standard salary pack, or copy salary, leave, and letterhead from another client.</p>
            <div className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="wizard-clone">Clone from</label>
                <select id="wizard-clone" className={styles.control} value={form.sourceTenantId} onChange={(e) => update('sourceTenantId', e.target.value)}>
                  <option value="">System salary pack</option>
                  {clients.filter((client) => client.tenantId !== tenantId).map((client) => (
                    <option key={client.tenantId} value={client.tenantId}>{client.tenantName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.actions}>
              <Button variant="primary" disabled={saving} onClick={applySalary}>{form.sourceTenantId ? 'Clone packs' : 'Apply salary pack'}</Button>
              <Button variant="outline" onClick={skipOrNext}>Skip</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardBody>
            <p className={styles.note}>Creates CL, SL, EL, OH and a default annual plan. HR still enrolls staff later.</p>
            <div className={styles.actions}>
              <Button variant="primary" disabled={saving} onClick={applyLeave}>Apply leave pack</Button>
              <Button variant="outline" onClick={skipOrNext}>Skip</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 6 && (
        <Card>
          <CardBody>
            <p className={styles.note}>Adds fixed national holidays for the current year. Variable festival dates stay a client HR step.</p>
            <div className={styles.actions}>
              <Button variant="primary" disabled={saving} onClick={applyHolidays}>Apply holiday pack</Button>
              <Button variant="outline" onClick={skipOrNext}>Skip</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 7 && (
        <Card>
          <CardBody>
            <p className={styles.note}>Creates one General shift matching store hours.</p>
            <div className={styles.actions}>
              <Button variant="primary" disabled={saving} onClick={applyShift}>Create default shift</Button>
              <Button variant="outline" onClick={skipOrNext}>Skip</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 8 && (
        <Card>
          <CardBody>
            <div className={styles.form}>
              <Input label="Biometric vendor" value={form.biometricVendorName} onChange={(e) => update('biometricVendorName', e.target.value)} placeholder="TEAM_OFFICE" />
              <Input label="Vendor URL" value={form.vendorUrl} onChange={(e) => update('vendorUrl', e.target.value)} />
            </div>
            <div className={styles.actions}>
              <Button variant="primary" disabled={saving} onClick={applyIntegrations}>Save integrations</Button>
              <Button variant="outline" onClick={skipOrNext}>Skip</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 9 && (
        <Card>
          <CardBody>
            <p className={styles.note}>
              Tenant {tenantId} is provisioned
              {products.find((item) => String(item.id) === String(form.productId))
                ? ` on ${products.find((item) => String(item.id) === String(form.productId)).displayName}`
                : ''}
              . Client login stays blocked until the license is trial or active.
            </p>
            {adminSecret && <p className={styles.muted}>Client admin password (shown once): {adminSecret}</p>}
            {!isSuperAdmin && form.status === 'SUSPENDED' && <p className={styles.muted}>Sales cannot suspend a license.</p>}
            <div className={styles.actions}>
              <Button variant="primary" disabled={saving} onClick={activate}>Activate and open client</Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default OpsOnboardingWizard;
