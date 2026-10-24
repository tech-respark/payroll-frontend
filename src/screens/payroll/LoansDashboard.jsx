import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../api/apiService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useStaffList } from '../../hooks/queries';
import { Badge, Button, Card, CardBody, CardHeader, Drawer, Input, StaffPicker } from '../../components/ui';
import { prettyStatus, staffNameById } from '../../helpers/displayUtils';
import { PAY_MONTH_KEYS, previousPayPeriod } from '../../helpers/periodState';
import { usePageHelp } from '../../context/PageHelpContext';
import styles from '../HospitalityDashboard.module.scss';

const MONTHS = PAY_MONTH_KEYS;
const unwrap = (res) => res?.data ?? res ?? [];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const LoansDashboard = () => {
  const { tenantId, storeId, hasAccess } = useAuth();
  const { showToast } = useToast();
  const { staffList } = useStaffList();
  const queryClient = useQueryClient();
  const canManage = hasAccess(['MANAGE_SALARY']);
  const qs = `tenantId=${tenantId}&storeId=${storeId}`;
  const lastPeriod = previousPayPeriod();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ staffId: '', principal: '', installmentAmount: '', remainingInstallments: 6, startMonth: lastPeriod.month, startYear: lastPeriod.year, referenceNumber: '', remarks: '' });
  usePageHelp('Record a loan or EMI. Recovery starts in the start month you choose, then continues on each calculated pay run until the balance is closed.');

  const query = useQuery({ queryKey: ['payroll-loans', qs], queryFn: async () => unwrap(await apiService.get(`/payroll/loans?${qs}`)) });
  const save = useMutation({
    mutationFn: () => apiService.post(`/payroll/loans?${qs}`, { ...form, staffId: Number(form.staffId), principal: Number(form.principal), installmentAmount: Number(form.installmentAmount || form.principal) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-loans'] }); setOpen(false); showToast('Loan created.', 'success'); },
    onError: (err) => showToast(err.message || 'Could not create the loan.', 'error'),
  });
  const close = useMutation({
    mutationFn: (id) => apiService.post(`/payroll/loans/${id}/close?${qs}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-loans'] }); showToast('Loan closed.', 'success'); },
    onError: (err) => showToast(err.message || 'Could not close the loan.', 'error'),
  });
  const rows = Array.isArray(query.data) ? query.data : [];

  return (
    <div className={styles.page}>
      <Card>
        <CardHeader>
          <span>Loans and EMI</span>
          {canManage && <Button onClick={() => setOpen(true)}>New loan</Button>}
        </CardHeader>
        <CardBody>
          {rows.length === 0 ? <p className={styles.empty}>No loans yet.</p> : (
            <table className={styles.table}>
              <thead><tr><th>Staff</th><th>Principal</th><th>EMI</th><th>Outstanding</th><th>Status</th>{canManage && <th></th>}</tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{staffNameById(staffList, row.staffId)}</td>
                    <td>{money(row.principal)}</td>
                    <td>{money(row.installmentAmount)}</td>
                    <td>{money(row.outstandingBalance)}</td>
                    <td><Badge>{prettyStatus(row.status)}</Badge></td>
                    {canManage && row.status === 'ACTIVE' && (
                      <td><Button variant="outline" onClick={() => close.mutate(row.id)}>Close</Button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
      <Drawer open={open} onClose={() => setOpen(false)} title="New loan">
        <StaffPicker staffList={staffList} value={form.staffId} onChange={(id) => setForm((p) => ({ ...p, staffId: id }))} />
        <Input label="Principal" type="number" value={form.principal} onChange={(e) => setForm((p) => ({ ...p, principal: e.target.value }))} />
        <Input label="EMI" type="number" value={form.installmentAmount} onChange={(e) => setForm((p) => ({ ...p, installmentAmount: e.target.value }))} />
        <Input label="Installments" type="number" value={form.remainingInstallments} onChange={(e) => setForm((p) => ({ ...p, remainingInstallments: Number(e.target.value) }))} />
        <label className={styles.label}>Start month
          <select className={styles.select} value={form.startMonth} onChange={(e) => setForm((p) => ({ ...p, startMonth: e.target.value }))}>
            {MONTHS.map((item) => <option key={item} value={item}>{item[0] + item.slice(1).toLowerCase()}</option>)}
          </select>
        </label>
        <Input label="Start year" type="number" value={form.startYear} onChange={(e) => setForm((p) => ({ ...p, startYear: Number(e.target.value) }))} />
        <Input label="Reference" value={form.referenceNumber} onChange={(e) => setForm((p) => ({ ...p, referenceNumber: e.target.value }))} />
        <Button onClick={() => save.mutate()}>Save</Button>
      </Drawer>
    </div>
  );
};

export default LoansDashboard;
