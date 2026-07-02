import React from 'react';
import styles from './ui.module.scss';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const variantClass = styles[`btn-${variant}`] || styles.btn;
  return (
    <button className={`${styles.btn} ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
