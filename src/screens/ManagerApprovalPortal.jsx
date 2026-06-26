import React, { useState, useEffect } from 'react';
import styles from './ManagerApprovalPortal.module.scss';
import StatusBadge from '../components/StatusBadge';
import SidePanel from '../components/SidePanel';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const ManagerApprovalPortal = ({ managerId = 1 }) => {
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [currentBalance, setCurrentBalance] = useState(null);

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
    setCurrentBalance(null); // Reset while loading
    setIsPanelOpen(true);

    try {
      const balanceData = await apiService.get(`/leaves/balances/all/${req.staffId}?tenantId=${tenantId}&storeId=${storeId}`);
      // find balance for this specific leave type
      const targetBalance = balanceData.find(b => b.typeId === req.leaveType?.id);
      if (targetBalance) {
        setCurrentBalance(targetBalance.available);
      }
    } catch (err) {
      console.error("Failed to fetch balance", err);
    }
  };

  const closeDetails = () => {
    setSelectedReq(null);
    setIsPanelOpen(false);
  };

  const handleAction = async (action) => {
    if (!selectedReq) return;
    
    let endpoint = '';
    if (action === 'approve') {
      endpoint = selectedReq.status === 'CANCELLATION_REQUESTED' 
        ? `approve-cancellation` 
        : `approve`;
    } else if (action === 'reject') {
      if (!remarks) {
        showToast("Remarks are mandatory for rejection.", 'error');
        return;
      }
      endpoint = `reject`;
    }

    try {
      await apiService.post(`/leaves/${selectedReq.id}/${endpoint}`, { managerId, remarks });
      showToast(`Request ${action}d successfully`, 'success');
      setRequests(requests.filter(r => r.id !== selectedReq.id));
      closeDetails();
    } catch (err) {
      showToast(err.message || "Action failed", 'error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Manager Approval Portal</h1>
          <p>Review and process pending leave requests.</p>
        </div>
        <div className={styles.pendingBadge}>
          <span className={styles.dot}></span>
          {requests.length} Pending
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.approvalsTable}>
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Leave Type</th>
              <th>Dates</th>
              <th>Total Days</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id} onClick={() => openDetails(req)} className={styles.clickableRow}>
                <td>
                  <div className={styles.empCell}>
                    <div className={styles.avatar}>ID</div>
                    <div className={styles.empInfo}>
                      <span className={styles.empName}>Staff ID: {req.staffId}</span>
                      <span className={styles.empDept}>Transaction ID: REQ-{8900 + req.id}</span>
                    </div>
                  </div>
                </td>
                <td>{req.leaveType?.name || 'Leave'}</td>
                <td>{req.startDate} - {req.endDate}</td>
                <td>{req.requestedDays}</td>
                <td><StatusBadge status={req.status} /></td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No pending requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={closeDetails} 
        title="Request Details"
      >
        {selectedReq && (
          <div className={styles.detailsContent}>
            <div className={styles.txId}>Transaction ID: REQ-{8900 + selectedReq.id}</div>
            
            <div className={styles.profileSection}>
              <div className={styles.profileAvatar}>ID</div>
              <div>
                <h3 className={styles.profileName}>Staff ID: {selectedReq.staffId}</h3>
                <p className={styles.profileRole}>Requested on {selectedReq.createdAt || 'Recent'}</p>
              </div>
            </div>

            {/* Removed hardcoded overlapping leaves warning */}

            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <label>Leave Type</label>
                <span>{selectedReq.leaveType?.leaveName || 'Leave'}</span>
              </div>
              <div className={styles.summaryItem}>
                <label>Total Requested</label>
                <span className={styles.highlight}>{selectedReq.requestedDays} Days</span>
              </div>
            </div>

            <div className={styles.reasonSection}>
              <label>Reason</label>
              <p>{selectedReq.reason || 'No reason provided.'}</p>
            </div>

            <div className={styles.balanceImpact}>
              <div className={styles.impactRow}>
                <span>Current Balance</span>
                <span className={styles.valNormal}>{currentBalance !== null ? currentBalance.toFixed(1) : 'Loading...'}</span>
              </div>
              <div className={styles.impactRow}>
                <span>Deduction</span>
                <span className={styles.valDeduct}>-{selectedReq.requestedDays}</span>
              </div>
              <div className={styles.impactDivider}></div>
              <div className={styles.impactRow}>
                <span className={styles.projLabel}>Projected Balance</span>
                <span className={styles.valProjected}>{currentBalance !== null ? (currentBalance - selectedReq.requestedDays).toFixed(1) : '...'}</span>
              </div>
            </div>

            <div className={styles.remarksSection}>
              <label>Manager Remarks</label>
              <textarea 
                rows="3" 
                placeholder="Optional for approval, required for rejection."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              ></textarea>
            </div>

            <div className={styles.actionButtons}>
              <button className={styles.rejectBtn} onClick={() => handleAction('reject')}>Reject</button>
              <button className={styles.approveBtn} onClick={() => handleAction('approve')}>Approve Request</button>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
};

export default ManagerApprovalPortal;
