import React from 'react';
import styles from './FormControls.module.scss';

export function Switch({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled = false,
  name,
  className = '',
  row = false,
  ...props
}) {
  const inputId = id || name || `sw-${label?.toString().slice(0, 12) || 'field'}`;

  const toggle = (
    <label htmlFor={inputId} className={styles.switch}>
      <input
        id={inputId}
        name={name}
        type="checkbox"
        role="switch"
        checked={!!checked}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
      <span className={styles.slider} />
    </label>
  );

  const text = (label || hint) ? (
    <span className={styles.fieldGrow}>
      {label && <span className={styles.label}>{label}</span>}
      {hint && <span className={styles.hint}>{hint}</span>}
    </span>
  ) : null;

  if (row) {
    return (
      <div className={`${styles.switchRow} ${className}`}>
        {text}
        {toggle}
      </div>
    );
  }

  return (
    <div className={`${styles.switchWrap} ${className}`}>
      {text}
      {toggle}
    </div>
  );
}

export default Switch;
