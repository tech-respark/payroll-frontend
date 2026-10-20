import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import styles from './EmployeeDashboard.module.scss';
import StatusBadge from '../components/StatusBadge';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStoreConfig } from '../hooks/queries';
import { formatDateByConfig, parseLocalDate } from '../helpers/dateUtils';
import { Button, Modal, Radio, ConfirmDialog } from '../components/ui';
import { LuPlus } from 'react-icons/lu';

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'CLOSED', label: 'Closed' },
];

const emptyForm = {
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  reason: '',
};

const sessionLabel = (session) => {
  if (session === 'FIRST_HALF') return 'First half';
  if (session === 'SECOND_HALF') return 'Second half';
  return null;
};

const matchesFilter = (status, filter) => {
  const value = String(status || '').toUpperCase();
  if (filter === 'ALL') return true;
  if (filter === 'PENDING') return value === 'PENDING' || value === 'CANCELLATION_REQUESTED';
  if (filter === 'APPROVED') return value === 'APPROVED';
  if (filter === 'CLOSED') return value === 'CANCELLED' || value === 'REJECTED';
  return true;
};

const EmployeeDashboard = () => {
  const { user, tenantId, storeId } = useAuth();
  const { storeConfig } = useStoreConfig();
  const staffId = user?.staffId;
  const { showToast } = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams(location.search);
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';
  const applyNow = searchParams.get('apply') === '1';

  const [formData, setFormData] = useState({
    ...emptyForm,
    startDate: initialStartDate,
    endDate: initialEndDate,
  });
  const [leaveSession, setLeaveSession] = useState('FULL_DAY');
  const [calculatedDuration, setCalculatedDuration] = useState(0);
  const [requestOpen, setRequestOpen] = useState(() => Boolean(initialStartDate || initialEndDate || applyNow));
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['leaveHistory', staffId],
    queryFn: async () => {
      const res = await apiService.get(`/leaves/applications/staff/${staffId}`);
      return Array.isArray(res) ? res : [];
    },
    enabled: !!staffId,
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
    enabled: !!staffId,
  });

  const { data: storeHolidaysRaw = [] } = useQuery({
    queryKey: ['holidays', tenantId, storeId],
    queryFn: () => apiService.get(`/holidays?tenantId=${tenantId}&storeId=${storeId}`),
    enabled: !!tenantId && !!storeId,
  });

  const storeHolidaysList = Array.isArray(storeHolidaysRaw) ? storeHolidaysRaw : (storeHolidaysRaw?.data || []);
  const optionalHolidays = storeHolidaysList.filter((h) => h.isOptional === true);

  const selectedLeaveType = balances.find((b) => String(b.id) === String(formData.leaveTypeId));
  const isOptionalHolidaySelected = selectedLeaveType?.code === 'OH';

  const visibleHistory = useMemo(() => {
    const rows = [...history].sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
    return rows.filter((req) => matchesFilter(req.status, statusFilter));
  }, [history, statusFilter]);

  const pendingCount = history.filter((req) => matchesFilter(req.status, 'PENDING')).length;

  useEffect(() => {
    const start = searchParams.get('startDate') || '';
    const end = searchParams.get('endDate') || '';
    const apply = searchParams.get('apply') === '1';
    if (!start && !end && !apply) return;
    setFormData((prev) => ({ ...prev, startDate: start || prev.startDate, endDate: end || prev.endDate }));
    setRequestOpen(true);
  }, [location.search]);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = parseLocalDate(formData.startDate);
      const end = parseLocalDate(formData.endDate);
      if (start && end && end >= start) {
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

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setLeaveSession('FULL_DAY');
    setCalculatedDuration(0);
  };

  const submitLeaveMutation = useMutation({
    mutationFn: (payload) => apiService.post(`/leaves/apply`, payload),
    onSuccess: () => {
      showToast('Leave request submitted successfully!', 'success');
      setRequestOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['leaveBalances', staffId] });
      queryClient.invalidateQueries({ queryKey: ['leaveHistory', staffId] });
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['headerNotifLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['headerNotifMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['hrDashboardMetrics'] });
    },
    onError: (err) => {
      showToast(err.message || 'Error submitting leave request', 'error');
    },
  });

  const cancelLeaveMutation = useMutation({
    mutationFn: (applicationId) => apiService.post(`/leaves/${applicationId}/cancel`, {
      staffId,
      remarks: 'Cancelled by employee',
    }),
    onSuccess: (data) => {
      const requested = data?.status === 'CANCELLATION_REQUESTED'
        || String(data?.message || '').toLowerCase().includes('cancellation requested');
      showToast(requested ? 'Cancellation requested; pending manager approval' : 'Leave cancelled successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['leaveBalances', staffId] });
      queryClient.invalidateQueries({ queryKey: ['leaveHistory', staffId] });
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['headerNotifLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['headerNotifMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['hrDashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['leaveData'] });
    },
    onError: (err) => {
      showToast(err.message || 'Failed to cancel leave', 'error');
    },
  });

  const closeRequest = () => {
    if (submitLeaveMutation.isPending) return;
    setRequestOpen(false);
    resetForm();
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!staffId) {
      showToast('Your staff profile is missing. Please sign in again.', 'error');
      return;
    }
    submitLeaveMutation.mutate({
      ...formData,
      staffId,
      tenantId,
      storeId,
      leaveSession: isOptionalHolidaySelected ? 'FULL_DAY' : leaveSession,
    });
  };

  const formatRange = (req) => {
    const start = formatDateByConfig(req.startDate, storeConfig?.dateFormat);
    const end = req.endDate ? formatDateByConfig(req.endDate, storeConfig?.dateFormat) : '';
    if (!end || end === start) return start;
    return `${start} – ${end}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.filters} role="tablist" aria-label="Filter leave requests">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === filter.id}
              className={statusFilter === filter.id ? styles.filterActive : styles.filterBtn}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
              {filter.id === 'PENDING' && pendingCount > 0 && (
                <span className={styles.filterCount}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <Button onClick={() => setRequestOpen(true)}>
          <LuPlus size={16} strokeWidth={2} />
          Request leave
        </Button>
      </div>

      <section className={styles.metricsRow} aria-label="Available balances">
        {loadingBalances ? (
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Balances</span>
            <span className={styles.metricHint}>Loading…</span>
          </div>
        ) : balances.length > 0 ? balances.map((balance) => {
          const usedPct = balance.annualAllotment
            ? Math.min((balance.available / balance.annualAllotment) * 100, 100)
            : 0;
          return (
            <div key={balance.id} className={styles.metricCard}>
              <div className={styles.metricTop}>
                <span className={styles.metricLabel}>{balance.type}</span>
                <span className={styles.metricCode}>{balance.code}</span>
              </div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>{Number(balance.available).toFixed(1)}</span>
                <span className={styles.metricHint}>of {balance.annualAllotment} days</span>
              </div>
              <div className={styles.progressTrack} aria-hidden>
                <div className={styles.progressFill} style={{ width: `${usedPct}%` }} />
              </div>
            </div>
          );
        }) : (
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Balances</span>
            <span className={styles.metricHint}>No leave balances found.</span>
          </div>
        )}
      </section>

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>Leave requests</h2>
          <span className={styles.listMeta}>
            {visibleHistory.length} {visibleHistory.length === 1 ? 'request' : 'requests'}
          </span>
        </div>

        {loadingHistory ? (
          <div className={styles.emptyState}>Loading requests…</div>
        ) : visibleHistory.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dates</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((req) => {
                  const half = sessionLabel(req.leaveSession);
                  const typeName = req.leaveType?.leaveName || req.leaveType?.name || 'Leave';
                  const canCancel = req.status === 'PENDING' || req.status === 'APPROVED';
                  return (
                    <tr key={req.id || `${req.startDate}-${req.status}`}>
                      <td>
                        <div className={styles.dateCell}>{formatRange(req)}</div>
                        {req.reason && <div className={styles.reasonCell}>{req.reason}</div>}
                      </td>
                      <td>{typeName}</td>
                      <td>
                        {req.requestedDays} {req.requestedDays === 1 ? 'day' : 'days'}
                        {half ? ` · ${half}` : ''}
                      </td>
                      <td><StatusBadge status={req.status} /></td>
                      <td className={styles.actionCell}>
                        {canCancel && (
                          <Button
                            variant="outline"
                            onClick={() => setCancelTarget(req.id)}
                            disabled={cancelLeaveMutation.isPending}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            {history.length === 0
              ? 'No leave requests yet. Request leave when you need time off.'
              : 'No requests in this filter.'}
          </div>
        )}
      </section>

      <Modal
        open={requestOpen}
        onClose={closeRequest}
        title="Request leave"
        subtitle="Choose a type and dates. Half-day is available when start and end are the same day."
        size="lg"
        footer={(
          <>
            <Button variant="outline" onClick={closeRequest} disabled={submitLeaveMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="leave-request-form"
              disabled={submitLeaveMutation.isPending || (isOptionalHolidaySelected && optionalHolidays.length === 0)}
            >
              {submitLeaveMutation.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </>
        )}
      >
        <form id="leave-request-form" className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="leave-type">Leave type</label>
            <select
              id="leave-type"
              className={styles.select}
              value={formData.leaveTypeId}
              onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
              required
            >
              <option value="">Select a leave type</option>
              {balances.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.type} ({type.available} days left)
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            {isOptionalHolidaySelected ? (
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.label} htmlFor="optional-holiday">Optional holiday</label>
                {optionalHolidays.length > 0 ? (
                  <select
                    id="optional-holiday"
                    className={styles.select}
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value });
                      setLeaveSession('FULL_DAY');
                    }}
                    required
                  >
                    <option value="">Select a holiday</option>
                    {optionalHolidays.map((holiday) => (
                      <option key={holiday.id} value={holiday.holidayDate}>
                        {holiday.holidayName} ({formatDateByConfig(holiday.holidayDate, storeConfig?.dateFormat)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={styles.formHintError}>No optional holidays are available to choose from.</p>
                )}
              </div>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="leave-start">Start date</label>
                  <input
                    id="leave-start"
                    type="date"
                    className={styles.input}
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData({ ...formData, startDate: e.target.value });
                      if (e.target.value !== formData.endDate) setLeaveSession('FULL_DAY');
                    }}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="leave-end">End date</label>
                  <input
                    id="leave-end"
                    type="date"
                    className={styles.input}
                    value={formData.endDate}
                    onChange={(e) => {
                      setFormData({ ...formData, endDate: e.target.value });
                      if (e.target.value !== formData.startDate) setLeaveSession('FULL_DAY');
                    }}
                    required
                  />
                </div>
              </>
            )}
          </div>

          {formData.startDate && formData.endDate && formData.startDate === formData.endDate && !isOptionalHolidaySelected && (
            <div className={styles.formGroup}>
              <span className={styles.label}>Leave session</span>
              <div className={styles.radioGroup}>
                <Radio card name="leaveSession" value="FIRST_HALF" label="First half" checked={leaveSession === 'FIRST_HALF'} onChange={(e) => setLeaveSession(e.target.value)} />
                <Radio card name="leaveSession" value="SECOND_HALF" label="Second half" checked={leaveSession === 'SECOND_HALF'} onChange={(e) => setLeaveSession(e.target.value)} />
                <Radio card name="leaveSession" value="FULL_DAY" label="Full day" checked={leaveSession === 'FULL_DAY'} onChange={(e) => setLeaveSession(e.target.value)} />
              </div>
            </div>
          )}

          <div className={styles.durationRow}>
            <span className={styles.durationLabel}>Calculated duration</span>
            <span className={styles.durationValue}>{calculatedDuration.toFixed(1)} days</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="leave-reason">Reason</label>
            <textarea
              id="leave-reason"
              className={styles.textarea}
              placeholder="Add a short note for your manager"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              rows={3}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={cancelTarget != null}
        title="Cancel this leave?"
        body="Pending leave is cancelled immediately. Approved leave waits for a manager."
        confirmLabel="Cancel leave"
        danger
        busy={cancelLeaveMutation.isPending}
        onClose={() => { if (!cancelLeaveMutation.isPending) setCancelTarget(null); }}
        onConfirm={() => {
          cancelLeaveMutation.mutate(cancelTarget, {
            onSettled: () => setCancelTarget(null),
          });
        }}
      />
    </div>
  );
};

export default EmployeeDashboard;
