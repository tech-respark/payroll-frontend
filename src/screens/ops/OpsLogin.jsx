import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';
import { useToast } from '../../context/ToastContext';
import { LuShield } from 'react-icons/lu';
import styles from '../Login.module.scss';

const OpsLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const history = useHistory();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('Please enter both username and password.', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.post('/ops/login', { username, password });
      if (response && response.success && response.principalType === 'PLATFORM') {
        login(response);
        showToast('Signed in to ops.', 'success');
        history.replace('/ops');
      } else {
        showToast(response?.message || 'Invalid credentials.', 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Failed to connect to the server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logoMark} aria-hidden="true">
            <LuShield size={24} strokeWidth={1.75} />
          </div>
          <h1 className={styles.brand}>Relfor <span className={styles.brandAccent}>Ops</span></h1>
          <p className={styles.subtitle}>Internal console. Client staff cannot sign in here.</p>
        </div>
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign in to ops'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OpsLogin;
