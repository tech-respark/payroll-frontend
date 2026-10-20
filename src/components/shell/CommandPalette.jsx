import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from 'react-router-dom';
import { LuSearch } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { filterCommands, getAccessibleCommands } from './navCommands';
import styles from './CommandPalette.module.scss';

/**
 * Minimal-style ⌘K / Ctrl+K quick navigation.
 */
export function CommandPalette({ open, onClose }) {
  const { hasAccess } = useAuth();
  const history = useHistory();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  useBodyScrollLock(open);

  const commands = useMemo(() => getAccessibleCommands(hasAccess), [hasAccess]);
  const filtered = useMemo(() => filterCommands(commands, query), [commands, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((cmd) => {
      if (!map.has(cmd.group)) map.set(cmd.group, []);
      map.get(cmd.group).push(cmd);
    });
    return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
  }, [filtered]);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        const cmd = filtered[activeIndex];
        onClose?.();
        history.push(cmd.path);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, onClose, history]);

  const runCommand = (cmd) => {
    if (!cmd) return;
    onClose?.();
    history.push(cmd.path);
  };

  if (!open) return null;

  let flatIndex = -1;

  return createPortal(
    <div
      className={styles.root}
      role="presentation"
      onClick={() => onClose?.()}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Quick navigation"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.searchRow}>
          <LuSearch size={18} className={styles.searchIcon} aria-hidden />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and actions…"
            aria-label="Search pages"
            autoComplete="off"
          />
          <span className={styles.kbdHint}>
            <kbd className={styles.kbd}>esc</kbd>
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty} role="status">
            No matches for “{query}”
          </div>
        ) : (
          <div className={styles.list} role="listbox" aria-label="Pages">
            {grouped.map(({ group, items }) => (
              <div key={group} role="group" aria-label={group}>
                <div className={styles.groupLabel}>{group}</div>
                {items.map((cmd) => {
                  flatIndex += 1;
                  const idx = flatIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      role="option"
                      aria-selected={idx === activeIndex}
                      className={styles.item}
                      data-active={idx === activeIndex ? 'true' : 'false'}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => runCommand(cmd)}
                    >
                      <span>{cmd.title}</span>
                      <span className={styles.itemMeta}>{cmd.path}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.footerHint}>
            <kbd className={styles.kbd}>↑</kbd>
            <kbd className={styles.kbd}>↓</kbd>
            navigate
          </span>
          <span className={styles.footerHint}>
            <kbd className={styles.kbd}>↵</kbd>
            open
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CommandPalette;
