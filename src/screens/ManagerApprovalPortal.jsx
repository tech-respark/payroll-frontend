import React, { useState, useEffect } from 'react';
import styles from './ManagerApprovalPortal.module.scss';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const ManagerApprovalPortal = ({ managerId = 1 }) => {
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [currentBalance, setCurrentBalance] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const data = await apiService.get(`/leaves/applications/pending?tenantId=${tenantId}&storeId=${storeId}`);
        setRequests(data);
      } catch (err) {
        console.error("Failed to fetch pending requests", err);
      }
    };
    if (tenantId && storeId) fetchPending();
  }, [tenantId, storeId]);

  const openDetails = async (req) => {
    setSelectedReq(req);
    setRemarks('');
    setCurrentBalance(null);
    setLeaveHistory([]);
    setIsModalOpen(true);

    try {
      const balanceData = await apiService.get(`/leaves/balances/all/${req.staffId}?tenantId=${tenantId}&storeId=${storeId}`);
      const targetBalance = balanceData.find(b => b.typeId === req.leaveType?.id);
      if (targetBalance) {
        setCurrentBalance(targetBalance.available);
      }
      
      const historyData = await apiService.get(`/leaves/applications/staff/${req.staffId}`);
      // Filter for this month
      const currentMonth = new Date().getMonth();
      const thisMonthHistory = historyData.filter(h => new Date(h.startDate).getMonth() === currentMonth);
      setLeaveHistory(thisMonthHistory);
      
    } catch (err) {
      console.error("Failed to fetch details", err);
    }
  };

  const closeDetails = () => {
    setSelectedReq(null);
    setIsModalOpen(false);
  };

  const handleAction = async (action, req = selectedReq) => {
    if (!req) return;
    
    let endpoint = '';
    if (action === 'approve') {
      endpoint = req.status === 'CANCELLATION_REQUESTED' ? `approve-cancellation` : `approve`;
    } else if (action === 'reject') {
      endpoint = `reject`;
    }

    // Capture remarks if we are currently looking at this request in the modal, else empty string
    const finalRemarks = req === selectedReq ? remarks : '';

    try {
      await apiService.post(`/leaves/${req.id}/${endpoint}`, { managerId, remarks: finalRemarks });
      showToast(`Request ${action}d successfully`, 'success');
      setRequests(prev => prev.filter(r => r.id !== req.id));
      setSelectedIds(prev => prev.filter(id => id !== req.id));
      if (req === selectedReq) {
        closeDetails();
      }
    } catch (err) {
      showToast(err.message || "Action failed", 'error');
    }
  };
  
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        const req = requests.find(r => r.id === id);
        if (req) {
          let endpoint = '';
          if (action === 'approve') {
            endpoint = req.status === 'CANCELLATION_REQUESTED' ? `approve-cancellation` : `approve`;
          } else if (action === 'reject') {
            endpoint = `reject`;
          }
          await apiService.post(`/leaves/${req.id}/${endpoint}`, { managerId, remarks: '' });
        }
      }
      showToast(`Bulk ${action}d ${selectedIds.length} requests successfully`, 'success');
      setRequests(prev => prev.filter(r => !selectedIds.includes(r.id)));
      setSelectedIds([]);
    } catch (err) {
      showToast(err.message || "Bulk action failed", 'error');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(requests.slice(0, 3).map(r => r.id));
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
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Manager Approval Portal</h1>
          <p>Review and process pending leave/regularization requests for your team.</p>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeaderSection}>
          <div className={styles.tableTitle}>Pending Requests</div>
          {selectedIds.length > 0 && (
            <div className={styles.bulkActions}>
              <button className={styles.bulkBtnReject} onClick={() => handleBulkAction('reject')}>✕ Reject ({selectedIds.length})</button>
              <button className={styles.bulkBtn} onClick={() => handleBulkAction('approve')}>✓ Approve ({selectedIds.length})</button>
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
                  checked={requests.length > 0 && selectedIds.length === Math.min(requests.length, 3)} 
                />
              </th>
              <th>STAFF ID & NAME</th>
              <th>LEAVE TYPE</th>
              <th>DATES</th>
              <th>TOTAL DAYS</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {requests.slice(0, 3).map((req, idx) => {
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
                      <span className={styles.empDept}>REQ-{8900 + req.id} • Staff ID: {req.staffId}</span>
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
            SHOWING 1-{Math.min(requests.length, 3)} OF {requests.length} PENDING REQUESTS
          </div>
          <div className={styles.pagination}>
            <button>&lt;</button>
            <button className={styles.active}>1</button>
            <button>&gt;</button>
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
                  <p className={styles.modalMeta}>Staff ID: {selectedReq.staffId} • Applied {new Date(selectedReq.createdAt).toLocaleDateString() || 'Recently'}</p>
                  <p className={styles.modalTxId}>TRANSACTION ID: REQ-{8900 + selectedReq.id}</p>
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
                      <p className={styles.val}>{new Date(selectedReq.startDate).toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'})} — {new Date(selectedReq.endDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</p>
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
                            <td>{new Date(h.startDate).toLocaleDateString('en-US', {month: 'short', day: '2-digit'})} - {new Date(h.endDate).toLocaleDateString('en-US', {day: '2-digit'})}</td>
                            <td>{h.leaveType?.leaveName || 'Leave'}</td>
                            <td>
                              <span style={{
                                fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600,
                                border: '1px solid ' + (h.status === 'APPROVED' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'),
                                color: h.status === 'APPROVED' ? '#93C5FD' : '#F59E0B'
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
              <button className={styles.rejectBtn} onClick={() => handleAction('reject')}>Reject Request</button>
              <button className={styles.approveBtn} onClick={() => handleAction('approve')}>Approve Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerApprovalPortal;
