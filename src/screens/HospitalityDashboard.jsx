import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStaffList } from '../hooks/queries';
import { Badge, Button, Card, CardBody, CardHeader, Drawer, Input, Modal, StaffPicker, Switch } from '../components/ui';
import styles from './HospitalityDashboard.module.scss';

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const TABS = [
  { id: 'advances', label: 'Advances', hint: 'Record cash given to staff. Recovered automatically on the next hospitality payroll apply.' },
  { id: 'commission', label: 'Commission', hint: 'Percent of staff sales. Match a category such as service or retail.' },
  { id: 'sales', label: 'Staff sales', hint: 'Enter stylist or server sales from POS or booking. Used to calculate commission.' },
  { id: 'tips', label: 'Service charge', hint: 'Pool the day’s or week’s service charge, then split by hours worked.' },
  { id: 'statutory', label: 'Statutory', hint: 'India PF, ESI, PT, TDS, and LWF amounts written onto payslips. This does not file with the government.' },
  { id: 'labor', label: 'Labor vs sales', hint: 'Compare outlet sales with estimated labor cost for the selected month.' },
  { id: 'fnf', label: 'Full & final', hint: 'Draft a leaving settlement. Settling closes open advances and marks the person inactive.' },
  { id: 'exports', label: 'Apply & export', hint: 'Review the muster, write hospitality lines onto existing payslips, and download the bank file.' },
];
const CATEGORIES = [
  { value: 'SERVICE', label: 'Service' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'PACKAGE', label: 'Package' },
  { value: 'REQUEST', label: 'Request' },
];

const unwrap = (res) => res?.data ?? res ?? [];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const pretty = (value) => {
  const map = {
    ADVANCE: 'Advance', LOAN: 'Loan', ACTIVE: 'Active', CLOSED: 'Closed',
    SERVICE: 'Service', RETAIL: 'Retail', PACKAGE: 'Package', REQUEST: 'Request',
    DRAFT: 'Draft', DISTRIBUTED: 'Distributed', PENDING: 'Pending', SETTLED: 'Settled',
    MANUAL: 'Manual', CSV: 'Import', HOURS: 'By hours', POINTS: 'By points',
  };
  return map[value] || value || '—';
};
const statusVariant = (value) => {
  if (['ACTIVE', 'DISTRIBUTED', 'SETTLED'].includes(value)) return 'success';
  if (['DRAFT', 'PENDING'].includes(value)) return 'warning';
  if (['CLOSED', 'REJECTED'].includes(value)) return 'default';
  return 'info';
};

export default function HospitalityDashboard() {
  const { tenantId, storeId, hasAccess } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { staffList } = useStaffList();
  const canManage = hasAccess(['MANAGE_SALARY', 'MANAGE_HOSPITALITY']);
  const [tab, setTab] = useState('advances');
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const qs = `tenantId=${tenantId}&storeId=${storeId}`;
  const currentTab = TABS.find((item) => item.id === tab);
  const showPeriod = tab === 'labor' || tab === 'exports';
  const invalidate = (key) => queryClient.invalidateQueries({ queryKey: [key] });

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <p>Store-level extras for salons and restaurants. Record advances, sales, and rates here. When payslips already exist, open Apply &amp; export.</p>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="Hospitality tools">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? styles.tabActive : styles.tab}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {showPeriod && (
          <label className={styles.period}>
            <span>Payroll month</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Payroll month">
              {MONTHS.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Payroll year" />
          </label>
        )}
      </div>
      {currentTab && <p className={styles.tabHint}>{currentTab.hint}</p>}

      {tab === 'advances' && <AdvancesTab qs={qs} canManage={canManage} staffList={staffList} showToast={showToast} invalidate={invalidate} />}
      {tab === 'commission' && <CommissionTab qs={qs} canManage={canManage} staffList={staffList} showToast={showToast} invalidate={invalidate} />}
      {tab === 'sales' && <SalesTab qs={qs} canManage={canManage} staffList={staffList} showToast={showToast} invalidate={invalidate} />}
      {tab === 'tips' && <TipsTab qs={qs} canManage={canManage} staffList={staffList} showToast={showToast} invalidate={invalidate} />}
      {tab === 'statutory' && <StatutoryTab qs={qs} canManage={canManage} showToast={showToast} invalidate={invalidate} />}
      {tab === 'labor' && <LaborTab qs={qs} month={month} year={year} canManage={canManage} showToast={showToast} invalidate={invalidate} />}
      {tab === 'fnf' && <FnfTab qs={qs} canManage={canManage} staffList={staffList} showToast={showToast} invalidate={invalidate} />}
      {tab === 'exports' && <ExportsTab qs={qs} month={month} year={year} canManage={canManage} showToast={showToast} />}
    </div>
  );
}

