import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useStaffList } from '../hooks/queries';
import RegularizationDashboard from '../components/RegularizationDashboard';
import styles from './RegularizationApprovals.module.scss';
import '../styles/main.scss';

const RegularizationApprovals = () => {
  const { tenantId, storeId } = useAuth();
  const { staffList } = useStaffList();

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
