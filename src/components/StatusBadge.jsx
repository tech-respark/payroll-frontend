import React from 'react';
import styles from './StatusBadge.module.scss';

const StatusBadge = ({ status }) => {
  let badgeClass = '';
  let dotClass = '';
  let label = status;

  if (!status) return null;

  switch (status.toUpperCase()) {
    case 'APPROVED':
      badgeClass = styles.badgeApproved;
      dotClass = styles.dotApproved;
      label = 'Approved';
      break;
    case 'PENDING':
    case 'CANCELLATION_REQUESTED':
      badgeClass = styles.badgePending;
      dotClass = styles.dotPending;
      label = status.toUpperCase() === 'CANCELLATION_REQUESTED' ? 'Cancel Requested' : 'Pending';
      break;
    case 'REJECTED':
    case 'CANCELLED':
      badgeClass = styles.badgeRejected;
      dotClass = styles.dotRejected;
      label = status.toUpperCase() === 'CANCELLED' ? 'Cancelled' : 'Rejected';
      break;
    default:
      badgeClass = styles.badgeDefault;
      dotClass = styles.dotDefault;
  }

  return (
    <span className={`${styles.statusBadge} ${badgeClass}`}>
      <span className={`${styles.dot} ${dotClass}`}></span>
      {label}
    </span>
  );
};

export default StatusBadge;
