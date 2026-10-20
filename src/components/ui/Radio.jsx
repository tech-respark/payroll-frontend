import React from 'react';
import styles from './FormControls.module.scss';

export function Radio({
  id,
  name,
  value,
  label,
  hint,
  checked,
  onChange,
  disabled = false,
  card = false,
  className = '',
  ...props
}) {
  const inputId = id || `${name}-${value}`;

  if (card) {
    return (
      <label
        htmlFor={inputId}
        className={`${styles.radioCard} ${checked ? styles.radioCardActive : ''} ${className}`}
      >
        <span className={styles.radio}>
          <input
            id={inputId}
            name={name}
            type="radio"
            value={value}
            checked={!!checked}
            onChange={onChange}
            disabled={disabled}
            {...props}
          />
          <span className={styles.radioDot} aria-hidden="true" />
        </span>
        <span className={styles.fieldGrow}>
          {label && <span className={styles.label}>{label}</span>}
          {hint && <span className={styles.hint}>{hint}</span>}
        </span>
      </label>
    );
  }

  return (
    <label htmlFor={inputId} className={`${styles.field} ${className}`}>
      <span className={styles.radio}>
        <input
          id={inputId}
          name={name}
          type="radio"
          value={value}
          checked={!!checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
        <span className={styles.radioDot} aria-hidden="true" />
      </span>
      {(label || hint) && (
        <span className={styles.fieldGrow}>
          {label && <span className={styles.label}>{label}</span>}
          {hint && <span className={styles.hint}>{hint}</span>}
        </span>
      )}
    </label>
  );
}

export default Radio;
