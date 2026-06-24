import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useStaffList, useStoreConfig } from '../hooks/queries';
import PayslipBill from '../components/PayslipBill';
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
      <h2>Payslip Generation</h2>
      
      <div className="payroll-card no-print">
        <div className={`filter-bar ${styles.filterBar}`}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Payroll Month</label>
            <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setPayslipData(null); }} className={styles.formSelect}>
              {getFinancialYearMonths().map((m) => (
                <option key={m} value={m} disabled={isMonthDisabled(m, selectedYear)}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Payroll Year</label>
            <select value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setPayslipData(null); }} className={styles.formSelect}>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y} disabled={isYearDisabled(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroupLarge}>
            <label className={styles.formLabel}>Select Staff Member</label>
            {staffList.length === 1 ? (
              <div className={styles.staffReadOnly}>
                {staffList[0].firstName} {staffList[0].lastName}
              </div>
            ) : (
              <select value={selectedStaffId} onChange={e => { setSelectedStaffId(e.target.value); setPayslipData(null); }} className={styles.formSelect}>
                <option value="">-- Select Staff member --</option>
                {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</option>)}
              </select>
            )}
          </div>
          <div className={styles.generateBtnContainer}>
            <button className={`btn btn-primary ${styles.generateBtn} ${generateDisabled ? styles.generateBtnDisabled : ''}`} onClick={handleGenerate} disabled={generateDisabled}>
              {loading ? 'Generating...' : 'Generate Payslip'}
            </button>
          </div>
        </div>



        {payslipData && (
          <div className={styles.payslipWrapper}>
            <PayslipBill payslipData={payslipData} payslipMonth={selectedMonth} storeConfig={storeConfig} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PayslipsDashboard;
