import React from 'react';
import { useToast } from '../context/ToastContext';
import styles from './Toast.module.scss';

const Toast = () => {
  const { toast, hideToast } = useToast();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className={`${styles.container} ${isSuccess ? styles.success : styles.error}`}>
      <span>{toast.message}</span>
      <button className={styles.button} onClick={hideToast}>
        OK
      </button>
    </div>
  );
};

export default Toast;
