import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const AttendanceRegularizeModal = ({ show, onClose, staffData, tenantId, storeId }) => {
  if (!show || !staffData) return null;

  const { hasAccess } = useAuth();
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div className="payroll-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>Regularize Attendance</h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>{staffData.staffName} • {staffData.attendanceDate}</p>
          </div>
          <button 
            onClick={() => onClose(false)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>


          {punches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <p style={{ margin: 0, fontSize: '15px' }}>No punches recorded for this date yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {punches.map((punch, idx) => {
                const borderCol = punch.uploadSource === 'TERMINAL' ? statusColor.TERMINAL_BORDER : statusColor[`${punch.currentStatus}_BORDER`] || statusColor.APPROVED_BORDER;
                const bgCol = punch.uploadSource === 'TERMINAL' ? statusColor.TERMINAL : statusColor[punch.currentStatus] || statusColor.APPROVED;
                const isCheckIn = idx % 2 === 0;

                return (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '16px', 
                    borderRadius: '12px',
                    borderLeft: `6px solid ${borderCol}`,
                    backgroundColor: bgCol,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: isCheckIn ? '#059669' : '#d97706', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        {isCheckIn ? 'CHECK-IN' : 'CHECK-OUT'}
                        <span style={{ marginLeft: '8px', color: '#64748b', fontWeight: '500', fontSize: '11px', textTransform: 'uppercase' }}>
                          ({punch.currentStatus || 'APPROVED'})
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          value={punch.punchTime.substring(0, 2) || '09'}
                          onChange={(e) => handleTimeChange(idx, `${e.target.value}:${punch.punchTime.substring(3, 5) || '00'}`)}
                          disabled={!punch.isNew && !canManage}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (!punch.isNew && !canManage) ? '#f8fafc' : 'white', fontSize: '14px', fontWeight: '600', color: '#1e293b', outline: 'none' }}
                        >
                          {hours.map(h => <option key={`h-${h}`} value={h}>{h}</option>)}
                        </select>
                        <span style={{ fontWeight: 'bold', color: '#94a3b8' }}>:</span>
                        <select
                          value={punch.punchTime.substring(3, 5) || '00'}
                          onChange={(e) => handleTimeChange(idx, `${punch.punchTime.substring(0, 2) || '09'}:${e.target.value}`)}
                          disabled={!punch.isNew && !canManage}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (!punch.isNew && !canManage) ? '#f8fafc' : 'white', fontSize: '14px', fontWeight: '600', color: '#1e293b', outline: 'none' }}
                        >
                          {minutes.map(m => <option key={`m-${m}`} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleRemovePunch(idx)} 
                      disabled={!punch.isNew && !canManage}
                      style={{ 
                        background: 'white', 
                        border: '1px solid #fecaca', 
                        color: '#ef4444', 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: (!punch.isNew && !canManage) ? 'not-allowed' : 'pointer',
                        opacity: (!punch.isNew && !canManage) ? 0.5 : 1
                      }}
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
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '2px dashed #cbd5e1', backgroundColor: 'transparent', color: '#3f97ef', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#3f97ef'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Missing Punch
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={() => onClose(false)} 
            disabled={loading}
            style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            style={{ padding: '10px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#3f97ef', color: 'white', fontWeight: '600', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 2px 4px rgba(63, 151, 239, 0.2)' }}
          >
            {loading ? 'Submitting...' : (canManage ? 'Save & Approve' : 'Submit Request')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AttendanceRegularizeModal;
