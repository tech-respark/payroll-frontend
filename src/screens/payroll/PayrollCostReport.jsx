import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../api/apiService';
import { useAuth } from '../../context/AuthContext';
import { Card, CardBody, CardHeader } from '../../components/ui';
import { usePageHelp } from '../../context/PageHelpContext';
import styles from '../HospitalityDashboard.module.scss';

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const unwrap = (res) => res?.data ?? res ?? {};
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PayrollCostReport = () => {
  const { tenantId, storeId } = useAuth();
  const qs = `tenantId=${tenantId}&storeId=${storeId}`;
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth() === 0 ? 11 : now.getMonth() - 1]);
  const [year, setYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  usePageHelp('Earnings, deductions, net, and headcount for the selected pay period.');

  const query = useQuery({
    queryKey: ['payroll-cost', qs, month, year],
    queryFn: async () => unwrap(await apiService.get(`/payroll/cost?${qs}&month=${month}&year=${year}`)),
    enabled: Boolean(tenantId && storeId),
  });
  const data = query.data || {};
  const rows = Array.isArray(data.rows) ? data.rows : [];

  return (
    <div className={styles.page}>
      <div className={styles.period}>
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {MONTHS.map((item) => <option key={item} value={item}>{item[0] + item.slice(1).toLowerCase()}</option>)}
        </select>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </div>
      <Card>
        <CardHeader>Payroll cost</CardHeader>
        <CardBody>
          <p className={styles.hint}>{data.headcount || 0} people · Earnings {money(data.earnings)} · Deductions {money(data.deductions)} · Net {money(data.net)}</p>
          {rows.length === 0 ? <p className={styles.empty}>No payslips for this month yet. Calculate a pay run first.</p> : (
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Earnings</th><th>Deductions</th><th>Net</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.staffId}>
                    <td>{row.name || row.staffId}</td>
                    <td>{money(row.earnings)}</td>
                    <td>{money(row.deductions)}</td>
                    <td>{money(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default PayrollCostReport;
