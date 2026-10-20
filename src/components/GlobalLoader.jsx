import React, { useState, useEffect } from 'react';
import styles from './GlobalLoader.module.scss';

const GlobalLoader = () => {
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    const handleStart = () => setActiveRequests(prev => prev + 1);
    const handleEnd = () => setActiveRequests(prev => Math.max(0, prev - 1));

    window.addEventListener('api_call_start', handleStart);
    window.addEventListener('api_call_end', handleEnd);

    return () => {
      window.removeEventListener('api_call_start', handleStart);
      window.removeEventListener('api_call_end', handleEnd);
    };
  }, []);

  if (activeRequests <= 0) return null;

  return (
    <div className={styles.backdrop} role="status" aria-live="polite" aria-label="Loading">
      <div className={styles.spinner} />
    </div>
  );
};

export default GlobalLoader;
