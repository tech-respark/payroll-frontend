import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../api/apiService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useStaffList } from '../../hooks/queries';
import { Badge, Button, Card, CardBody, CardHeader, Drawer, Input, StaffPicker, Switch } from '../../components/ui';
import { prettyStatus, staffNameById } from '../../helpers/displayUtils';
import { PAY_MONTH_KEYS, previousPayPeriod } from '../../helpers/periodState';
import { usePageHelp } from '../../context/PageHelpContext';
import styles from '../HospitalityDashboard.module.scss';

const MONTHS = PAY_MONTH_KEYS;
const TABS = [
  { id: 'run', label: 'Pay run', hint: 'Calculate the month, skip people who should not be paid, then submit, approve, publish, and lock.' },
  { id: 'statutory', label: 'Statutory', hint: 'Store PF, ESI, PT, TDS, and LWF rates. Staff flags on the profile decide who they apply to.' },
  { id: 'revisions', label: 'Revisions', hint: 'Record an effective-date salary change. Amounts on Salary Management still drive the next run.' },
  { id: 'filings', label: 'Filings', hint: 'Download ready-to-file worksheets. These are payroll files, not government submissions.' },
  { id: 'logo', label: 'Payslip logo', hint: 'Upload the company mark used on the letterhead payslip and PDF.' },
];

const unwrap = (res) => res?.data ?? res ?? [];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const pretty = (value) => ({
  REGULAR: 'Regular', OFF_CYCLE: 'Off-cycle',
}[value] || prettyStatus(value));

