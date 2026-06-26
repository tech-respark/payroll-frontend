import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './SubmitLeaveRequest.module.scss';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const SubmitLeaveRequest = () => {
  const { user, tenantId, storeId } = useAuth();
  const staffId = user?.staffId || user?.id || 1;
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    reason: ''
  });

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [calculatedDuration, setCalculatedDuration] = useState(0);

  // Fetch eligible leave types and balances
  useEffect(() => {
    const fetchLeaveTypesAndBalances = async () => {
      try {
        const data = await apiService.get(`/leaves/balances/all/${staffId}?tenantId=${tenantId}&storeId=${storeId}`);
        // The API returns an array of { typeId, typeName, available }
        const formattedTypes = data.map(b => ({
          id: b.typeId,
          name: b.typeName,
          balance: b.available
        }));
        setLeaveTypes(formattedTypes);
      } catch (err) {
        console.error(err);
      }
    };

    fetchLeaveTypesAndBalances();
  }, [staffId]);

  // Dummy auto-calculate
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end >= start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        setCalculatedDuration(diffDays);
      } else {
        setCalculatedDuration(0);
      }
    }
  }, [formData.startDate, formData.endDate]);

  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, staffId, tenantId, storeId };
      await apiService.post(`/leaves/apply`, payload);
      showToast("Leave request submitted successfully!", 'success');
      setTimeout(() => { window.location.href = '/leave-dashboard'; }, 1000);
    } catch (err) {
      showToast(err.message || "Failed to submit request.", 'error');
    }
  };


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Submit Leave Request</h1>
        <p>Fill out the details below to request time off. Ensure you have sufficient balance.</p>
      </div>

      <div className={styles.splitLayout}>
        {/* Left Form */}
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Request Details</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            
            <div className={styles.formGroup}>
              <label>LEAVE TYPE <span className={styles.req}>*</span></label>
              <select 
                value={formData.leaveTypeId} 
                onChange={e => setFormData({...formData, leaveTypeId: e.target.value})}
                required
              >
                <option value="">Select Leave Category</option>
                {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className={styles.dateRow}>
              <div className={styles.formGroup}>
                <label>START DATE <span className={styles.req}>*</span></label>
                <input 
                  type="date" 
                  value={formData.startDate} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>END DATE <span className={styles.req}>*</span></label>
                <input 
                  type="date" 
                  value={formData.endDate} 
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className={styles.calculationRow}>
              <span className={styles.calcIcon}>🧮</span>
              <span>Calculated Duration</span>
              <span className={styles.calcDays}>{calculatedDuration.toFixed(1)} Days</span>
            </div>

            <div className={styles.formGroup}>
              <label>REASON FOR LEAVE <span className={styles.req}>*</span></label>
              <textarea 
                rows="4" 
                placeholder="Provide a brief explanation for context..."
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                required
              ></textarea>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={() => window.history.back()}>Cancel</button>
              <button type="submit" className={styles.submitBtn}>Submit Request</button>
            </div>
          </form>
        </div>

        {/* Right Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.balancePreview}>
            <h2 className={styles.sectionTitle}>Available Balances</h2>
            <div className={styles.divider}></div>
            {leaveTypes.length === 0 ? (
              <div style={{color: '#888', fontSize: '0.9rem', marginTop: '10px'}}>No leave plans assigned.</div>
            ) : (
              leaveTypes.map(t => (
                <div key={t.id} className={styles.previewRow} style={{ marginTop: '10px' }}>
                  <span>{t.name}</span>
                  <span style={{ fontWeight: '600' }}>{Number(t.balance).toFixed(1)} Days</span>
                </div>
              ))
            )}
          </div>

          <div className={styles.policyAlert}>
            <div className={styles.alertIcon}>⚠️</div>
            <div className={styles.alertContent}>
              <h4>Sandwich Rule Policy</h4>
              <p>If your leave spans across a weekend or public holiday (e.g., Friday to Monday), the intervening non-working days will be counted as leave days (Loss of Pay) according to the company policy.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitLeaveRequest;
