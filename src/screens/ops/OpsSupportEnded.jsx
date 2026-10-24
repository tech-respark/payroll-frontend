import React from 'react';
import styles from './opsShared.module.scss';

const OpsSupportEnded = () => (
  <div className={styles.page}>
    <h2 className={styles.sectionTitle}>Support session ended</h2>
    <p className={styles.lead}>This tab is no longer signed in as the client. Close it and continue in the ops console.</p>
  </div>
);

export default OpsSupportEnded;
