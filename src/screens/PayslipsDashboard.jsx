import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useStaffList, useStoreConfig } from '../hooks/queries';
import PayslipBill from '../components/PayslipBill';
import { Button, StaffPicker } from '../components/ui';
import { periodState } from '../helpers/periodState';
import { LuFileText } from 'react-icons/lu';
import styles from './PayslipsDashboard.module.scss';
import '../styles/main.scss';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PayslipsDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();


  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() - 1);
  const defaultMonthIndex = defaultDate.getMonth();
  const defaultYear = defaultDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[defaultMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loading, setLoading] = useState(false);

  const [payslipData, setPayslipData] = useState(null);
  const { storeConfig } = useStoreConfig();
  const { staffList, isLoading: staffLoading } = useStaffList();

  useEffect(() => {
    if (selectedStaffId) return;
    if (staffList.length > 0) {
      const me = staffList.find(s => {
        if (user?.staffId && String(s.id) === String(user.staffId)) return true;
        if (user?.id && String(s.id) === String(user.id)) return true;
        if (user?.username && s.username && String(s.username).toLowerCase() === String(user.username).toLowerCase()) return true;
        if (user?.email && s.email && String(s.email).toLowerCase() === String(user.email).toLowerCase()) return true;
        return false;
      });
      setSelectedStaffId(me ? String(me.id) : String(staffList[0].id));
      return;
    }
    if (user?.staffId) setSelectedStaffId(String(user.staffId));
  }, [staffList, selectedStaffId, user]);

  const handleGenerate = async () => {
    if (!selectedStaffId) return;
    setLoading(true);
    setPayslipData(null);
    try {
      const res = await apiService.get(`/getPayslipData?staffId=${selectedStaffId}&month=${selectedMonth}&year=${selectedYear}&tenantId=${tenantId}&storeId=${storeId}`);
      if (res.data) {
        setPayslipData(res.data);
      } else {
        showToast(res.message || 'No payslip has been saved for this person and month.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not load the payslip. Try again or ask payroll for help.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const monthState = (mName, selYear) => periodState({
    year: selYear,
    monthNumber: MONTHS.indexOf(mName) + 1,
    payrollLockedUpToDate: storeConfig?.payrollLockedUpToDate,
    recentSummaryCalculatedMonth: storeConfig?.recentSummaryCalculatedMonth,
  });

  const getFinancialYearMonths = () => {
    const startMonth = storeConfig?.financialYearStartMonth || 4; // Default April
    const months = [];
    for (let i = 0; i < 12; i++) {
      const idx = (startMonth - 1 + i) % 12;
      months.push(MONTHS[idx]);
    }
    return months;
  };

  const isYearDisabled = (y) => y > currentYear;

  const isMonthDisabled = (mName, selYear) => !monthState(mName, selYear).canRead;

  const selectionState = monthState(selectedMonth, selectedYear);
  const generateDisabled = loading || !selectedStaffId || !selectionState.canRead;
  const canPickStaff = hasAccess(['VIEW_OTHER_STAFF', 'MANAGE_STAFF']);
  const canViewOthers = canPickStaff && (staffLoading || staffList.length > 1);

  return (
    <div className="dashboard">
      <div className={`no-print ${styles.payrollCard}`}>
        <div className={styles.toolbar}>
          <h3 className={styles.toolbarTitle}>Payslip</h3>
          <div className={styles.headerControls}>
            {canViewOthers && (
              <StaffPicker
                label=""
                className={styles.headerStaff}
                staffList={staffList}
                value={selectedStaffId}
                onChange={(id) => { setSelectedStaffId(id); setPayslipData(null); }}
                placeholder="Search staff"
                ariaLabel="Staff"
              />
            )}
            <select
              value={selectedMonth}
              onChange={e => { setSelectedMonth(e.target.value); setPayslipData(null); }}
              className={styles.headerSelect}
              aria-label="Month"
            >
              {getFinancialYearMonths().map((m) => (
                <option key={m} value={m} disabled={isMonthDisabled(m, selectedYear)}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => { setSelectedYear(Number(e.target.value)); setPayslipData(null); }}
              className={styles.headerSelect}
              aria-label="Year"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y} disabled={isYearDisabled(y)}>
                  {y}
                </option>
              ))}
            </select>
            <Button onClick={handleGenerate} disabled={generateDisabled}>
              {loading ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </div>

        {!selectionState.canRead && selectionState.readReason && (
          <p className="screenHint">{selectionState.readReason}</p>
        )}

        {payslipData ? (
          <div className={styles.payslipWrapper}>
            <PayslipBill payslipData={payslipData} payslipMonth={selectedMonth} storeConfig={storeConfig} />
          </div>
        ) : !loading ? (
          <div className={styles.emptyState}>
            <LuFileText size={32} aria-hidden="true" />
            <p className={styles.emptyStateTitle}>No payslip yet</p>
            <p className={styles.emptyStateHint}>
              {canPickStaff
                ? 'Choose a calculated month, year, and person, then generate to preview it here.'
                : 'Choose a calculated month, then generate to preview it here.'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PayslipsDashboard;
