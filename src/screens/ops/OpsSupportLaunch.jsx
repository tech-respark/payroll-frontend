import React, { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { apiService } from '../../api/apiService';
import { useAuth } from '../../context/AuthContext';
import styles from './opsShared.module.scss';

const OpsSupportLaunch = () => {
  const history = useHistory();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    const code = new URLSearchParams(location.search).get('code');
    if (!code) {
      setError('That support link is missing its code.');
      return undefined;
    }
    if (started.current) return undefined;
    started.current = true;
    apiService.get(`/ops/support-handoff/${encodeURIComponent(code)}`)
      .then((res) => {
        const data = res.data || res;
        if (!data?.token) {
          setError('The support session could not be opened.');
          return;
        }
        login(data, { support: true });
        history.replace('/home');
      })
      .catch((err) => {
        setError(err.message || 'That support link has expired.');
      });
    return undefined;
  }, [history, location.search, login]);

  return (
    <div className={styles.page}>
      <p className={styles.lead}>{error || 'Opening a 30-minute support session…'}</p>
    </div>
  );
};

export default OpsSupportLaunch;
