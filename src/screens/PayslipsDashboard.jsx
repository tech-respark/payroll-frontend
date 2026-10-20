import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useStaffList, useStoreConfig } from '../hooks/queries';
import PayslipBill from '../components/PayslipBill';
import { StaffPicker } from '../components/ui';
import { formatDisplayDate } from '../helpers/displayUtils';
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
  const { staffList } = useStaffList();

  useEffect(() => {
    if (staffList.length > 0 && !selectedStaffId) {
      const me = staffList.find(s => {
        if (user?.staffId && String(s.id) === String(user.staffId)) return true;
        if (user?.id && String(s.id) === String(user.id)) return true;
        if (user?.username && s.username && String(s.username).toLowerCase() === String(user.username).toLowerCase()) return true;
        if (user?.email && s.email && String(s.email).toLowerCase() === String(user.email).toLowerCase()) return true;
        return false;
      });
      setSelectedStaffId(me ? String(me.id) : String(staffList[0].id));
    }
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
        showToast('Failed to generate payslip or no data found.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating payslip.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRecentMonth = () => storeConfig?.recentSummaryCalculatedMonth || currentMonthIndex + 1;

  const getFinancialYearMonths = () => {
    const startMonth = storeConfig?.financialYearStartMonth || 4; // Default April
    const months = [];
    for (let i = 0; i < 12; i++) {
      const idx = (startMonth - 1 + i) % 12;
      months.push(MONTHS[idx]);
    }
    return months;
  };

  const isYearDisabled = (y) => {
    if (storeConfig && storeConfig.payrollLockedUpToDate) {
      const lockDate = new Date(storeConfig.payrollLockedUpToDate);
      return y > lockDate.getFullYear();
    }
    return y > currentYear; // Cannot generate for future years
  };

  const isMonthDisabled = (mName, selYear) => {
    const mIndex = MONTHS.indexOf(mName);
    if (storeConfig && storeConfig.payrollLockedUpToDate) {
      const lockDate = new Date(storeConfig.payrollLockedUpToDate);
      if (selYear > lockDate.getFullYear()) return true;
      if (selYear === lockDate.getFullYear()) {
        return mIndex > lockDate.getMonth();
      }
      return false;
    }
    if (selYear > currentYear) return true;
    if (selYear < currentYear) return false;
    return mIndex + 1 > getRecentMonth();
  };

  const isSelectionLocked = () => {
    return isMonthDisabled(selectedMonth, selectedYear);
  };

  const generateDisabled = loading || !selectedStaffId || isSelectionLocked();

  return (
    <div className="dashboard">
      <p className="screenIntro">Preview a stored payslip for one person and one calculated month.</p>
      <div className={`no-print ${styles.payrollCard}`}>
        <div className={`filter-bar ${styles.filterBar}`}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Month</label>
            <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setPayslipData(null); }} className={styles.formSelect}>
              {getFinancialYearMonths().map((m) => (
                <option key={m} value={m} disabled={isMonthDisabled(m, selectedYear)}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Year</label>
            <select value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setPayslipData(null); }} className={styles.formSelect}>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y} disabled={isYearDisabled(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroupLarge}>
            {staffList.length === 1 ? (
              <>
                <label className={styles.formLabel}>Staff</label>
                <div className={styles.staffReadOnly}>
                  {staffList[0].firstName} {staffList[0].lastName}
                </div>
              </>
            ) : (
              <StaffPicker
                label="Staff"
                staffList={staffList}
                value={selectedStaffId}
                onChange={(id) => { setSelectedStaffId(id); setPayslipData(null); }}
                placeholder="Search staff"
              />
            )}
          </div>
          <div className={styles.generateBtnContainer}>
            <button className={`btn btn-primary ${styles.generateBtn} ${generateDisabled ? styles.generateBtnDisabled : ''}`} onClick={handleGenerate} disabled={generateDisabled}>
              {loading ? 'Generating…' : 'Generate payslip'}
            </button>
          </div>
        </div>

        {isSelectionLocked() && (
          <p className="screenHint">
            {storeConfig?.payrollLockedUpToDate
              ? `Payroll is locked through ${formatDisplayDate(storeConfig.payrollLockedUpToDate)}. Choose an earlier month to generate.`
              : `${selectedMonth} ${selectedYear} has not been calculated yet, so a payslip cannot be generated.`}
          </p>
        )}

        {payslipData ? (
          <div className={styles.payslipWrapper}>
            <PayslipBill payslipData={payslipData} payslipMonth={selectedMonth} storeConfig={storeConfig} />
          </div>
        ) : !loading ? (
          <div className={styles.emptyState}>
            <LuFileText size={32} aria-hidden="true" />
            <p className={styles.emptyStateTitle}>No payslip yet</p>
            <p className={styles.emptyStateHint}>Choose a calculated month, year, and person, then generate to preview it here.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PayslipsDashboard;
