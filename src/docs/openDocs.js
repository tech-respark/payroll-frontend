export const DOCS_BASE = '/docs';

export function docsPath(slug = '') {
  const clean = String(slug || '').replace(/^\/+|\/+$/g, '');
  return clean ? `${DOCS_BASE}/${clean}` : DOCS_BASE;
}

export function openDocs(slug = '', hash = '') {
  const path = docsPath(slug);
  const url = `${path}${hash ? `#${hash.replace(/^#/, '')}` : ''}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
