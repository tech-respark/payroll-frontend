import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import styles from './RegularizationDashboard.module.scss';

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
};

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  return name.charAt(0).toUpperCase();
};

const RegularizationDashboard = ({ staffList }) => {
  const { tenantId, storeId, user } = useAuth();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaffId, setSelectedStaffId] = useState('All');
  
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [isMutating, setIsMutating] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const queryClient = useQueryClient();

  const { data: requestData, isLoading: loading } = useQuery({
    queryKey: ['regularizationRequests', tenantId, storeId, activeTab, fromDate, toDate, selectedStaffId, page, rowsPerPage],
    queryFn: async () => {
      const payload = {
        tenantId,
        storeId,
        applicationName: 'RESPARK',
        fromDate,
        toDate,
        currentStatus: activeTab,
        staffId: selectedStaffId === 'All' ? null : Number(selectedStaffId),
        pageModel: {
          recordsPerPage: rowsPerPage,
          pageNumber: page + 1
        }
      };

      const res = await apiService.post('/regularizationRequests', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      return res.data || { regularizationRequests: [], pageModel: { totalNumberOfRecords: 0 } };
    }
  });

  const requests = requestData?.regularizationRequests || [];
  const totalCount = requestData?.pageModel?.totalNumberOfRecords || 0;
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;

  const handleAction = async (action, reqIds) => {
    if (!reqIds || reqIds.length === 0) return;
    setIsMutating(true);
    try {
      const payload = reqIds.map(id => ({
        personnelAttendanceId: id,
        modifiedBy: user?.id || 1,
        currentStatus: action,
        remark: ""
      }));

      await apiService.post('/flagRegularizationRequests', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      
      setSelectedRequests([]);
      queryClient.invalidateQueries({ queryKey: ['regularizationRequests'] });
    } catch (err) {
      console.error(`Failed to ${action} requests`, err);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRequests(requests.map(r => r.personnelAttendanceId));
    } else {
      setSelectedRequests([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter(reqId => reqId !== id));
    } else {
      setSelectedRequests([...selectedRequests, id]);
    }
  };

  const renderPunches = (punches) => {
    if (!punches || punches.length === 0) return null;
    return (
      <div className={styles.punchBlocksContainer}>
        {punches.map((punch, index) => {
          const isOut = index % 2 !== 0;
          return (
            <div
              key={index}
              className={`${styles.punchBlock} ${isOut ? styles.punchOut : styles.punchIn}`}
            >
              {formatTime(punch.punchTime)} ({isOut ? 'OUT' : 'IN'})
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.dashboardWrapper}>
      
      {/* Top Filter Bar */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterInputs}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>From Date</label>
              <input 
                type="date" 
                className={styles.inputField} 
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)} 
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>To Date</label>
              <input 
                type="date" 
                className={styles.inputField} 
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)} 
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Staff Member</label>
              <select 
                className={styles.inputField} 
                value={selectedStaffId} 
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="All">All Staff</option>
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.statusToggleGroup}>
            <button 
              className={activeTab === 'PENDING' ? styles.statusToggleBtnActive : styles.statusToggleBtn}
              onClick={() => { setActiveTab('PENDING'); setPage(0); }}
            >
              PENDING
            </button>
            <button 
              className={activeTab === 'APPROVED' ? styles.statusToggleBtnActive : styles.statusToggleBtn}
              onClick={() => { setActiveTab('APPROVED'); setPage(0); }}
            >
              APPROVED
            </button>
            <button 
              className={activeTab === 'REJECTED' ? styles.statusToggleBtnActive : styles.statusToggleBtn}
              onClick={() => { setActiveTab('REJECTED'); setPage(0); }}
            >
              REJECTED
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'PENDING' && selectedRequests.length > 0 && (
        <div className={styles.actionsCell} style={{ marginBottom: '16px' }}>
          <button className={`${styles.neonBtn} ${styles.btnApprove}`} onClick={() => handleAction('APPROVED', selectedRequests)}>
            Approve Selected ({selectedRequests.length})
          </button>
          <button className={`${styles.neonBtn} ${styles.btnReject}`} onClick={() => handleAction('REJECTED', selectedRequests)}>
            Reject Selected ({selectedRequests.length})
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {activeTab === 'PENDING' && (
                  <th className={styles.th} style={{ width: '40px' }}>
                    <input 
                      type="checkbox"
                      className={styles.checkbox}
                      checked={requests.length > 0 && selectedRequests.length === requests.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className={styles.th}>Staff Name</th>
                <th className={styles.th}>Attendance Date</th>
                <th className={styles.th}>Punch Time</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Attendance Data</th>
                {activeTab === 'PENDING' && <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'PENDING' ? 7 : 6} className={styles.td} style={{ textAlign: 'center', padding: '40px' }}>
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'PENDING' ? 7 : 6} className={styles.td} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No {activeTab.toLowerCase()} requests available.
                  </td>
                </tr>
              ) : (
                requests.map((row) => {
                  const statusClass = row.currentStatus === 'APPROVED' ? styles.statusApproved : 
                                     row.currentStatus === 'REJECTED' ? styles.statusRejected : 
                                     styles.statusPending;

                  return (
                    <tr key={row.personnelAttendanceId} className={styles.tr}>
                      {activeTab === 'PENDING' && (
                        <td className={styles.td}>
                          <input 
                            type="checkbox"
                            className={styles.checkbox}
                            checked={selectedRequests.includes(row.personnelAttendanceId)}
                            onChange={() => handleSelectOne(row.personnelAttendanceId)}
                          />
                        </td>
                      )}
                      <td className={styles.td}>
                        <div className={styles.staffCell}>
                          <div className={styles.avatar}>
                            {getInitials(row.personnelName)}
                          </div>
                          <div>
                            <div className={styles.staffName}>{row.personnelName}</div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.td}>{row.attendanceDate}</td>
                      <td className={styles.td}>{formatTime(row.punchTime)}</td>
                      <td className={styles.td}>
                        <span className={`${styles.statusPill} ${statusClass}`}>
                          {row.currentStatus}
                        </span>
                      </td>
                      <td className={styles.td}>
                        {renderPunches(row.individualPunchesList)}
                      </td>
                      {activeTab === 'PENDING' && (
                        <td className={styles.td} style={{ textAlign: 'right' }}>
                          <div className={styles.actionsCell} style={{ justifyContent: 'flex-end' }}>
                            <button 
                              className={`${styles.neonBtn} ${styles.btnApprove}`}
                              onClick={() => handleAction('APPROVED', [row.personnelAttendanceId])}
                              disabled={isMutating}
                            >
                              Approve
                            </button>
                            <button 
                              className={`${styles.neonBtn} ${styles.btnReject}`}
                              onClick={() => handleAction('REJECTED', [row.personnelAttendanceId])}
                              disabled={isMutating}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <div className={styles.pageControls}>
            <span>Rows per page:</span>
            <select 
              className={styles.inputField} 
              style={{ padding: '4px 8px', fontSize: '13px' }}
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <span>
              {totalCount === 0 ? 0 : (page * rowsPerPage) + 1} - {Math.min((page + 1) * rowsPerPage, totalCount)} of {totalCount}
            </span>
            <div className={styles.pageArrows}>
              <button 
                className={styles.arrowBtn}
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{ opacity: page === 0 ? 0.3 : 1, cursor: page === 0 ? 'default' : 'pointer' }}
              >
                &lsaquo;
              </button>
              <button 
                className={styles.arrowBtn}
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                style={{ opacity: page >= totalPages - 1 ? 0.3 : 1, cursor: page >= totalPages - 1 ? 'default' : 'pointer' }}
              >
                &rsaquo;
              </button>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default RegularizationDashboard;
