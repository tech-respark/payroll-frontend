import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './ManagerApprovalPortal.module.scss';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStoreConfig } from '../hooks/queries';
import { formatDateByConfig } from '../helpers/dateUtils';

const ManagerApprovalPortal = ({ managerId = 1 }) => {
  const [selectedReq, setSelectedReq] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [currentBalance, setCurrentBalance] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const { tenantId, storeId } = useAuth();
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
      const targetBalance = selectedStaffData.balanceData.find(b => b.typeId === selectedReq.leaveType?.id);
      setCurrentBalance(targetBalance ? targetBalance.available : null);
      
      const currentMonth = new Date().getMonth();
      const thisMonthHistory = selectedStaffData.historyData.filter(h => new Date(h.startDate).getMonth() === currentMonth);
      setLeaveHistory(thisMonthHistory);
    }
  }, [selectedStaffData, selectedReq]);

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
      return await apiService.post(`/leaves/${reqId}/${endpoint}`, { managerId, remarks });
    },
    onSuccess: (data, variables) => {
      if (variables.reqId === selectedReq?.id) {
        closeDetails();
      }
      setSelectedIds(prev => prev.filter(id => id !== variables.reqId));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
    }
  });

  const handleAction = (action, req = selectedReq) => {
    if (!req) return;
    let endpoint = action === 'approve' 
      ? (req.status === 'CANCELLATION_REQUESTED' ? 'approve-cancellation' : 'approve')
      : (req.status === 'CANCELLATION_REQUESTED' ? 'reject-cancellation' : 'reject');
    const finalRemarks = req === selectedReq ? remarks : '';
    
    actionMutation.mutate(
      { reqId: req.id, endpoint, remarks: finalRemarks },
      {
        onSuccess: () => showToast(`Request ${action}d successfully`, 'success'),
        onError: (err) => showToast(err.message || "Action failed", 'error')
      }
    );
  };

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, ids }) => {
      for (const id of ids) {
        const req = requests.find(r => r.id === id);
        if (req) {
          let endpoint = action === 'approve' 
            ? (req.status === 'CANCELLATION_REQUESTED' ? 'approve-cancellation' : 'approve') 
            : (req.status === 'CANCELLATION_REQUESTED' ? 'reject-cancellation' : 'reject');
          await apiService.post(`/leaves/${req.id}/${endpoint}`, { managerId, remarks: action === 'approve' ? 'Bulk Approved' : 'Bulk Rejected' });
        }
      }
    },
    onSuccess: (_, variables) => {
      showToast(`Bulk ${variables.action}d ${variables.ids.length} requests successfully`, 'success');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
    },
    onError: (err) => {
      showToast(err.message || "Bulk action failed", 'error');
    }
  });

  const handleBulkAction = (action) => {
    if (selectedIds.length === 0) return;
    bulkActionMutation.mutate({ action, ids: selectedIds });
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

  return (
    <div className={styles.container}>
      {/* <div className={styles.header}>
        <div className={styles.titleSection}>
          <p>Review and process pending leave/regularization requests for your team.</p>
        </div>
      </div> */}

      <div className={styles.tableCard}>
        <div className={styles.tableHeaderSection}>
          <div className={styles.tableTitle}>Pending Requests</div>
          {selectedIds.length > 0 && (
            <div className={styles.bulkActions}>
              <button className={styles.bulkBtnReject} onClick={() => handleBulkAction('reject')} disabled={bulkActionMutation.isPending}>
                {bulkActionMutation.isPending && bulkActionMutation.variables?.action === 'reject' ? 'Processing...' : `✕ Reject (${selectedIds.length})`}
              </button>
              <button className={styles.bulkBtn} onClick={() => handleBulkAction('approve')} disabled={bulkActionMutation.isPending}>
                {bulkActionMutation.isPending && bulkActionMutation.variables?.action === 'approve' ? 'Processing...' : `✓ Approve (${selectedIds.length})`}
              </button>
            </div>
          )}
        </div>
        <table className={styles.approvalsTable}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={requests.length > 0 && selectedIds.length === requests.length} 
                />
              </th>
              <th>STAFF NAME</th>
              <th>LEAVE TYPE</th>
              <th>DATES</th>
              <th>TOTAL DAYS</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req, idx) => {
              const staffName = req.staffName || "Unknown Staff";
              return (
              <tr key={req.id} onClick={() => openDetails(req)} className={styles.clickableRow}>
                <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    onChange={(e) => handleSelectOne(e, req.id)} 
                    checked={selectedIds.includes(req.id)} 
                  />
                </td>
                <td>
                  <div className={styles.empCell}>
                    <div className={styles.avatar}>{getInitials(staffName)}</div>
                    <div className={styles.empInfo}>
                      <span className={styles.empName}>{staffName}</span>
                      <span className={styles.empDept}>Leave Application</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.leaveTypeTag + " " + getLeaveTypeClass(req.leaveType?.leaveName)}>
                    <div className={styles.colorBar}></div>
                    <span>{req.leaveType?.leaveName || 'Leave'}</span>
                  </div>
                </td>
                <td>{req.startDate} - {req.endDate}</td>
                <td>{req.requestedDays} {req.requestedDays == 1 ? 'Day' : 'Days'}</td>
                <td>
                  <span className={styles.kpiBadge + " " + styles.amber} style={{fontSize: '0.65rem', padding: '4px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 600}}>
                    ● {req.status}
                  </span>
                </td>
                <td className={styles.actionCell} onClick={e => e.stopPropagation()}>
                  <button className={styles.iconBtn} onClick={() => handleAction('approve', req)} title="Approve">✓</button>
                  <button className={styles.iconBtnReject} onClick={() => handleAction('reject', req)} title="Reject">✕</button>
                </td>
              </tr>
            );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#8C8D94' }}>No pending requests.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className={styles.tableFooter}>
          <div className={styles.showingText}>
            SHOWING {requests.length} PENDING REQUEST{requests.length !== 1 ? 'S' : ''}
          </div>
        </div>
      </div>

      {isModalOpen && selectedReq && (
        <div className={styles.modalOverlay} onClick={closeDetails}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalProfile}>
                <div className={styles.modalAvatar}>{getInitials(selectedReq.staffName)}</div>
                <div className={styles.modalUserInfo}>
                  <h2>{selectedReq.staffName || "Unknown Staff"}</h2>
                  <p className={styles.modalMeta}>Applied {formatDateByConfig(selectedReq.createdAt, storeConfig?.dateFormat) || 'Recently'}</p>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={closeDetails}>×</button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.leftColumn}>
                <div>
                  <h3 className={styles.sectionHeader}>APPLIED LEAVE DETAIL</h3>
                  <div className={styles.leaveDetails}>
                    <div className={styles.detailItem}>
                      <label>LEAVE TYPE</label>
                      <p className={styles.val}>{selectedReq.leaveType?.leaveName || 'Leave'}</p>
                    </div>
                    <div className={styles.detailItem}>
                      <label>TOTAL REQUESTED</label>
                      <p className={styles.valLarge}>{selectedReq.requestedDays} {selectedReq.requestedDays == 1 ? 'Day' : 'Days'}</p>
                    </div>
                    <div className={styles.detailItem + " " + styles.fullWidth}>
                      <label>DATES</label>
                      <p className={styles.val}>{formatDateByConfig(selectedReq.startDate, storeConfig?.dateFormat)} - {formatDateByConfig(selectedReq.endDate, storeConfig?.dateFormat)}</p>
                    </div>
                    <div className={styles.detailItem + " " + styles.fullWidth}>
                      <label>REASON</label>
                      <p className={styles.reasonText}>{selectedReq.reason || 'No reason provided.'}</p>
                    </div>
                  </div>
                </div>
                
                <div className={styles.remarksSection}>
                  <label>MANAGER REMARKS</label>
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
                  <h3 className={styles.sectionHeader + " " + styles.amberBar}>BALANCE OVERVIEW</h3>
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
                  <h3 className={styles.sectionHeader}>LEAVE HISTORY (THIS MONTH)</h3>
                  {leaveHistory.length > 0 ? (
                    <table className={styles.historyTable}>
                      <thead>
                        <tr>
                          <th>DATES</th>
                          <th>TYPE</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveHistory.slice(0, 3).map(h => (
                          <tr key={h.id}>
                            <td>{formatDateByConfig(h.startDate, storeConfig?.dateFormat)} - {formatDateByConfig(h.endDate, storeConfig?.dateFormat)}</td>
                            <td>{h.leaveType?.leaveName || 'Leave'}</td>
                            <td>
                              <span style={{
                                fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600,
                                border: '1px solid ' + (h.status === 'APPROVED' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'),
                                color: h.status === 'APPROVED' ? '#2563EB' : '#D97706'
                              }}>
                                {h.status}
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
            
            <div className={styles.modalFooter}>
              <button className={styles.rejectBtn} onClick={() => handleAction('reject')} disabled={actionMutation.isPending}>
                {actionMutation.isPending && actionMutation.variables?.endpoint === 'reject' ? 'Processing...' : 'Reject Request'}
              </button>
              <button className={styles.approveBtn} onClick={() => handleAction('approve')} disabled={actionMutation.isPending}>
                {actionMutation.isPending && actionMutation.variables?.endpoint !== 'reject' ? 'Processing...' : 'Approve Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerApprovalPortal;
