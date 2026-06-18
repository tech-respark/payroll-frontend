import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';

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
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.header}>
          <h1 style={styles.brand}>Respark <span style={styles.brandAccent}>V2</span></h1>
          <p style={styles.subtitle}>Welcome back! Please login to your account.</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="e.g. admin@respark.in"
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--primary-bg)',
    fontFamily: 'var(--primary-font)',
  },
  loginCard: {
    background: 'var(--bg-white)',
    width: '100%',
    maxWidth: '420px',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  brand: {
    fontSize: '32px',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
    fontWeight: '700',
  },
  brandAccent: {
    color: 'var(--primary-color)',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '15px',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: 'var(--text-dark)',
    fontWeight: '600',
  },
  input: {
    padding: '14px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '15px',
    color: 'var(--text-dark)',
    outline: 'none',
    transition: 'var(--transition)',
    fontFamily: 'var(--secondary-font)',
  },
  button: {
    background: 'var(--primary-color)',
    color: 'white',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '12px',
    boxShadow: 'var(--primary-color-shadow)',
    transition: 'var(--transition)',
  }
};

export default Login;
