import React, { useState, useEffect } from 'react';
import styles from './EmployeeDashboard.module.scss';
import StatusBadge from '../components/StatusBadge';

import { apiService } from '../api/apiService';

import { useAuth } from '../context/AuthContext';

const EmployeeDashboard = () => {
  const { user, tenantId, storeId } = useAuth();
  const staffId = user?.staffId || user?.id || 1;
  const [balances, setBalances] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const historyData = await apiService.get(`/leaves/applications/staff/${staffId}`);
        setHistory(historyData);
        
        const balanceData = await apiService.get(`/leaves/balances/all/${staffId}?tenantId=${tenantId}&storeId=${storeId}`);
        const mappedBalances = balanceData.map((b, index) => {
          const colors = ['blue', 'green', 'red', 'yellow'];
          return {
            type: b.typeName,
            code: b.code || b.typeName.substring(0, 3).toUpperCase(),
            available: b.available,
            annualAllotment: b.annualAllotment || 20,
            icon: '📋',
            accrued: 'Live Balance',
            color: colors[index % colors.length]
          };
        });
        setBalances(mappedBalances);
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [staffId]);

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <h1>Employee Dashboard</h1>
        <p>Overview of your leave balances and recent activity.</p>
        {/* Buttons would go here in the actual layout if needed */}
      </div>

      <div className={styles.cardsContainer}>
        {balances.map((b, idx) => (
          <div key={idx} className={`${styles.balanceCard} ${styles[b.color]}`}>
            <div className={styles.cardHeader}>
              <div className={styles.iconBox}>{b.icon}</div>
              <span className={styles.badge}>{b.code}</span>
            </div>
            <h3>{b.type}</h3>
            <div className={styles.valueRow}>
              <span className={styles.bigValue}>{b.available.toFixed(1)}</span>
              <span className={styles.unit}>Days Available</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} style={{ width: `${(b.available / b.annualAllotment) * 100}%` }}></div>
            </div>
            <div className={styles.accrualText}>{b.accrued}</div>
          </div>
        ))}
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>Recent Requests</h2>
          <button className={styles.viewAllBtn}>View All</button>
        </div>
        
        <table className={styles.requestsTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Days</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.length > 0 ? history.map((req, i) => (
              <tr key={i}>
                <td className={styles.reqId}>REQ-{8900 + req.id}</td>
                <td>{req.leaveType?.name || 'Leave'}</td>
                <td>{req.startDate} - {req.endDate}</td>
                <td>{req.requestedDays}</td>
                <td><StatusBadge status={req.status} /></td>
                <td>
                  <button className={styles.actionBtn}>⋮</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                  No recent leave requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