function AdvancesTab({ qs, canManage, staffList, showToast, invalidate }) {
  const emptyForm = { staffId: '', advanceType: 'ADVANCE', principal: '', installmentAmount: '', remainingInstallments: 1, remarks: '' };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [confirmId, setConfirmId] = useState(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ['hospitality-advances'],
    queryFn: async () => unwrap(await apiService.get(`/hospitality/advances?${qs}`)),
  });
  const create = useMutation({
    mutationFn: () => {
      if (!form.staffId || !form.principal) throw new Error('Choose a staff member and enter the amount given.');
      return apiService.post(`/hospitality/advances?${qs}`, {
        staffId: Number(form.staffId),
        advanceType: form.advanceType,
        principal: Number(form.principal),
        installmentAmount: Number(form.installmentAmount || form.principal),
        remainingInstallments: Number(form.remainingInstallments || 1),
        remarks: form.remarks,
      });
    },
    onSuccess: () => { invalidate('hospitality-advances'); showToast('Advance saved', 'success'); setOpen(false); setForm(emptyForm); },
    onError: (err) => showToast(err.message, 'error'),
  });
  const close = useMutation({
    mutationFn: (id) => apiService.post(`/hospitality/advances/${id}/close?${qs}`, {}),
    onSuccess: () => { invalidate('hospitality-advances'); showToast('Advance closed', 'success'); setConfirmId(null); },
    onError: (err) => showToast(err.message, 'error'),
  });
  const updateMoney = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      const principal = Number(key === 'principal' ? value : next.principal);
      const installment = Number(key === 'installmentAmount' ? value : next.installmentAmount);
      if (principal > 0 && installment > 0) {
        next.remainingInstallments = Math.max(1, Math.ceil(principal / installment));
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className={styles.headerRow}>
          <span>Advances and loans</span>
          {canManage && <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>New advance</Button>}
        </div>
      </CardHeader>
      <CardBody>
        {isLoading ? <p className={styles.hint}>Loading advances…</p> : (
          <>
            {data.length > 0 && (
              <div className={styles.summary}>
                <div className={styles.summaryItem}><strong>{data.filter((row) => row.status === 'ACTIVE').length}</strong> open</div>
                <div className={styles.summaryItem}><strong>{money(data.filter((row) => row.status === 'ACTIVE').reduce((sum, row) => sum + Number(row.outstandingBalance || 0), 0))}</strong> still owed</div>
              </div>
            )}
          <DataTable empty="No advances yet. Record cash given to a stylist or server here.">
            <thead><tr><th>Staff</th><th>Type</th><th>Given</th><th>Still owed</th><th>Monthly recovery</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>{nameOf(staffList, row.staffId)}</td>
                  <td>{pretty(row.advanceType)}</td>
                  <td>{money(row.principal)}</td>
                  <td>{money(row.outstandingBalance)}</td>
                  <td>{money(row.installmentAmount)} × {row.remainingInstallments || 0}</td>
                  <td><Badge variant={statusVariant(row.status)}>{pretty(row.status)}</Badge></td>
                  <td>{canManage && row.status === 'ACTIVE' && <Button variant="outline" onClick={() => setConfirmId(row.id)}>Close</Button>}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          </>
        )}
      </CardBody>
      <Drawer open={open} onClose={() => setOpen(false)} title="New advance" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => create.mutate()}>Save advance</Button></>}>
        <p className={styles.hint}>The monthly installment is recovered when hospitality lines are applied. It is deducted only once per payslip month.</p>
        <StaffSelect staffList={staffList} value={form.staffId} onChange={(staffId) => setForm((prev) => ({ ...prev, staffId }))} />
        <label className={styles.field}>
          <span className={styles.label}>Type</span>
          <select className={styles.select} value={form.advanceType} onChange={(e) => setForm((prev) => ({ ...prev, advanceType: e.target.value }))}>
            <option value="ADVANCE">Advance</option>
            <option value="LOAN">Loan</option>
          </select>
        </label>
        <Input label="Amount given" type="number" min="1" value={form.principal} onChange={(e) => updateMoney('principal', e.target.value)} />
        <Input label="Monthly recovery" type="number" min="1" value={form.installmentAmount} onChange={(e) => updateMoney('installmentAmount', e.target.value)} />
        <Input label="Remaining months" type="number" min="1" value={form.remainingInstallments} onChange={(e) => setForm((prev) => ({ ...prev, remainingInstallments: e.target.value }))} />
        <Input label="Note" value={form.remarks} onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} placeholder="Festival advance, uniform, etc." />
      </Drawer>
      <ConfirmDialog
        open={confirmId != null}
        title="Close this advance?"
        body="Outstanding balance will be set to zero. Use this only if the staff member already repaid in cash."
        confirmLabel="Close advance"
        onClose={() => setConfirmId(null)}
        onConfirm={() => close.mutate(confirmId)}
      />
    </Card>
  );
}

