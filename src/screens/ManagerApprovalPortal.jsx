import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './ManagerApprovalPortal.module.scss';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStoreConfig } from '../hooks/queries';
import { formatDateByConfig } from '../helpers/dateUtils';
import { prettyStatus } from '../helpers/displayUtils';
import { LuCheck, LuX, LuCircle, LuInbox } from 'react-icons/lu';
import { Drawer, Modal, Button, Checkbox, ConfirmDialog } from '../components/ui';

const ManagerApprovalPortal = () => {
  const [selectedReq, setSelectedReq] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [currentBalance, setCurrentBalance] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const { tenantId, storeId, user } = useAuth();
  const managerId = user?.staffId;
  const { storeConfig } = useStoreConfig();
  const { showToast } = useToast();

  const queryClient = useQueryClient();

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['pendingLeaves', tenantId, storeId],
    queryFn: async () => {
      const data = await apiService.get(`/leaves/applications/pending?tenantId=${tenantId}&storeId=${storeId}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tenantId && !!storeId
  });

  const { data: selectedStaffData, isLoading: loadingDetails } = useQuery({
    queryKey: ['staffLeaveDetails', selectedReq?.staffId],
    queryFn: async () => {
      const balanceData = await apiService.get(`/leaves/balances/all/${selectedReq.staffId}?tenantId=${tenantId}&storeId=${storeId}`);
      const historyData = await apiService.get(`/leaves/applications/staff/${selectedReq.staffId}`);
      return { balanceData, historyData };
    },
    enabled: !!selectedReq?.staffId
  });

  useEffect(() => {
    if (selectedStaffData && selectedReq) {
      const balances = Array.isArray(selectedStaffData.balanceData) ? selectedStaffData.balanceData : [];
      const history = Array.isArray(selectedStaffData.historyData) ? selectedStaffData.historyData : [];
      const targetBalance = balances.find(b => b.typeId === selectedReq.leaveType?.id);
      setCurrentBalance(targetBalance ? targetBalance.available : null);
      
      const currentMonth = new Date().getMonth();
      const thisMonthHistory = history.filter(h => {
        const start = h.startDate ? new Date(`${String(h.startDate).slice(0, 10)}T00:00:00`) : null;
        return start && start.getMonth() === currentMonth;
      });
      setLeaveHistory(thisMonthHistory);
    }
  }, [selectedStaffData, selectedReq]);

  const [rejectPromptReq, setRejectPromptReq] = useState(null);
  const [rejectPromptRemarks, setRejectPromptRemarks] = useState('');
  const [confirm, setConfirm] = useState(null);

  const openDetails = (req) => {
    setSelectedReq(req);
    setRemarks('');
    setCurrentBalance(null);
    setLeaveHistory([]);
    setIsModalOpen(true);
  };

  const closeDetails = () => {
    setSelectedReq(null);
    setIsModalOpen(false);
  };

  const actionMutation = useMutation({
    mutationFn: async ({ reqId, endpoint, remarks }) => {
      if (!managerId) {
        throw new Error('Your staff profile is missing. Please sign in again.');
      }
      return await apiService.post(`/leaves/${reqId}/${endpoint}`, { managerId, remarks });
    },
    onSuccess: (data, variables) => {
      if (variables.reqId === selectedReq?.id) {
        closeDetails();
      }
      setSelectedIds(prev => prev.filter(id => id !== variables.reqId));
      setRejectPromptReq(null);
      setRejectPromptRemarks('');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['headerNotifLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['headerNotifMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['hrDashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['leaveHistory'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      queryClient.invalidateQueries({ queryKey: ['leaveData'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceData'] });
    }
  });

  const handleAction = (action, req = selectedReq) => {
    if (!req) return;
    
    let finalRemarks = req === selectedReq ? remarks : '';
    
    if (action === 'reject' && !finalRemarks) {
      setRejectPromptRemarks('');
      setRejectPromptReq(req);
      return; // Stop here, wait for modal submission
    }
    
    setConfirm({ mode: 'single', action, req, remarks: finalRemarks });
  };

  const executeAction = (action, req, finalRemarks) => {
    let endpoint = action === 'approve' 
      ? (req.status === 'CANCELLATION_REQUESTED' ? 'approve-cancellation' : 'approve')
      : (req.status === 'CANCELLATION_REQUESTED' ? 'reject-cancellation' : 'reject');
      
    actionMutation.mutate(
      { reqId: req.id, endpoint, remarks: finalRemarks },
      {
        onSuccess: () => showToast(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`, 'success'),
        onError: (err) => showToast(err.message || "Action failed", 'error')
      }
    );
  };

  const confirmReject = () => {
    if (!rejectPromptRemarks.trim()) {
      showToast("Rejection remarks are mandatory.", "error");
      return;
    }
    executeAction('reject', rejectPromptReq, rejectPromptRemarks);
  };

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, ids }) => {
      for (const id of ids) {
        const req = requests.find(r => r.id === id);
        if (req) {
          let endpoint = action === 'approve' 
            ? (req.status === 'CANCELLATION_REQUESTED' ? 'approve-cancellation' : 'approve') 
            : (req.status === 'CANCELLATION_REQUESTED' ? 'reject-cancellation' : 'reject');
          if (!managerId) {
            throw new Error('Your staff profile is missing. Please sign in again.');
          }
          await apiService.post(`/leaves/${req.id}/${endpoint}`, { managerId, remarks: action === 'approve' ? 'Bulk Approved' : 'Bulk Rejected' });
        }
      }
    },
    onSuccess: (_, variables) => {
      showToast(`Bulk ${variables.action === 'approve' ? 'approved' : 'rejected'} ${variables.ids.length} requests successfully`, 'success');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['headerNotifLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['headerNotifMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['hrDashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['leaveHistory'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      queryClient.invalidateQueries({ queryKey: ['leaveData'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceData'] });
    },
    onError: (err) => {
      showToast(err.message || "Bulk action failed", 'error');
    }
  });

  const handleBulkAction = (action) => {
    if (selectedIds.length === 0) return;
    setConfirm({ mode: 'bulk', action, ids: selectedIds });
  };

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.mode === 'bulk') {
      bulkActionMutation.mutate({ action: confirm.action, ids: confirm.ids });
    } else {
      executeAction(confirm.action, confirm.req, confirm.remarks || '');
    }
    setConfirm(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(requests.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(reqId => reqId !== id));
    }
  };
  
  const getInitials = (name) => {
    if (!name) return "UK";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };
  
  const getLeaveTypeClass = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('annual')) return styles.annual;
    if (lower.includes('sick')) return styles.sick;
    if (lower.includes('casual')) return styles.casual;
    if (lower.includes('maternity')) return styles.maternity;
    return '';
  };

  const confirmCount = confirm?.mode === 'bulk' ? (confirm.ids?.length || 0) : 1;
  const confirmVerb = confirm?.action === 'approve' ? 'Approve' : 'Reject';

  return (
    <div className={styles.container}>
      <p className="screenIntro">Review pending leave and cancellation requests for your team.</p>

      <div className={`${styles.tableCard} mp-card`}>
        <div className={styles.tableHeaderSection}>
          <div className={styles.tableTitle}>Pending Requests</div>
          {selectedIds.length > 0 && (
            <div className={styles.bulkActions}>
              <button className={styles.bulkBtnReject} onClick={() => handleBulkAction('reject')} disabled={bulkActionMutation.isPending}>
                {bulkActionMutation.isPending && bulkActionMutation.variables?.action === 'reject' ? (
                  'Processing...'
                ) : (
                  <span className={styles.bulkBtnLabel}>
                    <LuX size={16} aria-hidden="true" />
                    Reject ({selectedIds.length})
                  </span>
                )}
              </button>
              <button className={styles.bulkBtn} onClick={() => handleBulkAction('approve')} disabled={bulkActionMutation.isPending}>
                {bulkActionMutation.isPending && bulkActionMutation.variables?.action === 'approve' ? (
                  'Processing...'
                ) : (
                  <span className={styles.bulkBtnLabel}>
                    <LuCheck size={16} aria-hidden="true" />
                    Approve ({selectedIds.length})
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
        <table className={`${styles.approvalsTable} mp-table`}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <Checkbox
                  className={styles.tableCheckbox}
                  onChange={handleSelectAll}
                  checked={requests.length > 0 && selectedIds.length === requests.length}
                  aria-label="Select all leave requests"
                />
              </th>
              <th>Staff name</th>
              <th>Leave type</th>
              <th>Dates</th>
              <th>Total days</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingRequests ? (
              <tr>
                <td colSpan="7" className={styles.emptyCell}>Loading pending requests…</td>
              </tr>
            ) : requests.map((req) => {
              const staffName = req.staffName || "Unknown Staff";
              return (
              <tr key={req.id} onClick={() => openDetails(req)} className={styles.clickableRow}>
                <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                  <Checkbox
                    className={styles.tableCheckbox}
                    onChange={(e) => handleSelectOne(e, req.id)}
                    checked={selectedIds.includes(req.id)}
                    aria-label={`Select leave request for ${staffName}`}
                  />
                </td>
                <td>
                  <div className={styles.empCell}>
                    <div className={styles.avatar}>{getInitials(staffName)}</div>
                    <div className={styles.empInfo}>
                      <span className={styles.empName}>{staffName}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.leaveTypeTag + " " + getLeaveTypeClass(req.leaveType?.leaveName)}>
                    <div className={styles.colorBar}></div>
                    <span>{req.leaveType?.leaveName || 'Leave'}</span>
                  </div>
                </td>
                <td>{formatDateByConfig(req.startDate, storeConfig?.dateFormat)} – {formatDateByConfig(req.endDate, storeConfig?.dateFormat)}</td>
                <td>{req.requestedDays} {req.requestedDays == 1 ? 'Day' : 'Days'}</td>
                <td>
                  <span className={styles.statusBadge}>
                    <LuCircle size={8} className={styles.statusDot} aria-hidden="true" />
                    {prettyStatus(req.status)}
                  </span>
                </td>
                <td className={styles.actionCell} onClick={e => e.stopPropagation()}>
                  <button className={styles.iconBtn} onClick={() => handleAction('approve', req)} title="Approve" aria-label="Approve">
                    <LuCheck size={16} aria-hidden="true" />
                  </button>
                  <button className={styles.iconBtnReject} onClick={() => handleAction('reject', req)} title="Reject" aria-label="Reject">
                    <LuX size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
            })}
            {!loadingRequests && requests.length === 0 && (
              <tr>
                <td colSpan="7" className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <LuInbox size={40} strokeWidth={1.5} className={styles.emptyIcon} aria-hidden="true" />
                    <p className={styles.emptyTitle}>No pending requests</p>
                    <p className={styles.emptyHint}>New leave applications from your team will show up here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className={styles.tableFooter}>
          <div className={styles.showingText}>
            Showing {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {isModalOpen && selectedReq && (
        <Drawer
          open
          onClose={closeDetails}
          title={selectedReq.staffName || 'Unknown Staff'}
          subtitle={`Applied ${formatDateByConfig(selectedReq.createdAt, storeConfig?.dateFormat) || 'recently'}`}
          width={720}
          footer={(
            <>
              <Button
                variant="danger"
                onClick={() => handleAction('reject')}
                disabled={actionMutation.isPending}
              >
                {actionMutation.isPending && actionMutation.variables?.endpoint === 'reject' ? 'Processing…' : 'Reject request'}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAction('approve')}
                disabled={actionMutation.isPending}
              >
                {actionMutation.isPending && actionMutation.variables?.endpoint !== 'reject' ? 'Processing…' : 'Approve request'}
              </Button>
            </>
          )}
        >
            <div className={styles.modalBody}>
              <div className={styles.leftColumn}>
                <div>
                  <h3 className={styles.sectionHeader}>Applied leave detail</h3>
                  <div className={styles.leaveDetails}>
                    <div className={styles.detailItem}>
                      <label>Leave type</label>
                      <p className={styles.val}>{selectedReq.leaveType?.leaveName || 'Leave'}</p>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Total requested</label>
                      <p className={styles.valLarge}>{selectedReq.requestedDays} {selectedReq.requestedDays == 1 ? 'Day' : 'Days'}</p>
                    </div>
                    <div className={styles.detailItem + " " + styles.fullWidth}>
                      <label>Dates</label>
                      <p className={styles.val}>{formatDateByConfig(selectedReq.startDate, storeConfig?.dateFormat)} – {formatDateByConfig(selectedReq.endDate, storeConfig?.dateFormat)}</p>
                    </div>
                    <div className={styles.detailItem + " " + styles.fullWidth}>
                      <label>Reason</label>
                      <p className={styles.reasonText}>{selectedReq.reason || 'No reason provided.'}</p>
                    </div>
                  </div>
                </div>
                
                <div className={styles.remarksSection}>
                  <label>Manager remarks</label>
                  <textarea 
                    rows="3" 
                    placeholder="Optional for approval or rejection..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                  ></textarea>
                </div>
              </div>
              
              <div className={styles.rightColumn}>
                <div>
                  <h3 className={styles.sectionHeader + " " + styles.amberBar}>Balance overview</h3>
                  <div className={styles.balanceBox}>
                    <div className={styles.balanceRow}>
                      <span>Current Balance</span>
                      <span className={styles.val}>{currentBalance !== null ? currentBalance.toFixed(1) : '...'}</span>
                    </div>
                    <div className={styles.balanceRow}>
                      <span>Deduction (This Request)</span>
                      <span className={styles.valDeduct}>-{selectedReq.requestedDays}</span>
                    </div>
                    <div className={styles.divider}></div>
                    <div className={styles.balanceRow}>
                      <span>Projected Balance</span>
                      <span className={styles.valProjected}>{currentBalance !== null ? (currentBalance - selectedReq.requestedDays).toFixed(1) : '...'}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className={styles.sectionHeader}>Leave history (this month)</h3>
                  {leaveHistory.length > 0 ? (
                    <table className={styles.historyTable}>
                      <thead>
                        <tr>
                          <th>Dates</th>
                          <th>Type</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveHistory.slice(0, 3).map(h => (
                          <tr key={h.id}>
                            <td>{formatDateByConfig(h.startDate, storeConfig?.dateFormat)} - {formatDateByConfig(h.endDate, storeConfig?.dateFormat)}</td>
                            <td>{h.leaveType?.leaveName || 'Leave'}</td>
                            <td>
                              <span style={{
                                fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
                                border: '1px solid ' + (h.status === 'APPROVED' ? 'var(--primary-color-alpha)' : 'rgba(168, 100, 8, 0.3)'),
                                color: h.status === 'APPROVED' ? 'var(--success-color)' : 'var(--warning-color)'
                              }}>
                                {prettyStatus(h.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ color: '#8C8D94', fontSize: '0.85rem' }}>No other leaves this month.</div>
                  )}
                  {leaveHistory.length > 3 && (
                    <div style={{ color: '#8C8D94', fontSize: '0.75rem', marginTop: '12px', textAlign: 'center', fontWeight: '500' }}>
                      +{leaveHistory.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </div>
            
        </Drawer>
      )}

      <Modal
        open={!!rejectPromptReq}
        onClose={() => setRejectPromptReq(null)}
        title="Reject request"
        subtitle="Provide a reason for rejecting this leave request. The remark is visible to the employee."
        size="sm"
        footer={(
          <>
            <Button variant="outline" onClick={() => setRejectPromptReq(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={confirmReject}
              disabled={!rejectPromptRemarks?.trim() || actionMutation.isPending}
            >
              {actionMutation.isPending ? 'Rejecting…' : 'Confirm reject'}
            </Button>
          </>
        )}
      >
        <textarea
          value={rejectPromptRemarks}
          onChange={(e) => setRejectPromptRemarks(e.target.value)}
          placeholder="Enter rejection reason (mandatory)…"
          className={styles.rejectTextarea}
          autoFocus
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.mode === 'bulk'
          ? `${confirmVerb} ${confirmCount} request${confirmCount === 1 ? '' : 's'}?`
          : `${confirmVerb} this leave request?`}
        body={confirm?.mode === 'bulk'
          ? `${confirmVerb} the selected leave requests. This cannot be undone from this screen.`
          : `${confirm?.req?.staffName || 'This staff member'} · ${formatDateByConfig(confirm?.req?.startDate, storeConfig?.dateFormat)} – ${formatDateByConfig(confirm?.req?.endDate, storeConfig?.dateFormat)}`}
        confirmLabel={confirmVerb}
        danger={confirm?.action === 'reject'}
        busy={actionMutation.isPending || bulkActionMutation.isPending}
        onClose={() => { if (!actionMutation.isPending && !bulkActionMutation.isPending) setConfirm(null); }}
        onConfirm={runConfirm}
      />
    </div>
  );
};

export default ManagerApprovalPortal;
