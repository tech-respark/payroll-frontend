import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LuX } from 'react-icons/lu';
import { staffName } from '../helpers/displayUtils';
import styles from './StaffPicker.module.scss';

export function StaffPicker({
  staffList = [],
  value,
  onChange,
  label = 'Staff',
  allowAll = false,
  allValue = 'All',
  allLabel = 'All staff',
  placeholder = 'Search staff',
  loading = false,
  excludeIds = [],
  ariaLabel,
  className = '',
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const options = staffList.filter((staff) => !excludeIds.map(String).includes(String(staff.id)));
  const selected = options.find((staff) => String(staff.id) === String(value));
  const selectedLabel = selected ? staffName(selected) : (allowAll && (value === allValue || value == null || value === '') ? '' : '');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((staff) => staffName(staff).toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const choose = (next) => {
    onChange(next);
    setQuery('');
    setOpen(false);
  };

  const displayValue = open ? query : (selected ? staffName(selected) : '');

  return (
    <div className={`${styles.field} ${className}`} ref={rootRef}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.control}>
        <input
          type="search"
          className={styles.input}
          placeholder={selected ? staffName(selected) : (loading ? 'Loading staff…' : placeholder)}
          value={displayValue}
          onFocus={() => {
            setOpen(true);
            setQuery(selected ? staffName(selected) : '');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          aria-label={ariaLabel || label || 'Staff'}
          autoComplete="off"
        />
        {(selected || (allowAll && value && value !== allValue)) && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => choose(allowAll ? allValue : '')}
            aria-label={allowAll ? allLabel : 'Clear staff'}
          >
            <LuX size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && (
        <ul className={styles.menu} role="listbox" aria-label={label || 'Staff members'}>
          {allowAll && (
            <li>
              <button
                type="button"
                className={!selected ? styles.optionActive : styles.option}
                onClick={() => choose(allValue)}
              >
                {allLabel}
              </button>
            </li>
          )}
          {filtered.map((staff) => (
            <li key={staff.id}>
              <button
                type="button"
                className={String(value) === String(staff.id) ? styles.optionActive : styles.option}
                onClick={() => choose(String(staff.id))}
              >
                {staffName(staff)}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className={styles.empty}>
              {loading ? 'Loading staff…' : options.length === 0 ? 'No staff available.' : `No staff match “${query}”.`}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default StaffPicker;
