import React from 'react';
import { LuCheck } from 'react-icons/lu';
import styles from './FormControls.module.scss';

export function Checkbox({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled = false,
  name,
  className = '',
  ...props
}) {
  const inputId = id || name || `cb-${label?.toString().slice(0, 12) || 'field'}`;

  return (
    <label htmlFor={inputId} className={`${styles.field} ${className}`}>
      <span className={styles.checkbox}>
        <input
          id={inputId}
          name={name}
          type="checkbox"
          checked={!!checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
        <span className={styles.checkboxBox} aria-hidden="true">
          <LuCheck size={12} strokeWidth={3} />
        </span>
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

export default Checkbox;
