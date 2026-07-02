import React from 'react';
import styles from './ui.module.scss';

export const Badge = ({ children, variant = 'default', className = '', ...props }) => {
  const variantClass = styles[`badge-${variant}`] || '';
  return (
    <span className={`${styles.badge} ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
};
