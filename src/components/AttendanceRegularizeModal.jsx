import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import styles from './AttendanceRegularizeModal.module.scss';

const AttendanceRegularizeModal = ({ show, onClose, staffData, tenantId, storeId }) => {
  if (!show || !staffData) return null;

  const { hasAccess } = useAuth();
  const { showToast } = useToast();
  // An admin has MANAGE_ATTENDANCE
  const canManage = hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'MANAGE_ATTENDANCE']);

  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [storeConfig, setStoreConfig] = useState(null);

  useEffect(() => {
    const fetchStoreConfig = async () => {
      try {
        const res = await apiService.get(`/tenantStoreConfig?tenantId=${tenantId}&storeId=${storeId}`);
        if (res.data) setStoreConfig(res.data);
      } catch (err) {
        console.error('Failed to fetch store config', err);
      }
    };
    fetchStoreConfig();
  }, [tenantId, storeId]);

  const statusColor = {
    PENDING_BORDER: '#f59e0b',
    APPROVED_BORDER: '#10b981',
    REJECTED_BORDER: '#ef4444',
    APPROVED: '#ecfdf5',
    PENDING: '#fffbeb',
    REJECTED: '#fef2f2',
    TERMINAL_BORDER: '#3f97ef',
    TERMINAL: '#eff6ff'
  };

  useEffect(() => {
    if (staffData && staffData.punchList) {
      const sortedPunches = [...staffData.punchList].sort((a, b) => {
        if (!a.punchTime) return 1;
        if (!b.punchTime) return -1;
        return a.punchTime.localeCompare(b.punchTime);
      });
      setPunches(sortedPunches.map(p => ({ ...p, isNew: false })));
    } else {
      setPunches([]);
    }
  }, [staffData]);

  const handleAddPunch = () => {
    if (!storeConfig || !storeConfig.storeOpenTime || !storeConfig.storeCloseTime) {
      showToast('Store timings are not configured. Please contact administrator to configure store open and close times before adding punches.', 'error');
      return;
    }

    const isCheckOut = punches.length % 2 !== 0;
    const defaultTime = isCheckOut ? storeConfig.storeCloseTime : storeConfig.storeOpenTime;

    setPunches([...punches, {
      punchDate: staffData.attendanceDate,
      punchTime: defaultTime,
      uploadSource: 'SYSTEM',
      currentStatus: canManage ? 'APPROVED' : 'PENDING',
      isNew: true
    }]);
  };

  const handleRemovePunch = (index) => {
    const punch = punches[index];
    if (!punch.isNew && !canManage) {
      showToast('You cannot remove existing punches.', 'error');
      return;
    }
    const newPunches = [...punches];
    newPunches.splice(index, 1);
    setPunches(newPunches);
  };

  const handleTimeChange = (index, value) => {
    const punch = punches[index];
    if (!punch.isNew && !canManage) {
      showToast('You cannot edit existing punches. Please add a new punch request.', 'error');
      return;
    }
    const newPunches = [...punches];
    newPunches[index].punchTime = value;
    newPunches[index].isEdited = true;
    setPunches(newPunches);
  };

  const handleSave = async () => {
    setLoading(true);
    
    const formattedPunches = punches.map((p, index) => ({
      ...p,
      punchTime: p.punchTime.substring(0, 5),
      punchEvent: index % 2 === 0 ? 'CHECKIN' : 'CHECKOUT',
      uploadSource: p.uploadSource || 'SYSTEM',
      currentStatus: p.isNew ? (canManage ? 'APPROVED' : 'PENDING') : (p.currentStatus || 'APPROVED'),
      punchDate: p.punchDate || staffData.attendanceDate,
      attendanceDate: p.attendanceDate || staffData.attendanceDate,
      createdBy: p.createdBy || 1,
      modifiedBy: p.modifiedBy || 1
    }));

    const payload = {
      tenantId,
      storeId,
      personnelCode: staffData.staffCode,
      fromDate: staffData.attendanceDate,
      toDate: staffData.attendanceDate,
      individualPunchesList: formattedPunches
    };

    try {
      await apiService.post('/regularizeAttendance', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      setLoading(false);
      onClose(true);
    } catch (err) {
      console.error(err);
      showToast('Failed to regularize attendance.', 'error');
      setLoading(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className={styles.modalOverlay}>
      <div className={`payroll-card animate-fade-in ${styles.modalContainer}`}>
        
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h3 className={styles.headerTitle}>Regularize Attendance</h3>
            <p className={styles.headerSubtitle}>{staffData.staffName} • {staffData.attendanceDate}</p>
          </div>
          <button 
            onClick={() => onClose(false)}
            className={styles.closeButton}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>


          {punches.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <p className={styles.emptyText}>No punches recorded for this date yet.</p>
            </div>
          ) : (
            <div className={styles.punchList}>
              {punches.map((punch, idx) => {
                const borderCol = punch.uploadSource === 'TERMINAL' ? statusColor.TERMINAL_BORDER : statusColor[`${punch.currentStatus}_BORDER`] || statusColor.APPROVED_BORDER;
                const bgCol = punch.uploadSource === 'TERMINAL' ? statusColor.TERMINAL : statusColor[punch.currentStatus] || statusColor.APPROVED;
                const isCheckIn = idx % 2 === 0;

                return (
                  <div key={idx} className={styles.punchItem} style={{ borderLeftColor: borderCol, backgroundColor: bgCol }}>
                    <div>
                      <div className={isCheckIn ? styles.punchTypeCheckIn : styles.punchTypeCheckOut}>
                        {isCheckIn ? 'CHECK-IN' : 'CHECK-OUT'}
                        <span className={styles.punchStatus}>
                          ({punch.currentStatus || 'APPROVED'})
                        </span>
                      </div>
                      
                      <div className={styles.timeSelectContainer}>
                        <select
                          value={punch.punchTime.substring(0, 2) || '09'}
                          onChange={(e) => handleTimeChange(idx, `${e.target.value}:${punch.punchTime.substring(3, 5) || '00'}`)}
                          disabled={!punch.isNew && !canManage}
                          className={`${styles.timeSelect} ${(!punch.isNew && !canManage) ? styles.timeSelectDisabled : styles.timeSelectEnabled}`}
                        >
                          {hours.map(h => <option key={`h-${h}`} value={h}>{h}</option>)}
                        </select>
                        <span className={styles.timeColon}>:</span>
                        <select
                          value={punch.punchTime.substring(3, 5) || '00'}
                          onChange={(e) => handleTimeChange(idx, `${punch.punchTime.substring(0, 2) || '09'}:${e.target.value}`)}
                          disabled={!punch.isNew && !canManage}
                          className={`${styles.timeSelect} ${(!punch.isNew && !canManage) ? styles.timeSelectDisabled : styles.timeSelectEnabled}`}
                        >
                          {minutes.map(m => <option key={`m-${m}`} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleRemovePunch(idx)} 
                      disabled={!punch.isNew && !canManage}
                      className={`${styles.removeButton} ${(!punch.isNew && !canManage) ? styles.removeButtonDisabled : ''}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button 
            type="button"
            onClick={handleAddPunch}
            className={styles.addButton}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Missing Punch
          </button>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button 
            onClick={() => onClose(false)} 
            disabled={loading}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className={`${styles.submitBtn} ${loading ? styles.submitBtnDisabled : ''}`}
          >
            {loading ? 'Submitting...' : (canManage ? 'Save & Approve' : 'Submit Request')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AttendanceRegularizeModal;
