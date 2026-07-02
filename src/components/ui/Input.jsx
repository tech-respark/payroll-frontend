import React from 'react';
import styles from './ui.module.scss';

export const Input = ({ label, id, className = '', containerClassName = '', ...props }) => {
  return (
    <div className={`${styles.formGroup} ${containerClassName}`}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input id={id} className={`${styles.input} ${className}`} {...props} />
    </div>
  );
};
