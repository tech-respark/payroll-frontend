import React from 'react';
import { useStaffList } from '../hooks/queries';
import RegularizationDashboard from '../components/RegularizationDashboard';
import styles from './RegularizationApprovals.module.scss';
import '../styles/main.scss';

const RegularizationApprovals = () => {
  const { staffList } = useStaffList();

  return (
    <div className={`dashboard ${styles.page}`}>
      <div className={`staff-content ${styles.staffContent}`}>
        <RegularizationDashboard staffList={staffList} />
      </div>
    </div>
  );
};

export default RegularizationApprovals;
