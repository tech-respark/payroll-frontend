import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from 'react-router-dom';
import { LuFileText, LuHash, LuSearch } from 'react-icons/lu';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { docsPath } from './openDocs';
import { searchDocs } from './searchIndex';
import styles from './DocsApp.module.scss';

export function DocsSearch({ open, onClose }) {
  const history = useHistory();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  useBodyScrollLock(open);

  const results = useMemo(() => searchDocs(query), [query]);

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

  const go = (item) => {
    if (!item) return;
    onClose?.();
    history.push({
      pathname: docsPath(item.slug === 'introduction' ? '' : item.slug),
      hash: item.hash || undefined,
    });
  };

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
        setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault();
        go(results[activeIndex]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, activeIndex, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.searchOverlay} role="presentation" onClick={() => onClose?.()}>
      <div
        className={styles.searchPanel}
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.searchRow}>
          <LuSearch size={18} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides…"
            aria-label="Search documentation"
            autoComplete="off"
          />
          <kbd>esc</kbd>
        </div>
        {results.length === 0 ? (
          <div className={styles.searchEmpty} role="status">
            No matches for “{query}”
          </div>
        ) : (
          <div className={styles.searchList} role="listbox" aria-label="Documentation results">
            {results.map((item, idx) => {
              const Icon = item.type === 'heading' ? LuHash : LuFileText;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={styles.searchItem}
                  data-active={idx === activeIndex ? 'true' : 'false'}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => go(item)}
                >
                  <Icon size={16} aria-hidden />
                  <span>
                    <strong>{item.title}</strong>
                    <em>{item.crumbs}</em>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className={styles.searchFooter}>
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
