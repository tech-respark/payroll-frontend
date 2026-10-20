import { DOCS_PAGES, slugifyHeading } from './catalog';
import { PAGE_CONTENT } from './content';

const stripMd = (value) =>
  String(value || '')
    .replace(/[`*_\[\]]/g, '')
    .replace(/\]\([^)]+\)/g, '')
    .trim();

export const SEARCH_INDEX = DOCS_PAGES.flatMap((page) => {
  const markdown = PAGE_CONTENT[page.slug] || '';
  const entries = [
    {
      id: page.slug,
      type: 'page',
      slug: page.slug,
      title: page.title,
      crumbs: page.sectionTitle,
      snippet: page.description,
      hash: '',
      keywords: (page.keywords || []).join(' '),
    },
  ];

  for (const match of markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)) {
    const text = stripMd(match[2]);
    entries.push({
      id: `${page.slug}#${slugifyHeading(text)}`,
      type: 'heading',
      slug: page.slug,
      title: text,
      crumbs: page.title,
      snippet: page.description,
      hash: slugifyHeading(text),
      keywords: '',
    });
  }

  return entries;
});

export function searchDocs(query) {
  const q = query.trim().toLowerCase();
  if (!q) return SEARCH_INDEX.filter((item) => item.type === 'page');
  return SEARCH_INDEX.filter((item) => {
    const hay = [item.title, item.crumbs, item.snippet, item.keywords].join(' ').toLowerCase();
    return hay.includes(q);
  })
    .sort((a, b) => {
      const aExact = a.title.toLowerCase() === q ? 0 : a.title.toLowerCase().startsWith(q) ? 1 : a.type === 'page' ? 2 : 3;
      const bExact = b.title.toLowerCase() === q ? 0 : b.title.toLowerCase().startsWith(q) ? 1 : b.type === 'page' ? 2 : 3;
      return aExact - bExact;
    })
    .slice(0, 20);
}

export function extractToc(markdown) {
  const items = [];
  for (const match of String(markdown || '').matchAll(/^(#{2,3})\s+(.+)$/gm)) {
    const text = stripMd(match[2]);
    items.push({
      depth: match[1].length,
      text,
      id: slugifyHeading(text),
    });
  }
  return items;
}