const PayRunDashboard = () => {
  const { tenantId, storeId, hasAccess } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { staffList } = useStaffList();
  const canManage = hasAccess(['MANAGE_SALARY']);
  const qs = `tenantId=${tenantId}&storeId=${storeId}`;
  const lastPeriod = previousPayPeriod();
  const [tab, setTab] = useState('run');
  const [month, setMonth] = useState(lastPeriod.month);
  const [year, setYear] = useState(lastPeriod.year);
  const [cycleType, setCycleType] = useState('REGULAR');
  const currentTab = TABS.find((item) => item.id === tab);
  usePageHelp(currentTab?.hint);

  const open = useMutation({
    mutationFn: () => apiService.post(`/payroll/runs?${qs}`, { month, year, cycleType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pay-run'] }),
    onError: (err) => showToast(err.message || 'Could not open the pay run.', 'error'),
  });

  const runQuery = useQuery({
    queryKey: ['pay-run', tenantId, storeId, month, year, cycleType],
    queryFn: async () => {
      const res = await apiService.get(`/payroll/runs?${qs}&month=${month}&year=${year}&cycleType=${cycleType}`);
      return unwrap(res);
    },
    enabled: Boolean(tenantId && storeId),
  });
  const run = runQuery.data || {};

  const act = (path, body) => apiService.post(`/payroll/runs/${run.id}/${path}?${qs}`, body || {});
  const action = useMutation({
    mutationFn: ({ path, body }) => act(path, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-run'] });
      showToast('Pay run updated.', 'success');
    },
    onError: (err) => showToast(err.message || 'Could not update the pay run.', 'error'),
  });

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist">
          {TABS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id}
              className={tab === item.id ? styles.tabActive : styles.tab} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.period}>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map((item) => <option key={item} value={item}>{item[0] + item.slice(1).toLowerCase()}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <select value={cycleType} onChange={(e) => setCycleType(e.target.value)}>
            <option value="REGULAR">Regular</option>
            <option value="OFF_CYCLE">Off-cycle</option>
          </select>
        </div>
      </div>
      {tab === 'run' && (
        <RunTab run={run} loading={runQuery.isLoading} canManage={canManage} staffList={staffList}
          opening={open.isPending} onOpen={() => open.mutate()} onRefresh={() => runQuery.refetch()}
          onAction={(path, body) => action.mutate({ path, body })} />
      )}
      {tab === 'statutory' && <StatutoryTab qs={qs} canManage={canManage} />}
      {tab === 'revisions' && <RevisionsTab qs={qs} canManage={canManage} staffList={staffList} month={month} year={year} />}
      {tab === 'filings' && <FilingsTab qs={qs} month={month} year={year} staffList={staffList} />}
      {tab === 'logo' && <LogoTab qs={qs} canManage={canManage} />}
    </div>
  );
};

const RunTab = ({ run, loading, canManage, staffList, opening, onOpen, onRefresh, onAction }) => {
  const [skipStaff, setSkipStaff] = useState('');
  const [reason, setReason] = useState('');
  const closed = ['APPROVED', 'PUBLISHED', 'LOCKED'].includes(run.status);
  if (loading) return <p className={styles.hint}>Loading this period…</p>;
  const steps = [
    { label: 'Period opened', done: Boolean(run.id) },
    { label: 'Calculate finished', done: Number(run.calculatedCount || 0) > 0 || ['CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'LOCKED'].includes(run.status) },
    { label: 'Submitted for approval', done: ['PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'LOCKED'].includes(run.status) },
    { label: 'Approved', done: ['APPROVED', 'PUBLISHED', 'LOCKED'].includes(run.status) },
    { label: 'Published / locked', done: ['PUBLISHED', 'LOCKED'].includes(run.status) },
  ];
  return (
    <div className={styles.stack}>
      <Card>
        <CardHeader>Period workspace</CardHeader>
        <CardBody>
          <p className={styles.hint}>
            Calculate this month, skip anyone who should not be paid, then submit, approve, publish, and lock.
          </p>
          <ol className={styles.checklist}>
            {steps.map((step) => (
              <li key={step.label} className={step.done ? styles.stepDone : styles.step}>
                <span className={styles.stepMark}>{step.done ? 'Done' : 'Next'}</span>
                {step.label}
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <span>{pretty(run.cycleType)} · {pretty(run.status)}</span>
        </CardHeader>
        <CardBody>
          <p className={styles.hint}>{run.calculatedCount || 0} calculated · {run.skippedCount || 0} skipped · {run.staffCount || 0} on the store list.</p>
          {canManage && (
            <div className={styles.actionRow}>
              {!run.id && <Button onClick={onOpen} disabled={opening}>{opening ? 'Opening…' : 'Open this period'}</Button>}
              {run.id && <Button variant="outline" onClick={onRefresh}>Refresh</Button>}
              <Button onClick={() => onAction('calculate')} disabled={closed || !run.id}>Calculate</Button>
              <Button variant="outline" onClick={() => onAction('submit')} disabled={run.status !== 'CALCULATED'}>Submit</Button>
              <Button variant="outline" onClick={() => onAction('approve')} disabled={run.status !== 'PENDING_APPROVAL'}>Approve</Button>
              <Button variant="outline" onClick={() => onAction('publish')} disabled={run.status !== 'APPROVED'}>Publish</Button>
              <Button variant="outline" onClick={() => onAction('lock')} disabled={!['APPROVED', 'PUBLISHED'].includes(run.status)}>Lock</Button>
            </div>
          )}
        </CardBody>
      </Card>
      {canManage && run.id && (
        <Card>
          <CardHeader>Skip a person this cycle</CardHeader>
          <CardBody>
            <div className={styles.skipRow}>
              <StaffPicker staffList={staffList} value={skipStaff} onChange={setSkipStaff} placeholder="Search staff" />
              <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button onClick={() => onAction('skip', { staffId: Number(skipStaff), reason })} disabled={!skipStaff || closed}>Skip</Button>
            </div>
            <p className={styles.hint}>Skip, then Calculate again so the person drops out of this cycle.</p>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardHeader>Lines</CardHeader>
        <CardBody>
          {(run.lines || []).length === 0 ? <p className={styles.empty}>Calculate the run to see nets.</p> : (
            <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Earnings</th><th>Deductions</th><th>Net</th></tr></thead>
              <tbody>
                {(run.lines || []).map((row) => (
                  <tr key={row.staffId}>
                    <td>{row.name || staffNameById(staffList, row.staffId)} {row.skipped ? <Badge>Skipped</Badge> : null}</td>
                    <td>{money(row.earnings)}</td>
                    <td>{money(row.deductions)}</td>
                    <td>{money(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          {(run.skips || []).length > 0 && (
            <p className={styles.hint}>Skipped: {(run.skips || []).map((s) => staffNameById(staffList, s.staffId)).join(', ')}</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

const StatutoryTab = ({ qs, canManage }) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['payroll-statutory', qs],
    queryFn: async () => unwrap(await apiService.get(`/payroll/statutory?${qs}`)),
  });
  const [form, setForm] = useState(null);
  const data = form || query.data || {};
  const set = (name, value) => setForm((prev) => ({ ...(prev || query.data || {}), [name]: value }));
  const save = useMutation({
    mutationFn: () => apiService.put(`/payroll/statutory?${qs}`, {
      ...data,
      pfWageCeiling: Number(data.pfWageCeiling),
      esiWageCeiling: Number(data.esiWageCeiling),
      pfEmployeeRate: Number(data.pfEmployeeRate),
      pfEmployerRate: Number(data.pfEmployerRate),
      esiEmployeeRate: Number(data.esiEmployeeRate),
      esiEmployerRate: Number(data.esiEmployerRate),
      ptAmount: Number(data.ptAmount),
      lwfEmployeeAmount: Number(data.lwfEmployeeAmount),
      tdsRate: Number(data.tdsRate),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-statutory'] }); showToast('Statutory rates saved.', 'success'); },
    onError: (err) => showToast(err.message || 'Could not save statutory rates.', 'error'),
  });
  return (
    <Card>
      <CardHeader>India statutory rates</CardHeader>
      <CardBody>
        <p className={styles.hint}>Employee-wise eligibility lives on the staff record. This screen is the store policy.</p>
        <div className={styles.stack}>
          <Switch row label="PF" checked={data.pfEnabled !== false} onChange={(e) => set('pfEnabled', e.target.checked)} />
          <Switch row label="ESI" checked={data.esiEnabled !== false} onChange={(e) => set('esiEnabled', e.target.checked)} />
          <Switch row label="Professional tax" checked={data.ptEnabled !== false} onChange={(e) => set('ptEnabled', e.target.checked)} />
          <Switch row label="TDS" checked={Boolean(data.tdsEnabled)} onChange={(e) => set('tdsEnabled', e.target.checked)} />
          <Switch row label="LWF" checked={Boolean(data.lwfEnabled)} onChange={(e) => set('lwfEnabled', e.target.checked)} />
          <Input label="PF wage ceiling" type="number" value={data.pfWageCeiling ?? 15000} onChange={(e) => set('pfWageCeiling', e.target.value)} />
          <Input label="ESI wage ceiling" type="number" value={data.esiWageCeiling ?? 21000} onChange={(e) => set('esiWageCeiling', e.target.value)} />
          <Input label="PF employee %" type="number" value={data.pfEmployeeRate ?? 12} onChange={(e) => set('pfEmployeeRate', e.target.value)} />
          <Input label="PF employer %" type="number" value={data.pfEmployerRate ?? 12} onChange={(e) => set('pfEmployerRate', e.target.value)} />
          <Input label="ESI employee %" type="number" value={data.esiEmployeeRate ?? 0.75} onChange={(e) => set('esiEmployeeRate', e.target.value)} />
          <Input label="ESI employer %" type="number" value={data.esiEmployerRate ?? 3.25} onChange={(e) => set('esiEmployerRate', e.target.value)} />
          <Input label="PT amount" type="number" value={data.ptAmount ?? 200} onChange={(e) => set('ptAmount', e.target.value)} />
          <Input label="LWF employee" type="number" value={data.lwfEmployeeAmount ?? 10} onChange={(e) => set('lwfEmployeeAmount', e.target.value)} />
          <Input label="TDS %" type="number" value={data.tdsRate ?? 0} onChange={(e) => set('tdsRate', e.target.value)} />
          {canManage && <Button onClick={() => save.mutate()} disabled={save.isPending}>Save rates</Button>}
        </div>
      </CardBody>
    </Card>
  );
};

const RevisionsTab = ({ qs, canManage, staffList, month, year }) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ staffId: '', previousAmount: '', newAmount: '', notes: '', effectiveMonth: month, effectiveYear: year });
  const query = useQuery({
    queryKey: ['payroll-revisions', qs],
    queryFn: async () => unwrap(await apiService.get(`/payroll/revisions?${qs}`)),
  });
  const save = useMutation({
    mutationFn: () => apiService.post(`/payroll/revisions?${qs}`, {
      ...form,
      staffId: Number(form.staffId),
      previousAmount: Number(form.previousAmount || 0),
      newAmount: Number(form.newAmount),
      effectiveMonth: form.effectiveMonth || month,
      effectiveYear: Number(form.effectiveYear || year),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-revisions'] }); setOpen(false); showToast('Revision recorded.', 'success'); },
    onError: (err) => showToast(err.message || 'Could not save the revision.', 'error'),
  });
  const rows = Array.isArray(query.data) ? query.data : [];
  return (
    <Card>
        <CardHeader>
        <span>Salary revisions</span>
        {canManage && <Button onClick={() => setOpen(true)}>Record revision</Button>}
      </CardHeader>
      <CardBody>
        {rows.length === 0 ? <p className={styles.empty}>No revisions yet.</p> : (
          <table className={styles.table}>
            <thead><tr><th>Staff</th><th>From</th><th>To</th><th>Effective</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{staffNameById(staffList, row.staffId)}</td>
                  <td>{money(row.previousAmount)}</td>
                  <td>{money(row.newAmount)}</td>
                  <td>{row.effectiveMonth} {row.effectiveYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardBody>
      <Drawer open={open} onClose={() => setOpen(false)} title="Salary revision">
        <StaffPicker staffList={staffList} value={form.staffId} onChange={(id) => setForm((p) => ({ ...p, staffId: id }))} />
        <Input label="Previous amount" type="number" value={form.previousAmount} onChange={(e) => setForm((p) => ({ ...p, previousAmount: e.target.value }))} />
        <Input label="New amount" type="number" value={form.newAmount} onChange={(e) => setForm((p) => ({ ...p, newAmount: e.target.value }))} />
        <Input label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        <Button onClick={() => save.mutate()}>Save</Button>
      </Drawer>
    </Card>
  );
};

const FilingsTab = ({ qs, month, year, staffList }) => {
  const { showToast } = useToast();
  const [staffId, setStaffId] = useState('');
  const download = async (kind) => {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch(`/payroll-management/v1/payroll/filings/${kind}?${qs}&month=${month}&year=${year}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${kind}-${month}-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const form16 = async () => {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch(`/payroll-management/v1/payroll/form16?${qs}&staffId=${staffId}&year=${year}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `form16-${staffId}-${year}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card>
      <CardHeader>Filing worksheets</CardHeader>
      <CardBody>
        <div className={styles.toolbar}>
          <Button variant="outline" onClick={() => download('pf').catch((e) => showToast(e.message, 'error'))}>PF ECR</Button>
          <Button variant="outline" onClick={() => download('esi').catch((e) => showToast(e.message, 'error'))}>ESI</Button>
          <Button variant="outline" onClick={() => download('pt').catch((e) => showToast(e.message, 'error'))}>Professional tax</Button>
          <Button variant="outline" onClick={() => download('tds').catch((e) => showToast(e.message, 'error'))}>TDS</Button>
        </div>
        <StaffPicker staffList={staffList} value={staffId} onChange={setStaffId} placeholder="Staff for Form 16" />
        <Button onClick={() => form16().catch((e) => showToast(e.message, 'error'))} disabled={!staffId}>Download Form 16 worksheet</Button>
      </CardBody>
    </Card>
  );
};

const LogoTab = ({ qs, canManage }) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['payroll-logo', qs],
    queryFn: async () => unwrap(await apiService.get(`/payroll/logo?${qs}`)),
  });
  const upload = async (file) => {
    const token = localStorage.getItem('jwtToken');
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`/payroll-management/v1/payroll/logo?${qs}`, {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body,
    });
    if (!response.ok) throw new Error('Upload failed');
    queryClient.invalidateQueries({ queryKey: ['payroll-logo'] });
    showToast('Logo updated.', 'success');
  };
  return (
    <Card>
      <CardHeader>Payslip logo</CardHeader>
      <CardBody>
        {query.data?.logoPath ? <img src={query.data.logoPath} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} /> : <p className={styles.empty}>No logo yet. The company name is used instead.</p>}
        {canManage && <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0]).catch((err) => showToast(err.message, 'error'))} />}
      </CardBody>
    </Card>
  );
};

export default PayRunDashboard;
