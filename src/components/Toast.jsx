import React from 'react';
import { useToast } from '../context/ToastContext';

const Toast = () => {
  const { toast, hideToast } = useToast();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  const containerStyle = {
    position: 'fixed',
    top: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    backgroundColor: isSuccess ? '#10b981' : '#ef4444',
    color: '#ffffff',
    fontWeight: '500',
    animation: 'slideUp 0.3s ease-out forwards',
  };

  const buttonStyle = {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.8)',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    marginLeft: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <>
      <style>
        {`
          @keyframes slideUp {
            from { transform: translate(-50%, -20px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
        `}
      </style>
      <div style={containerStyle}>
        <span>{toast.message}</span>
        <button style={buttonStyle} onClick={hideToast}>
          OK
        </button>
      </div>
    </>
  );
};

export default Toast;
