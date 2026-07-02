import React from 'react';
import styles from './ui.module.scss';

export const Card = ({ children, className = '', ...props }) => (
  <div className={`${styles.card} ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`${styles.cardHeader} ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody = ({ children, className = '', ...props }) => (
  <div className={`${styles.cardBody} ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`${styles.cardFooter} ${className}`} {...props}>
    {children}
  </div>
);
