import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import styles from './Login.module.scss';

const Login = () => {
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
      // The API endpoint we found earlier: POST /login
      const response = await apiService.post('/login', {
        username,
        password
      });

      if (response && response.success) {
        // We log the user in using the context
        login(response);
        showToast('Login successful!', 'success');
        // Redirect to Staff Dashboard
        history.push('/staff');
      } else {
        showToast(response?.message || 'Invalid credentials. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast('Failed to connect to the server. Please check your network or try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <h1 className={styles.brand}>Relfor <span className={styles.brandAccent}>Payroll</span></h1>
          <p className={styles.subtitle}>Welcome back! Please login to your account.</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              placeholder="e.g. admin@respark.in"
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
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
