import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import PayslipBill from '../components/PayslipBill';
import '../styles/main.scss';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PayslipsDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  const [staffList, setStaffList] = useState([]);

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
  const [storeConfig, setStoreConfig] = useState(null);

  useEffect(() => {
    fetchStaffList();
    fetchStoreConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, storeId]);

  const fetchStoreConfig = async () => {
    try {
      const res = await apiService.get(`/tenantStoreConfig?tenantId=${tenantId}&storeId=${storeId}`);
      if (res.data) setStoreConfig(res.data);
    } catch (err) {
      console.error('Failed to fetch store config', err);
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await apiService.get(`/personnel/all?tenantId=${tenantId}&storeId=${storeId}`);
      let list = res.data || res || [];
      if (!hasAccess(['VIEW_OTHER_STAFF'])) {
        list = list.filter(s => s.id === user.personnelCode);
      }
      setStaffList(list);
    } catch (err) {
      console.error('Failed to fetch staff', err);
    }
  };

  useEffect(() => {
    if (staffList.length > 0 && !selectedStaffId) {
      const me = staffList.find(s => s.id === user.personnelCode);
      setSelectedStaffId(me ? me.id : staffList[0].id);
    }
  }, [staffList, selectedStaffId, user.personnelCode]);

  const handleGenerate = async () => {
    if (!selectedStaffId) return;
    setLoading(true);
    setPayslipData(null);
    try {
      const res = await apiService.get(`/getPayslipData?personnelCode=${selectedStaffId}&month=${selectedMonth}&year=${selectedYear}&tenantId=${tenantId}&storeId=${storeId}`);
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
        <div className="filter-bar" style={{ marginBottom: '30px' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Payroll Month</label>
            <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setPayslipData(null); }} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
              {getFinancialYearMonths().map((m) => (
                <option key={m} value={m} disabled={isMonthDisabled(m, selectedYear)}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Payroll Year</label>
            <select value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setPayslipData(null); }} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y} disabled={isYearDisabled(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Select Staff Member</label>
            {staffList.length === 1 ? (
              <div style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: '500' }}>
                {staffList[0].firstName} {staffList[0].lastName}
              </div>
            ) : (
              <select value={selectedStaffId} onChange={e => { setSelectedStaffId(e.target.value); setPayslipData(null); }} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                <option value="">-- Select Staff member --</option>
                {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1 }}>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generateDisabled} style={{ height: '40px', padding: '0 24px', width: '100%', opacity: generateDisabled ? 0.6 : 1, cursor: generateDisabled ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Generating...' : 'Generate Payslip'}
            </button>
          </div>
        </div>



        {payslipData && (
          <div style={{ marginTop: '30px' }}>
            <PayslipBill payslipData={payslipData} payslipMonth={selectedMonth} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PayslipsDashboard;