function CommissionTab({ qs, canManage, staffList, showToast, invalidate }) {
  const emptyForm = { planName: '', category: 'SERVICE', staffId: '', thresholdFrom: '0', ratePercent: '30' };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ['hospitality-commission'],
    queryFn: async () => unwrap(await apiService.get(`/hospitality/commission-plans?${qs}`)),
  });
  const save = useMutation({
    mutationFn: () => {
      if (!form.planName) throw new Error('Give the plan a name, for example Stylist service 30%.');
      return apiService.post(`/hospitality/commission-plans?${qs}`, {
        planName: form.planName,
        category: form.category,
        staffId: form.staffId ? Number(form.staffId) : null,
        active: true,
        slabs: [{ thresholdFrom: Number(form.thresholdFrom || 0), ratePercent: Number(form.ratePercent || 0) }],
      });
    },
    onSuccess: () => { invalidate('hospitality-commission'); showToast('Commission plan saved', 'success'); setOpen(false); setForm(emptyForm); },
    onError: (err) => showToast(err.message, 'error'),
  });
  const remove = useMutation({
    mutationFn: (id) => apiService.delete(`/hospitality/commission-plans/${id}?${qs}`),
    onSuccess: () => { invalidate('hospitality-commission'); showToast('Plan deleted', 'success'); setDeleteId(null); },
    onError: (err) => showToast(err.message, 'error'),
  });

  return (
    <Card>
      <CardHeader>
        <div className={styles.headerRow}>
          <span>Commission plans</span>
          {canManage && <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>New plan</Button>}
        </div>
      </CardHeader>
      <CardBody>
        <DataTable loading={isLoading} empty="No commission plans yet. Create one so staff sales can convert into payslip earnings.">
          <thead><tr><th>Plan</th><th>Applies to</th><th>Who</th><th>Rate</th><th></th></tr></thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td>{row.planName}</td>
                <td>{pretty(row.category)}</td>
                <td>{row.staffId ? nameOf(staffList, row.staffId) : 'All staff'}</td>
                <td>{(row.slabs || []).map((slab) => `${money(slab.thresholdFrom)}+ at ${slab.ratePercent}%`).join(', ')}</td>
                <td>{canManage && <Button variant="danger" onClick={() => setDeleteId(row.id)}>Delete</Button>}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </CardBody>
      <Drawer open={open} onClose={() => setOpen(false)} title="Commission plan" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()}>Save plan</Button></>}>
        <p className={styles.hint}>Example: Service sales from ₹0 at 30%. Leave staff blank to apply the same rate to everyone.</p>
        <Input label="Plan name" value={form.planName} onChange={(e) => setForm((prev) => ({ ...prev, planName: e.target.value }))} placeholder="Stylist service" />
        <label className={styles.field}>
          <span className={styles.label}>Applies to</span>
          <select className={styles.select} value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
            {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <StaffSelect staffList={staffList} value={form.staffId} allowEmpty onChange={(staffId) => setForm((prev) => ({ ...prev, staffId }))} />
        <Input label="Sales from (₹)" type="number" value={form.thresholdFrom} onChange={(e) => setForm((prev) => ({ ...prev, thresholdFrom: e.target.value }))} />
        <Input label="Commission %" type="number" value={form.ratePercent} onChange={(e) => setForm((prev) => ({ ...prev, ratePercent: e.target.value }))} />
      </Drawer>
      <ConfirmDialog
        open={deleteId != null}
        title="Delete this commission plan?"
        body="Future payroll applies will stop using this rate. Past payslips stay as they are."
        confirmLabel="Delete plan"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => remove.mutate(deleteId)}
      />
    </Card>
  );
}

