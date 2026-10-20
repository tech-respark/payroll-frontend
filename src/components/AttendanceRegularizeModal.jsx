import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useStoreConfig } from '../hooks/queries';
import { Modal, Button } from './ui';
import { LuPlus, LuX, LuClock } from 'react-icons/lu';
import styles from './AttendanceRegularizeModal.module.scss';

const AttendanceRegularizeModal = ({ show, onClose, staffData, tenantId, storeId }) => {
  const { hasAccess } = useAuth();
  const { showToast } = useToast();
  const canManage = hasAccess(['MANAGE_ATTENDANCE']);
  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(false);
  const { storeConfig } = useStoreConfig();

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

  if (!show || !staffData) return null;

  const handleAddPunch = () => {
    if (!storeConfig || !storeConfig.storeOpenTime || !storeConfig.storeCloseTime) {
      showToast('Store timings are not configured. Please contact an administrator.', 'error');
      return;
    }

    const isCheckOut = punches.length % 2 !== 0;
    const defaultTime = isCheckOut ? storeConfig.storeCloseTime : storeConfig.storeOpenTime;

    setPunches([...punches, {
      punchDate: staffData.attendanceDate,
      punchTime: defaultTime,
      uploadSource: 'SYSTEM',
      currentStatus: canManage ? 'APPROVED' : 'PENDING',
      isNew: true,
    }]);
  };

  const handleRemovePunch = (index) => {
    const punch = punches[index];
    if (!punch.isNew && !canManage) {
      showToast('You cannot remove existing punches.', 'error');
      return;
    }
    const next = [...punches];
    next.splice(index, 1);
    setPunches(next);
  };

  const handleTimeChange = (index, value) => {
    const punch = punches[index];
    if (!punch.isNew && !canManage) {
      showToast('You cannot edit existing punches. Please add a new punch request.', 'error');
      return;
    }
    const next = [...punches];
    next[index].punchTime = value;
    next[index].isEdited = true;
    setPunches(next);
  };

  const handleSave = async () => {
    setLoading(true);

    const formattedPunches = punches.map((p, index) => ({
      ...p,
      punchTime: p.punchTime.length === 5 ? `${p.punchTime}` : p.punchTime.substring(0, 5),
      punchEvent: index % 2 === 0 ? 'CHECKIN' : 'CHECKOUT',
      uploadSource: p.uploadSource || 'SYSTEM',
      currentStatus: p.isNew ? (canManage ? 'APPROVED' : 'PENDING') : (p.currentStatus || 'APPROVED'),
      punchDate: p.punchDate || staffData.attendanceDate,
      attendanceDate: p.attendanceDate || staffData.attendanceDate,
      createdBy: p.createdBy || 1,
      modifiedBy: p.modifiedBy || 1,
    }));

    const payload = {
      tenantId,
      storeId,
      staffId: staffData.staffCode,
      fromDate: staffData.attendanceDate,
      toDate: staffData.attendanceDate,
      individualPunchesList: formattedPunches,
    };

    try {
      await apiService.post('/regularizeAttendance', payload, {
        Tenantid: String(tenantId),
        Storeid: String(storeId),
        'x-allowed-store-ids': String(storeId),
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
    <Modal
      open={show}
      onClose={() => onClose(false)}
      title="Regularize attendance"
      subtitle={`${staffData.staffName} • ${staffData.attendanceDate}`}
      size="md"
      footer={(
        <>
          <Button variant="outline" onClick={() => onClose(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Submitting…' : (canManage ? 'Save & approve' : 'Submit request')}
          </Button>
        </>
      )}
    >
      {punches.length === 0 ? (
        <div className={styles.emptyState}>
          <LuClock size={40} className={styles.emptyIcon} />
          <p className={styles.emptyText}>No punches recorded for this date yet.</p>
        </div>
      ) : (
        <div className={styles.punchList}>
          {punches.map((punch, idx) => {
            const isCheckIn = idx % 2 === 0;
            const statusStr = punch.currentStatus || 'APPROVED';
            const uploadSrc = punch.uploadSource;
            const finalStatus = uploadSrc === 'TERMINAL' ? 'TERMINAL' : statusStr;

            return (
              <div key={idx} className={styles.punchItem}>
                <div className={styles.punchLeft}>
                  <span className={styles.punchType}>
                    {isCheckIn ? 'Check-in' : 'Check-out'}
                  </span>
                  <div className={styles.timeGroup}>
                    <select
                      value={punch.punchTime.substring(0, 2) || '09'}
                      onChange={(e) => handleTimeChange(idx, `${e.target.value}:${punch.punchTime.substring(3, 5) || '00'}`)}
                      disabled={!punch.isNew && !canManage}
                      className={styles.timeSelect}
                    >
                      {hours.map((h) => <option key={`h-${h}`} value={h}>{h}</option>)}
                    </select>
                    <span className={styles.timeColon}>:</span>
                    <select
                      value={punch.punchTime.substring(3, 5) || '00'}
                      onChange={(e) => handleTimeChange(idx, `${punch.punchTime.substring(0, 2) || '09'}:${e.target.value}`)}
                      disabled={!punch.isNew && !canManage}
                      className={styles.timeSelect}
                    >
                      {minutes.map((m) => <option key={`m-${m}`} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className={styles.punchRight}>
                  <span className={`${styles.badge} ${styles[`badge${finalStatus}`] || styles.badgeAPPROVED}`}>
                    {finalStatus}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePunch(idx)}
                    disabled={!punch.isNew && !canManage}
                    className={`${styles.removeButton} ${(!punch.isNew && !canManage) ? styles.removeButtonDisabled : ''}`}
                    aria-label="Remove punch"
                  >
                    <LuX size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button type="button" onClick={handleAddPunch} className={styles.addButton}>
        <LuPlus size={18} />
        Add missing punch
      </button>
    </Modal>
  );
};

export default AttendanceRegularizeModal;
