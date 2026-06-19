import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import RegularizationDashboard from '../components/RegularizationDashboard';
import styles from './RegularizationApprovals.module.scss';
import '../styles/main.scss';

const RegularizationApprovals = () => {
  const { tenantId, storeId } = useAuth();
  const [staffList, setStaffList] = useState([]);
  
  useEffect(() => {
    const fetchStaffList = async () => {
      try {
        const res = await apiService.get(`/personnel/all?tenantId=${tenantId}&storeId=${storeId}`);
        setStaffList(res.data || res || []);
      } catch (err) {
        console.error('Failed to fetch staff', err);
      }
    };
    fetchStaffList();
  }, [tenantId, storeId]);

  return (
    <div className="dashboard">
      <h2>Regularization Approvals</h2>
      <div className={`staff-content ${styles.staffContent}`}>
        <RegularizationDashboard staffList={staffList} />
      </div>
    </div>
  );
};

export default RegularizationApprovals;