function SalesTab({ qs, canManage, staffList, showToast, invalidate }) {
  const emptyForm = { staffId: '', saleDate: new Date().toISOString().slice(0, 10), category: 'SERVICE', amount: '', notes: '' };
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [form, setForm] = useState(emptyForm);
  const { data = [], isLoading } = useQuery({
    queryKey: ['hospitality-sales'],
    queryFn: async () => unwrap(await apiService.get(`/hospitality/sales?${qs}`)),
  });
  const save = useMutation({
    mutationFn: () => {
      if (!form.staffId || !form.amount) throw new Error('Choose staff and enter the sale amount.');
      return apiService.post(`/hospitality/sales?${qs}`, { ...form, staffId: Number(form.staffId), amount: Number(form.amount) });
    },
    onSuccess: () => { invalidate('hospitality-sales'); showToast('Sale saved', 'success'); setOpen(false); setForm(emptyForm); },
    onError: (err) => showToast(err.message, 'error'),
  });
  const importRows = useMutation({
    mutationFn: () => {
      const rows = parseSalesImport(importText, staffList);
      if (!rows.length) throw new Error('No valid rows found. Use staff, date, category, amount.');
      return apiService.post(`/hospitality/sales/import?${qs}`, { rows });
    },
    onSuccess: (res) => { invalidate('hospitality-sales'); showToast(`Imported ${res?.data?.length ?? 0} sales`, 'success'); setImportOpen(false); setImportText(''); },
    onError: (err) => showToast(err.message, 'error'),
  });

  return (
    <Card>
      <CardHeader>
        <div className={styles.headerRow}>
          <span>Staff sales</span>
          {canManage && (
            <div className={styles.inline}>
              <Button variant="outline" onClick={() => setImportOpen(true)}>Paste list</Button>
              <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>Add sale</Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <DataTable loading={isLoading} empty="No staff sales yet. Add a ticket from POS or booking so commission can calculate.">
          <thead><tr><th>Date</th><th>Staff</th><th>Category</th><th>Amount</th><th>Source</th></tr></thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td>{formatDate(row.saleDate)}</td>
                <td>{nameOf(staffList, row.staffId)}</td>
                <td>{pretty(row.category)}</td>
                <td>{money(row.amount)}</td>
                <td>{pretty(row.source)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </CardBody>
      <Drawer open={open} onClose={() => setOpen(false)} title="Add staff sale" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()}>Save sale</Button></>}>
        <StaffSelect staffList={staffList} value={form.staffId} onChange={(staffId) => setForm((prev) => ({ ...prev, staffId }))} />
        <Input label="Date" type="date" value={form.saleDate} onChange={(e) => setForm((prev) => ({ ...prev, saleDate: e.target.value }))} />
        <label className={styles.field}>
          <span className={styles.label}>Category</span>
          <select className={styles.select} value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
            {CATEGORIES.filter((item) => item.value !== 'REQUEST').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <Input label="Amount" type="number" min="0" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
        <Input label="Note" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Hair color, table 12, etc." />
      </Drawer>
      <Drawer open={importOpen} onClose={() => setImportOpen(false)} title="Paste sales list" footer={<><Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button><Button onClick={() => importRows.mutate()}>Import</Button></>}>
        <p className={styles.hint}>One row per sale: staff name or id, date, category, amount. Category can be Service, Retail, or Package.</p>
        <label className={styles.field}>
          <span className={styles.label}>Sales rows</span>
          <textarea className={styles.textarea} rows={8} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'Mayuresh Patil, 2026-10-20, Service, 2500'} />
        </label>
      </Drawer>
    </Card>
  );
}

function TipsTab({ qs, canManage, staffList, showToast, invalidate }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const emptyForm = { periodFrom: monthStart, periodTo: today, poolAmount: '', method: 'HOURS' };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [distributeId, setDistributeId] = useState(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ['hospitality-tips'],
    queryFn: async () => unwrap(await apiService.get(`/hospitality/tip-pools?${qs}`)),
  });
  const save = useMutation({
    mutationFn: () => {
      if (!form.periodFrom || !form.periodTo || !form.poolAmount) throw new Error('Enter the period and the pool amount.');
      return apiService.post(`/hospitality/tip-pools?${qs}`, { ...form, poolAmount: Number(form.poolAmount) });
    },
    onSuccess: () => { invalidate('hospitality-tips'); showToast('Pool created', 'success'); setOpen(false); setForm(emptyForm); },
    onError: (err) => showToast(err.message, 'error'),
  });
  const distribute = useMutation({
    mutationFn: (id) => apiService.post(`/hospitality/tip-pools/${id}/distribute?${qs}`, {}),
    onSuccess: () => { invalidate('hospitality-tips'); showToast('Pool distributed by hours worked', 'success'); setDistributeId(null); },
    onError: (err) => showToast(err.message, 'error'),
  });

  return (
    <Card>
      <CardHeader>
        <div className={styles.headerRow}>
          <span>Service charge pool</span>
          {canManage && <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>New pool</Button>}
        </div>
      </CardHeader>
      <CardBody>
        {isLoading && <p className={styles.hint}>Loading pools…</p>}
        {!isLoading && data.length === 0 && <p className={styles.empty}>No service-charge pools yet. Create a pool for the week, then split it by hours.</p>}
        {data.map((row) => (
          <div key={row.id} className={styles.pool}>
            <div className={styles.poolHead}>
              <div>
                <strong>{formatDate(row.periodFrom)} to {formatDate(row.periodTo)}</strong>
                <p>{money(row.poolAmount)} · {pretty(row.method)}</p>
              </div>
              <Badge variant={statusVariant(row.status)}>{pretty(row.status)}</Badge>
            </div>
            {canManage && row.status === 'DRAFT' && <Button onClick={() => setDistributeId(row.id)}>Split by hours worked</Button>}
            {(row.shares || []).length > 0 && (
              <table className={styles.table}>
                <thead><tr><th>Staff</th><th>Hours</th><th>Share</th></tr></thead>
                <tbody>
                  {row.shares.map((share) => (
                    <tr key={share.id}>
                      <td>{nameOf(staffList, share.staffId)}</td>
                      <td>{share.hoursWorked ?? share.points ?? '—'}</td>
                      <td>{money(share.shareAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </CardBody>
      <Drawer open={open} onClose={() => setOpen(false)} title="New service-charge pool" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()}>Save pool</Button></>}>
        <p className={styles.hint}>After you save, use Split by hours worked to share the pool across people who punched in that period.</p>
        <Input label="From" type="date" value={form.periodFrom} onChange={(e) => setForm((prev) => ({ ...prev, periodFrom: e.target.value }))} />
        <Input label="To" type="date" value={form.periodTo} onChange={(e) => setForm((prev) => ({ ...prev, periodTo: e.target.value }))} />
        <Input label="Pool amount" type="number" min="0" value={form.poolAmount} onChange={(e) => setForm((prev) => ({ ...prev, poolAmount: e.target.value }))} />
      </Drawer>
      <ConfirmDialog
        open={distributeId != null}
        title="Split this pool by hours?"
        body="Each person who punched in during the period gets a share. This cannot be undone from here."
        confirmLabel="Split now"
        onClose={() => setDistributeId(null)}
        onConfirm={() => distribute.mutate(distributeId)}
      />
    </Card>
  );
}

function StatutoryTab({ qs, canManage, showToast, invalidate }) {
  const { data } = useQuery({
    queryKey: ['hospitality-statutory'],
    queryFn: async () => unwrap(await apiService.get(`/hospitality/statutory?${qs}`)),
  });
  const [form, setForm] = useState(null);
  const current = form || data || {};
  const save = useMutation({
    mutationFn: () => apiService.put(`/hospitality/statutory?${qs}`, current),
    onSuccess: () => { invalidate('hospitality-statutory'); showToast('Statutory settings saved', 'success'); },
    onError: (err) => showToast(err.message, 'error'),
  });
  const set = (key, value) => setForm((prev) => ({ ...(prev || data || {}), [key]: value }));

  return (
    <Card>
      <CardHeader>
        <div className={styles.headerRow}>
          <span>Statutory calculation</span>
          {canManage && <Button onClick={() => save.mutate()}>Save rates</Button>}
        </div>
      </CardHeader>
      <CardBody>
        <div className={styles.statGrid}>
          <StatutoryBlock title="Provident Fund" enabled={!!current.pfEnabled} onToggle={(checked) => set('pfEnabled', checked)}>
            <Input label="Wage ceiling (₹)" type="number" value={current.pfWageCeiling ?? ''} onChange={(e) => set('pfWageCeiling', e.target.value)} />
            <Input label="Employee %" type="number" value={current.pfEmployeeRate ?? ''} onChange={(e) => set('pfEmployeeRate', e.target.value)} />
          </StatutoryBlock>
          <StatutoryBlock title="ESI" enabled={!!current.esiEnabled} onToggle={(checked) => set('esiEnabled', checked)}>
            <Input label="Wage ceiling (₹)" type="number" value={current.esiWageCeiling ?? ''} onChange={(e) => set('esiWageCeiling', e.target.value)} />
            <Input label="Employee %" type="number" value={current.esiEmployeeRate ?? ''} onChange={(e) => set('esiEmployeeRate', e.target.value)} />
          </StatutoryBlock>
          <StatutoryBlock title="Professional tax" enabled={!!current.ptEnabled} onToggle={(checked) => set('ptEnabled', checked)}>
            <Input label="Monthly amount (₹)" type="number" value={current.ptAmount ?? ''} onChange={(e) => set('ptAmount', e.target.value)} />
          </StatutoryBlock>
          <StatutoryBlock title="TDS" enabled={!!current.tdsEnabled} onToggle={(checked) => set('tdsEnabled', checked)}>
            <Input label="Rate %" type="number" value={current.tdsRate ?? ''} onChange={(e) => set('tdsRate', e.target.value)} />
          </StatutoryBlock>
          <StatutoryBlock title="Labour welfare fund" enabled={!!current.lwfEnabled} onToggle={(checked) => set('lwfEnabled', checked)}>
            <Input label="Employee amount (₹)" type="number" value={current.lwfEmployeeAmount ?? ''} onChange={(e) => set('lwfEmployeeAmount', e.target.value)} />
          </StatutoryBlock>
        </div>
        <p className={styles.hint}>These values only write payslip lines. They do not file ECR or challans with EPFO or ESIC.</p>
      </CardBody>
    </Card>
  );
}

function LaborTab({ qs, month, year, canManage, showToast, invalidate }) {
  const [sale, setSale] = useState({ saleDate: new Date().toISOString().slice(0, 10), netSales: '', covers: '' });
  const [showQuietDays, setShowQuietDays] = useState(false);
  const range = monthRange(month, year);
  const { data = [], isLoading } = useQuery({
    queryKey: ['hospitality-labor', month, year],
    queryFn: async () => unwrap(await apiService.get(`/hospitality/labor?${qs}&fromDate=${range.from}&toDate=${range.to}`)),
  });
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSale((prev) => ({
      ...prev,
      saleDate: today >= range.from && today <= range.to ? today : range.to,
    }));
  }, [range.from, range.to]);
  const rows = useMemo(
    () => showQuietDays ? data : data.filter((row) => Number(row.netSales) > 0 || Number(row.hoursWorked) > 0),
    [data, showQuietDays]
  );
  const totals = useMemo(() => rows.reduce((acc, row) => ({
    sales: acc.sales + Number(row.netSales || 0),
    labor: acc.labor + Number(row.laborCost || 0),
    hours: acc.hours + Number(row.hoursWorked || 0),
  }), { sales: 0, labor: 0, hours: 0 }), [rows]);
  const save = useMutation({
    mutationFn: () => {
      if (!sale.netSales) throw new Error('Enter outlet net sales for the day.');
      return apiService.post(`/hospitality/daily-sales?${qs}`, { ...sale, netSales: Number(sale.netSales), covers: sale.covers ? Number(sale.covers) : null });
    },
    onSuccess: () => {
      invalidate('hospitality-labor');
      showToast('Outlet sales saved', 'success');
      setSale((prev) => ({ ...prev, netSales: '', covers: '' }));
    },
    onError: (err) => showToast(err.message, 'error'),
  });

  return (
    <div className={styles.stack}>
      {canManage && (
        <Card>
          <CardHeader>Record outlet sales</CardHeader>
          <CardBody>
            <div className={styles.inline}>
              <Input containerClassName={styles.compactField} label="Date" type="date" value={sale.saleDate} onChange={(e) => setSale((prev) => ({ ...prev, saleDate: e.target.value }))} />
              <Input containerClassName={styles.compactField} label="Net sales" type="number" min="0" value={sale.netSales} onChange={(e) => setSale((prev) => ({ ...prev, netSales: e.target.value }))} />
              <Input containerClassName={styles.compactField} label="Covers / tickets" type="number" min="0" value={sale.covers} onChange={(e) => setSale((prev) => ({ ...prev, covers: e.target.value }))} />
              <Button onClick={() => save.mutate()}>Save sales</Button>
            </div>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardHeader>
          <div className={styles.headerRow}>
            <span>Labor as percent of sales</span>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={showQuietDays} onChange={(e) => setShowQuietDays(e.target.checked)} />
              Show empty days
            </label>
          </div>
        </CardHeader>
        <CardBody>
          {rows.length > 0 && (
            <div className={styles.summary}>
              <div className={styles.summaryItem}><strong>{money(totals.sales)}</strong> sales</div>
              <div className={styles.summaryItem}><strong>{money(totals.labor)}</strong> labor</div>
              <div className={styles.summaryItem}><strong>{totals.hours}</strong> hours</div>
              <div className={styles.summaryItem}><strong>{totals.sales > 0 ? `${((totals.labor / totals.sales) * 100).toFixed(1)}%` : '—'}</strong> labor %</div>
            </div>
          )}
          <DataTable loading={isLoading} empty="No labor or sales yet for this month. Save outlet sales above after service.">
            <thead><tr><th>Date</th><th>Sales</th><th>Labor</th><th>Hours</th><th>Labor %</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.saleDate}>
                  <td>{formatDate(row.saleDate)}</td>
                  <td>{money(row.netSales)}</td>
                  <td>{money(row.laborCost)}</td>
                  <td>{row.hoursWorked}</td>
                  <td>{Number(row.netSales) > 0 ? `${row.laborPercent}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </CardBody>
      </Card>
    </div>
  );
}

function FnfTab({ qs, canManage, staffList, showToast, invalidate }) {
  const emptyForm = { staffId: '', lastWorkingDate: '', leaveEncashment: 0, otherDeductions: 0, remarks: '' };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [settleId, setSettleId] = useState(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ['hospitality-fnf'],
    queryFn: async () => unwrap(await apiService.get(`/hospitality/fnf?${qs}`)),
  });
  const save = useMutation({
    mutationFn: () => {
      if (!form.staffId || !form.lastWorkingDate) throw new Error('Choose staff and the last working date.');
      return apiService.post(`/hospitality/fnf?${qs}`, { ...form, staffId: Number(form.staffId), leaveEncashment: Number(form.leaveEncashment || 0), otherDeductions: Number(form.otherDeductions || 0) });
    },
    onSuccess: () => { invalidate('hospitality-fnf'); showToast('Settlement drafted', 'success'); setOpen(false); setForm(emptyForm); },
    onError: (err) => showToast(err.message, 'error'),
  });
  const settle = useMutation({
    mutationFn: (id) => apiService.post(`/hospitality/fnf/${id}/settle?${qs}`, {}),
    onSuccess: () => { invalidate('hospitality-fnf'); showToast('Settlement closed. Staff marked inactive.', 'success'); setSettleId(null); },
    onError: (err) => showToast(err.message, 'error'),
  });

  return (
    <Card>
      <CardHeader>
        <div className={styles.headerRow}>
          <span>Full and final</span>
          {canManage && <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>Draft settlement</Button>}
        </div>
      </CardHeader>
      <CardBody>
        <DataTable loading={isLoading} empty="No settlements yet. Draft one when a staff member’s last day is confirmed.">
          <thead><tr><th>Staff</th><th>Last day</th><th>Unpaid</th><th>Advances</th><th>Net payable</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td>{nameOf(staffList, row.staffId)}</td>
                <td>{formatDate(row.lastWorkingDate)}</td>
                <td>{money(row.unpaidSalary)}</td>
                <td>{money(row.advanceRecovery)}</td>
                <td>{money(row.netPayable)}</td>
                <td><Badge variant={statusVariant(row.status)}>{pretty(row.status)}</Badge></td>
                <td>{canManage && row.status === 'DRAFT' && <Button onClick={() => setSettleId(row.id)}>Settle</Button>}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </CardBody>
      <Drawer open={open} onClose={() => setOpen(false)} title="Draft full and final" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()}>Save draft</Button></>}>
        <p className={styles.hint}>Unpaid salary is estimated from the monthly amount and last working date. Open advances are recovered automatically.</p>
        <StaffSelect staffList={staffList} value={form.staffId} onChange={(staffId) => setForm((prev) => ({ ...prev, staffId }))} />
        <Input label="Last working date" type="date" value={form.lastWorkingDate} onChange={(e) => setForm((prev) => ({ ...prev, lastWorkingDate: e.target.value }))} />
        <Input label="Leave encashment" type="number" value={form.leaveEncashment} onChange={(e) => setForm((prev) => ({ ...prev, leaveEncashment: e.target.value }))} />
        <Input label="Other deductions" type="number" value={form.otherDeductions} onChange={(e) => setForm((prev) => ({ ...prev, otherDeductions: e.target.value }))} />
        <Input label="Note" value={form.remarks} onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} />
      </Drawer>
      <ConfirmDialog
        open={settleId != null}
        title="Settle and mark inactive?"
        body="This closes open advances and marks the staff member inactive. They will not be able to sign in."
        confirmLabel="Settle now"
        danger
        onClose={() => setSettleId(null)}
        onConfirm={() => settle.mutate(settleId)}
      />
    </Card>
  );
}

function ExportsTab({ qs, month, year, canManage, showToast }) {
  const [confirmApply, setConfirmApply] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ['hospitality-muster', month, year],
    queryFn: async () => unwrap(await apiService.get(`/hospitality/muster?${qs}&month=${month}&year=${year}`)),
  });
  const apply = useMutation({
    mutationFn: () => apiService.post(`/hospitality/apply-payroll?${qs}`, { month, year }),
    onSuccess: (res) => { showToast(`Hospitality lines applied for ${res?.data?.applied ?? 0} staff`, 'success'); setConfirmApply(false); },
    onError: (err) => showToast(err.message, 'error'),
  });
  const downloadNeft = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`/payroll-management/v1/hospitality/neft?${qs}&month=${month}&year=${year}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!response.ok) throw new Error('NEFT export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `neft-${month}-${year}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('NEFT file downloaded', 'success');
    } catch (err) {
      showToast(err.message || 'NEFT export failed', 'error');
    }
  };

  return (
    <div className={styles.stack}>
      <Card>
        <CardHeader>
          <div className={styles.headerRow}>
            <span>Muster and bank file · {titleCase(month)} {year}</span>
            {canManage && (
              <div className={styles.inline}>
                <Button variant="outline" onClick={downloadNeft}>Download NEFT</Button>
                <Button onClick={() => setConfirmApply(true)}>Apply to payslips</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <p className={styles.hint}>Apply writes overtime, commission, service-charge share, advance recovery, and statutory lines onto payslips that already exist for this month.</p>
          <DataTable loading={isLoading} empty="No attendance in this month yet, so the muster is empty.">
            <thead><tr><th>Staff</th><th>Present</th><th>Absent</th><th>Hours</th></tr></thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.staffId}>
                  <td>{row.name}</td>
                  <td>{row.presentDays}</td>
                  <td>{row.absentDays}</td>
                  <td>{row.hoursWorked}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </CardBody>
      </Card>
      <ConfirmDialog
        open={confirmApply}
        title={`Apply hospitality to ${titleCase(month)} ${year}?`}
        body="Existing payslips get hospitality lines. Advance recovery happens only once for this month."
        confirmLabel="Apply now"
        onClose={() => setConfirmApply(false)}
        onConfirm={() => apply.mutate()}
      />
    </div>
  );
}

function StatutoryBlock({ title, enabled, onToggle, children }) {
  return (
    <div className={styles.statBlock}>
      <Switch row label={title} checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
      {enabled && <div className={styles.statFields}>{children}</div>}
    </div>
  );
}

function DataTable({ empty, loading, children }) {
  if (loading) return <p className={styles.hint}>Loading…</p>;
  const body = React.Children.toArray(children).find((child) => child?.type === 'tbody');
  const rows = body?.props?.children;
  const count = React.Children.toArray(rows).filter(Boolean).length;
  if (!count) return <p className={styles.empty}>{empty}</p>;
  return <div className={styles.tableWrap}><table className={styles.table}>{children}</table></div>;
}

function ConfirmDialog({ open, title, body, confirmLabel, danger, onClose, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      <p className={styles.hint}>{body}</p>
    </Modal>
  );
}

function StaffSelect({ staffList, value, onChange, allowEmpty }) {
  return (
    <StaffPicker
      staffList={staffList}
      value={value}
      onChange={onChange}
      allowAll={Boolean(allowEmpty)}
      allValue=""
      allLabel="All staff"
      placeholder={allowEmpty ? 'All staff' : 'Search staff'}
    />
  );
}

function nameOf(staffList, staffId) {
  if (staffId == null || staffId === '') return '—';
  const staff = staffList.find((item) => String(item.id) === String(staffId));
  return staff ? `${staff.firstName} ${staff.lastName}` : `Staff ${staffId}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function titleCase(value) {
  return String(value || '').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function monthRange(month, year) {
  const index = Math.max(MONTHS.indexOf(month), 0);
  const last = new Date(year, index + 1, 0).getDate();
  const pad = (value) => String(value).padStart(2, '0');
  return { from: `${year}-${pad(index + 1)}-01`, to: `${year}-${pad(index + 1)}-${pad(last)}` };
}

function parseSalesImport(text, staffList) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) throw new Error('JSON must be an array of sales rows.');
    return rows;
  }
  return raw.split(/\n+/).map((line) => {
    const [staffPart, saleDate, category, amount] = line.split(',').map((part) => part.trim());
    const byId = staffList.find((staff) => String(staff.id) === staffPart);
    const byName = staffList.find((staff) => `${staff.firstName} ${staff.lastName}`.toLowerCase() === staffPart.toLowerCase());
    const staff = byId || byName;
    if (!staff || !saleDate || !amount) return null;
    return { staffId: Number(staff.id), saleDate, category: (category || 'SERVICE').toUpperCase(), amount: Number(amount) };
  }).filter(Boolean);
}
