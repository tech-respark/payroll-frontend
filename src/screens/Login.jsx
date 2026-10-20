import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { LuBriefcase, LuEye, LuEyeOff } from 'react-icons/lu';
import { Modal, Button } from '../components/ui';
import styles from './Login.module.scss';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const history = useHistory();

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Username, 2: OTP, 3: New Password
  const [forgotUsername, setForgotUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      showToast('Please enter both username and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/login', { username, password });

      if (response && response.success) {
        login(response);
        showToast('Login successful!', 'success');
        history.push('/staff');
      } else {
        showToast(response?.message || 'Invalid credentials. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast('Failed to connect to the server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOtp = async () => {
    if (!forgotUsername) {
      showToast('Please enter your username, email, or mobile number.', 'error');
      return;
    }
    setForgotLoading(true);
    try {
      const response = await apiService.post('/forgot-password/generate-otp', {
        usernameOrMobile: forgotUsername
      });
      if (response?.code === 'OK') {
        showToast('OTP sent successfully!', 'success');
        setForgotStep(2);
      } else {
        showToast(response?.message || 'Failed to send OTP.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error sending OTP.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showToast('Please enter a valid 6-digit OTP.', 'error');
      return;
    }
    setForgotLoading(true);
    try {
      const response = await apiService.post('/forgot-password/verify-otp', {
        usernameOrMobile: forgotUsername,
        otp
      });
      if (response?.code === 'OK' && response.data) {
        setResetToken(response.data);
        showToast('OTP verified!', 'success');
        setForgotStep(3);
      } else {
        showToast(response?.message || 'Invalid OTP.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error verifying OTP.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    setForgotLoading(true);
    try {
      const response = await apiService.post('/forgot-password/reset-password', {
        resetToken,
        newPassword
      });
      if (response?.code === 'OK') {
        showToast('Password reset successfully! You can now log in.', 'success');
        closeForgotModal();
      } else {
        showToast(response?.message || 'Failed to reset password.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error resetting password.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotUsername('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logoMark} aria-hidden="true">
            <LuBriefcase size={24} strokeWidth={1.75} />
          </div>
          <h1 className={styles.brand}>Relfor <span className={styles.brandAccent}>Payroll</span></h1>
          <p className={styles.subtitle}>Hi, welcome back. Sign in to continue.</p>
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
            <div className={styles.passwordWrap}>
              <input
                type={showLoginPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowLoginPassword((v) => !v)}
                aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
              >
                {showLoginPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <button className={styles.forgotBtn} onClick={() => setShowForgotModal(true)}>
          Forgot Password?
        </button>
      </div>

      <Modal
        open={showForgotModal}
        onClose={closeForgotModal}
        title={forgotStep === 1 ? 'Forgot password' : forgotStep === 2 ? 'Verify OTP' : 'Reset password'}
        subtitle={
          forgotStep === 1
            ? 'Enter your username, email, or mobile number to receive a 6-digit OTP.'
            : forgotStep === 2
              ? 'Enter the 6-digit OTP sent to your registered mobile number.'
              : 'Please enter a strong new password.'
        }
        size="sm"
        footer={(
          <>
            <Button variant="outline" onClick={closeForgotModal}>Cancel</Button>
            {forgotStep === 1 && (
              <Button variant="primary" onClick={handleGenerateOtp} disabled={forgotLoading}>
                {forgotLoading ? 'Sending…' : 'Send OTP'}
              </Button>
            )}
            {forgotStep === 2 && (
              <Button variant="primary" onClick={handleVerifyOtp} disabled={forgotLoading}>
                {forgotLoading ? 'Verifying…' : 'Verify OTP'}
              </Button>
            )}
            {forgotStep === 3 && (
              <Button variant="primary" onClick={handleResetPassword} disabled={forgotLoading}>
                {forgotLoading ? 'Resetting…' : 'Save password'}
              </Button>
            )}
          </>
        )}
      >
        {forgotStep === 1 && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Username / Email / Mobile</label>
            <input
              type="text"
              value={forgotUsername}
              onChange={(e) => setForgotUsername(e.target.value)}
              className={styles.input}
              placeholder="Enter username, email, or mobile"
            />
          </div>
        )}
        {forgotStep === 2 && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className={styles.input}
              placeholder="123456"
              maxLength={6}
            />
          </div>
        )}
        {forgotStep === 3 && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>New Password</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={styles.input}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>
            <div className={styles.formGroup} style={{ marginTop: 16 }}>
              <label className={styles.label}>Confirm Password</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Login;
