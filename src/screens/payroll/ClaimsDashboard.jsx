import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../api/apiService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useStaffList } from '../../hooks/queries';
import { Badge, Button, Card, CardBody, CardHeader, Drawer, Input, Radio, StaffPicker } from '../../components/ui';
import { prettyStatus, staffNameById } from '../../helpers/displayUtils';
import { PAY_MONTH_KEYS, previousPayPeriod } from '../../helpers/periodState';
import { usePageHelp } from '../../context/PageHelpContext';
import styles from '../HospitalityDashboard.module.scss';

const MONTHS = PAY_MONTH_KEYS;
const unwrap = (res) => res?.data ?? res ?? [];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const ClaimsDashboard = () => {
  const { tenantId, storeId, hasAccess, user } = useAuth();
  const { showToast } = useToast();
  const { staffList } = useStaffList();
  const queryClient = useQueryClient();
  const canManage = hasAccess(['MANAGE_SALARY']);
  const qs = `tenantId=${tenantId}&storeId=${storeId}`;
  const [tab, setTab] = useState('claims');
  const [open, setOpen] = useState(false);
  const now = new Date();
  const lastPeriod = previousPayPeriod();
  const [claim, setClaim] = useState({ category: 'FUEL', amount: '', salaryMonth: lastPeriod.month, salaryYear: lastPeriod.year, receiptNote: '', staffId: user?.staffId });
  const [declaration, setDeclaration] = useState({ financialYear: `${now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1}-${now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear()}`, regime: 'OLD', section80c: '', hra: '', otherExemption: '', proofNote: '' });
  usePageHelp(tab === 'claims'
    ? 'Submit a reimbursement with a receipt note. Choose the pay month the claim should land on. Approved claims are added when that period is calculated.'
    : 'Declare 80C, HRA, and other exemptions. Choose Old or New regime. Approved totals reduce TDS on later pay runs.');

  const claims = useQuery({ queryKey: ['payroll-claims', qs], queryFn: async () => unwrap(await apiService.get(`/payroll/claims?${qs}`)) });
  const declarations = useQuery({ queryKey: ['payroll-declarations', qs], queryFn: async () => unwrap(await apiService.get(`/payroll/declarations?${qs}`)) });

  const saveClaim = useMutation({
    mutationFn: () => apiService.post(`/payroll/claims?${qs}`, { ...claim, amount: Number(claim.amount), staffId: Number(claim.staffId || user?.staffId) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-claims'] }); setOpen(false); showToast('Claim submitted.', 'success'); },
    onError: (err) => showToast(err.message || 'Could not submit the claim.', 'error'),
  });
  const saveDeclaration = useMutation({
    mutationFn: () => apiService.post(`/payroll/declarations?${qs}`, {
      ...declaration,
      staffId: Number(declaration.staffId || user?.staffId),
      section80c: Number(declaration.section80c || 0),
      hra: Number(declaration.hra || 0),
      otherExemption: Number(declaration.otherExemption || 0),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-declarations'] }); setOpen(false); showToast('Declaration submitted.', 'success'); },
    onError: (err) => showToast(err.message || 'Could not submit the declaration.', 'error'),
  });
  const decide = useMutation({
    mutationFn: ({ kind, id, approved }) => apiService.post(`/payroll/${kind}/${id}/decide?${qs}`, { approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-claims'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-declarations'] });
      showToast('Decision saved.', 'success');
    },
    onError: (err) => showToast(err.message || 'Could not decide.', 'error'),
  });

  const rows = tab === 'claims' ? (Array.isArray(claims.data) ? claims.data : []) : (Array.isArray(declarations.data) ? declarations.data : []);

  return (
    <div className={styles.page}>
      <div className={styles.tabs} role="tablist">
        <button type="button" className={tab === 'claims' ? styles.tabActive : styles.tab} onClick={() => setTab('claims')}>Reimbursements</button>
        <button type="button" className={tab === 'declarations' ? styles.tabActive : styles.tab} onClick={() => setTab('declarations')}>IT declarations</button>
      </div>
      <Card>
        <CardHeader>
          <span>{tab === 'claims' ? 'Claims' : 'Declarations'}</span>
          <Button onClick={() => setOpen(true)}>{tab === 'claims' ? 'New claim' : 'New declaration'}</Button>
        </CardHeader>
        <CardBody>
          {rows.length === 0 ? <p className={styles.empty}>Nothing submitted yet.</p> : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>{tab === 'claims' ? 'Category' : 'FY'}</th>
                  <th>Amount</th>
                  <th>Status</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{staffNameById(staffList, row.staffId)}</td>
                    <td>{tab === 'claims' ? row.category : row.financialYear}</td>
                    <td>{money(tab === 'claims' ? row.amount : row.declaredTotal)}</td>
                    <td><Badge>{prettyStatus(row.status)}</Badge></td>
                    {canManage && row.status === 'PENDING' && (
                      <td>
                        <Button variant="outline" onClick={() => decide.mutate({ kind: tab, id: row.id, approved: true })}>Approve</Button>
                        <Button variant="text" onClick={() => decide.mutate({ kind: tab, id: row.id, approved: false })}>Reject</Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
      <Drawer open={open} onClose={() => setOpen(false)} title={tab === 'claims' ? 'New claim' : 'New declaration'}>
        {tab === 'claims' ? (
          <>
            {canManage && <StaffPicker staffList={staffList} value={claim.staffId} onChange={(id) => setClaim((p) => ({ ...p, staffId: id }))} />}
            <label className={styles.label}>Category
              <select className={styles.select} value={claim.category} onChange={(e) => setClaim((p) => ({ ...p, category: e.target.value }))}>
                <option value="FUEL">Fuel</option>
                <option value="TRAVEL">Travel</option>
                <option value="INTERNET">Internet</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <Input label="Amount" type="number" value={claim.amount} onChange={(e) => setClaim((p) => ({ ...p, amount: e.target.value }))} />
            <label className={styles.label}>Pay month
              <select className={styles.select} value={claim.salaryMonth} onChange={(e) => setClaim((p) => ({ ...p, salaryMonth: e.target.value }))}>
                {MONTHS.map((item) => <option key={item} value={item}>{item[0] + item.slice(1).toLowerCase()}</option>)}
              </select>
            </label>
            <Input label="Pay year" type="number" value={claim.salaryYear} onChange={(e) => setClaim((p) => ({ ...p, salaryYear: Number(e.target.value) }))} />
            <Input label="Receipt note" value={claim.receiptNote} onChange={(e) => setClaim((p) => ({ ...p, receiptNote: e.target.value }))} />
            <Button onClick={() => saveClaim.mutate()}>Submit</Button>
          </>
        ) : (
          <>
            {canManage && <StaffPicker staffList={staffList} value={declaration.staffId || ''} onChange={(id) => setDeclaration((p) => ({ ...p, staffId: id }))} />}
            <Input label="Financial year" value={declaration.financialYear} onChange={(e) => setDeclaration((p) => ({ ...p, financialYear: e.target.value }))} />
            <Radio name="regime" value="OLD" label="Old regime" checked={declaration.regime === 'OLD'} onChange={() => setDeclaration((p) => ({ ...p, regime: 'OLD' }))} />
            <Radio name="regime" value="NEW" label="New regime" checked={declaration.regime === 'NEW'} onChange={() => setDeclaration((p) => ({ ...p, regime: 'NEW' }))} />
            <Input label="80C" type="number" value={declaration.section80c} onChange={(e) => setDeclaration((p) => ({ ...p, section80c: e.target.value }))} />
            <Input label="HRA" type="number" value={declaration.hra} onChange={(e) => setDeclaration((p) => ({ ...p, hra: e.target.value }))} />
            <Input label="Other exemption" type="number" value={declaration.otherExemption} onChange={(e) => setDeclaration((p) => ({ ...p, otherExemption: e.target.value }))} />
            <Input label="Proof note" value={declaration.proofNote} onChange={(e) => setDeclaration((p) => ({ ...p, proofNote: e.target.value }))} />
            <Button onClick={() => saveDeclaration.mutate()}>Submit</Button>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default ClaimsDashboard;
