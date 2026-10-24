import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../api/apiService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useStaffList } from '../../hooks/queries';
import { Badge, Button, Card, CardBody, CardHeader, Drawer, Input, StaffPicker } from '../../components/ui';
import { formatDisplayDate, prettyStatus, staffNameById } from '../../helpers/displayUtils';
import { usePageHelp } from '../../context/PageHelpContext';
import styles from '../HospitalityDashboard.module.scss';

const unwrap = (res) => res?.data ?? res ?? [];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const SettlementsDashboard = () => {
  const { tenantId, storeId, hasAccess } = useAuth();
  const { showToast } = useToast();
  const { staffList } = useStaffList();
  const queryClient = useQueryClient();
  const canManage = hasAccess(['MANAGE_SALARY']);
  const qs = `tenantId=${tenantId}&storeId=${storeId}`;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ staffId: '', lastWorkingDate: '', leaveEncashment: 0, otherDeductions: 0, remarks: '' });
  usePageHelp('Draft a leaving settlement. Settling closes open loans and marks the person inactive so they drop out of the next pay run.');

  const query = useQuery({ queryKey: ['payroll-settlements', qs], queryFn: async () => unwrap(await apiService.get(`/payroll/settlements?${qs}`)) });
  const save = useMutation({
    mutationFn: () => apiService.post(`/payroll/settlements?${qs}`, { ...form, staffId: Number(form.staffId) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-settlements'] }); setOpen(false); showToast('Draft created.', 'success'); },
    onError: (err) => showToast(err.message || 'Could not draft the settlement.', 'error'),
  });
  const settle = useMutation({
    mutationFn: (id) => apiService.post(`/payroll/settlements/${id}/settle?${qs}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-settlements'] }); showToast('Settlement closed. Staff marked inactive.', 'success'); },
    onError: (err) => showToast(err.message || 'Could not settle.', 'error'),
  });
  const rows = Array.isArray(query.data) ? query.data : [];

  return (
    <div className={styles.page}>
      <Card>
        <CardHeader>
          <span>Full and final</span>
          {canManage && <Button onClick={() => setOpen(true)}>Draft settlement</Button>}
        </CardHeader>
        <CardBody>
          {rows.length === 0 ? <p className={styles.empty}>No settlements yet.</p> : (
            <table className={styles.table}>
              <thead><tr><th>Staff</th><th>Last day</th><th>Net</th><th>Status</th>{canManage && <th></th>}</tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{staffNameById(staffList, row.staffId)}</td>
                    <td>{formatDisplayDate(row.lastWorkingDate)}</td>
                    <td>{money(row.netPayable)}</td>
                    <td><Badge>{prettyStatus(row.status)}</Badge></td>
                    {canManage && row.status === 'DRAFT' && (
                      <td><Button variant="outline" onClick={() => settle.mutate(row.id)}>Settle</Button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
      <Drawer open={open} onClose={() => setOpen(false)} title="Draft settlement">
        <StaffPicker staffList={staffList} value={form.staffId} onChange={(id) => setForm((p) => ({ ...p, staffId: id }))} />
        <Input label="Last working date" type="date" value={form.lastWorkingDate} onChange={(e) => setForm((p) => ({ ...p, lastWorkingDate: e.target.value }))} />
        <Input label="Leave encashment" type="number" value={form.leaveEncashment} onChange={(e) => setForm((p) => ({ ...p, leaveEncashment: e.target.value }))} />
        <Input label="Other deductions" type="number" value={form.otherDeductions} onChange={(e) => setForm((p) => ({ ...p, otherDeductions: e.target.value }))} />
        <Input label="Remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
        <Button onClick={() => save.mutate()}>Create draft</Button>
      </Drawer>
    </div>
  );
};

export default SettlementsDashboard;
