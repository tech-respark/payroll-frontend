import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import styles from './EmployeeDashboard.module.scss';
import StatusBadge from '../components/StatusBadge';
import { apiService } from '../api/apiService';
import { getStoreHolidays } from '../api/holidayApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStoreConfig } from '../hooks/queries';
import { formatDateByConfig } from '../helpers/dateUtils';

const EmployeeDashboard = () => {
  const { user, tenantId, storeId } = useAuth();
  const { storeConfig } = useStoreConfig();
  const staffId = user?.staffId || user?.id || 1;
  const { showToast } = useToast();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';

  // Form State
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: initialStartDate,
    endDate: initialEndDate,
    reason: ''
  });
  const [leaveSession, setLeaveSession] = useState('FULL_DAY');
  const [calculatedDuration, setCalculatedDuration] = useState(0);

  const queryClient = useQueryClient();

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['leaveHistory', staffId],
    queryFn: async () => {
      const res = await apiService.get(`/leaves/applications/staff/${staffId}`);
      return Array.isArray(res) ? res : [];
    },
    enabled: !!staffId
  });

  const { data: balances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ['leaveBalances', staffId, tenantId, storeId],
    queryFn: async () => {
      const res = await apiService.get(`/leaves/balances/all/${staffId}?tenantId=${tenantId}&storeId=${storeId}`);
      return (Array.isArray(res) ? res : []).map((b) => ({
        id: b.typeId,
        type: b.typeName,
        code: b.code || b.typeName.substring(0, 3).toUpperCase(),
        available: b.available,
        annualAllotment: b.annualAllotment || 20,
      }));
    },
    enabled: !!staffId
  });

  const { data: storeHolidaysRaw = [] } = useQuery({
    queryKey: ['holidays', tenantId, storeId],
    queryFn: () => getStoreHolidays(tenantId, storeId),
    enabled: !!tenantId && !!storeId
  });
  
  const storeHolidaysList = Array.isArray(storeHolidaysRaw) ? storeHolidaysRaw : (storeHolidaysRaw?.data || []);
  const optionalHolidays = storeHolidaysList.filter(h => h.isOptional === true);
  
  const selectedLeaveType = balances.find(b => String(b.id) === String(formData.leaveTypeId));
  const isOptionalHolidaySelected = selectedLeaveType?.code === 'OH';

  const loading = loadingHistory || loadingBalances;

  // Duration Calculation Logic
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end >= start) {
        const diffTime = Math.abs(end - start);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        if (diffDays === 1 && (leaveSession === 'FIRST_HALF' || leaveSession === 'SECOND_HALF')) {
          diffDays = 0.5;
        }
        setCalculatedDuration(diffDays);
      } else {
        setCalculatedDuration(0);
      }
    } else {
      setCalculatedDuration(0);
    }
  }, [formData.startDate, formData.endDate, leaveSession]);

  const submitLeaveMutation = useMutation({
    mutationFn: (payload) => apiService.post(`/leaves/apply`, payload),
    onSuccess: () => {
      showToast("Leave request submitted successfully!", 'success');
      handleCancel();
      queryClient.invalidateQueries({ queryKey: ['leaveBalances', staffId] });
      queryClient.invalidateQueries({ queryKey: ['leaveHistory', staffId] });
    },
    onError: (err) => {
      console.error(err);
      showToast(err.message || 'Error submitting leave request', 'error');
    }
  });

  const cancelLeaveMutation = useMutation({
    mutationFn: (applicationId) => apiService.post(`/leaves/${applicationId}/cancel`, {
      staffId: staffId,
      remarks: "Cancelled by employee"
    }),
    onSuccess: () => {
      showToast("Leave cancelled successfully", "success");
      queryClient.invalidateQueries({ queryKey: ['leaveBalances', staffId] });
      queryClient.invalidateQueries({ queryKey: ['leaveHistory', staffId] });
    },
    onError: (err) => {
      console.error(err);
      showToast(err.message || "Failed to cancel leave", "error");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, staffId, tenantId, storeId, leaveSession };
    submitLeaveMutation.mutate(payload);
  };

  const handleCancelLeave = (applicationId) => {
    if (window.confirm("Are you sure you want to cancel this leave application?")) {
      cancelLeaveMutation.mutate(applicationId);
    }
  };

  const handleCancel = (e) => {
    if (e) e.preventDefault();
    setFormData({
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      reason: ''
    });
    setLeaveSession('FULL_DAY');
    setCalculatedDuration(0);
  };

  const getLeaveTypeClass = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('sick')) return styles.badgeSick;
    if (lower.includes('casual')) return styles.badgeCasual;
    if (lower.includes('unpaid') || lower.includes('lwp')) return styles.badgeUnpaid;
    return styles.badgeDefault;
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Leaves</h1>
          <p className={styles.pageSubtitle}>Submit leave requests and monitor your balances from a single hub.</p>
        </div>
      </div>

      <div className={styles.splitLayout}>
        {/* LEFT PANEL: Leave Application Form */}
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <span className={styles.formCardIcon}>✈️</span>
            <span className={styles.formCardTitle}>Request Time Off</span>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>LEAVE TYPE</label>
              <select 
                className={styles.select}
                value={formData.leaveTypeId} 
                onChange={e => setFormData({...formData, leaveTypeId: e.target.value})}
                required
              >
                <option value="">Select a leave type</option>
                {balances.map(t => (
                  <option key={t.id} value={t.id}>{t.type} ({t.available} days left)</option>
                ))}
              </select>
            </div>

            <div className={styles.formRow}>
              {isOptionalHolidaySelected ? (
                <div className={styles.formGroup} style={{ width: '100%' }}>
                  <label className={styles.label}>SELECT OPTIONAL HOLIDAY</label>
                  {optionalHolidays.length > 0 ? (
                    <select
                      className={styles.select}
                      value={formData.startDate}
                      onChange={e => {
                        setFormData({...formData, startDate: e.target.value, endDate: e.target.value});
                        setLeaveSession('FULL_DAY');
                      }}
                      required
                    >
                      <option value="">Select a holiday...</option>
                      {optionalHolidays.map(h => (
                        <option key={h.id} value={h.holidayDate}>
                          {h.holidayName} ({h.holidayDate})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ color: '#d32f2f', padding: '10px 0', fontSize: '14px', fontWeight: '500' }}>
                      No optional holidays available to choose from.
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>START DATE</label>
                    <input 
                      type="date" 
                      className={styles.input}
                      value={formData.startDate} 
                      onChange={e => {
                        setFormData({...formData, startDate: e.target.value});
                        if (e.target.value !== formData.endDate) setLeaveSession('FULL_DAY');
                      }}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>END DATE</label>
                    <input 
                      type="date" 
                      className={styles.input}
                      value={formData.endDate} 
                      onChange={e => {
                        setFormData({...formData, endDate: e.target.value});
                        if (e.target.value !== formData.startDate) setLeaveSession('FULL_DAY');
                      }}
                      required
                    />
                  </div>
                </>
              )}
            </div>

            {formData.startDate && formData.endDate && formData.startDate === formData.endDate && (
              <div className={styles.formGroup}>
                <label className={styles.label}>LEAVE SESSION</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      name="leaveSession" 
                      value="FIRST_HALF" 
                      checked={leaveSession === 'FIRST_HALF'} 
                      onChange={e => setLeaveSession(e.target.value)} 
                    />
                    First Half
                  </label>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      name="leaveSession" 
                      value="SECOND_HALF" 
                      checked={leaveSession === 'SECOND_HALF'}
                      onChange={e => setLeaveSession(e.target.value)} 
                    />
                    Second Half
                  </label>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      name="leaveSession" 
                      value="FULL_DAY" 
                      checked={leaveSession === 'FULL_DAY'}
                      onChange={e => setLeaveSession(e.target.value)} 
                    />
                    Full Day
                  </label>
                </div>
              </div>
            )}

            <div className={styles.calculationRow}>
              <span className={styles.calcIcon}>🕒</span>
              <div className={styles.calcText}>
                <span className={styles.calcLabel}>Calculated Duration</span>
                <span className={styles.calcDays}>{calculatedDuration.toFixed(1)} Days</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>REASON FOR LEAVE</label>
              <textarea 
                className={styles.textarea}
                placeholder="Provide a brief explanation for context..."
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                required
                rows={3}
              ></textarea>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={handleCancel}>Clear Form</button>
              <button type="submit" className={styles.submitBtn} disabled={submitLeaveMutation.isPending || (isOptionalHolidaySelected && optionalHolidays.length === 0)}>
                {submitLeaveMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT PANEL: Balances & History */}
        <div className={styles.contextPanel}>
          
          {/* Leave Balances Widget */}
          <div className={styles.balancesWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetTitle}>Available Balances</span>
            </div>
            
            <div className={styles.balancesGrid}>
              {loading ? (
                <div className={styles.emptyState}>Loading balances...</div>
              ) : balances.length > 0 ? balances.map((b) => (
                <div key={b.id} className={styles.balanceCard}>
                  <div className={styles.balanceInfo}>
                    <span className={`${styles.balanceBadge} ${getLeaveTypeClass(b.type)}`}>{b.code}</span>
                    <span className={styles.balanceName}>{b.type}</span>
                  </div>
                  <div className={styles.balanceValues}>
                    <span className={styles.balanceAvailable}>{b.available.toFixed(1)}</span>
                    <span className={styles.balanceUnit}>/ {b.annualAllotment} days</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div 
                      className={styles.progressBarFill} 
                      style={{ width: `${Math.min((b.available / b.annualAllotment) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className={styles.emptyState}>No leave balances found.</div>
              )}
            </div>
          </div>

          </div>
        </div>

      {/* BOTTOM PANEL: Leave History Widget */}
      <div className={styles.bottomSection}>
        <div className={styles.widgetHeaderRow}>
          <div className={styles.widgetHeaderLeft}>
            <span className={styles.widgetTitleIcon}>⏱️</span>
            <span className={styles.widgetTitle}>Recent Leave Requests</span>
          </div>
          <button className={styles.viewAllLink}>View All History</button>
        </div>
        
        <div className={styles.historyCardsContainer}>
          {loading ? (
            <div className={styles.emptyState}>Loading history...</div>
          ) : history.length > 0 ? history.slice(0, 3).map((req, i) => (
            <div key={i} className={styles.historyCard}>
              <div className={styles.historyCardHeader}>
                <span className={styles.historyCardDate}>
                  {formatDateByConfig(req.startDate, storeConfig?.dateFormat)}
                </span>
                <StatusBadge status={req.status} />
              </div>
              <div className={styles.historyCardDetails}>
                {req.leaveType?.name || 'Leave'} • {req.requestedDays} {req.requestedDays === 1 ? 'Day' : 'Days'}
              </div>
              {(req.status === 'PENDING' || req.status === 'APPROVED') && (
                <button 
                  className={styles.cancelActionBtn} 
                  onClick={() => handleCancelLeave(req.id)}
                  disabled={cancelLeaveMutation.isPending}
                >
                  {cancelLeaveMutation.isPending ? 'Cancelling...' : 'Cancel Leave'}
                </button>
              )}
            </div>
          )) : (
            <div className={styles.emptyState}>No recent leave requests found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
