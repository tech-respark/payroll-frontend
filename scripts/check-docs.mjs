import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = join(root, 'docs');
const files = [join(root, 'README.md')];

function collectMarkdown(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectMarkdown(path);
    else if (extname(entry.name) === '.md') files.push(path);
  }
}

collectMarkdown(docsRoot);

const failures = [];
const linkPattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
const unsafePatterns = [
  { label: 'password assignment', regex: /\b(password|passwd|pwd)\s*[:=]\s*(?!<|\{|\[|'?placeholder|'?local-password)[^\s`]+/i },
  { label: 'private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'JWT-like token', regex: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/ },
  { label: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const display = relative(root, file);

  if (file.startsWith(docsRoot) && file !== join(docsRoot, 'README.md')) {
    for (const field of ['Audience', 'Purpose', 'Last verified', 'Source of truth']) {
      if (!text.includes(`**${field}:**`)) {
        failures.push(`${display}: missing metadata field "${field}"`);
      }
    }
  }

  const headings = new Set();
  let navigationLinks = new Set();
  for (const line of text.split('\n')) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (match) {
      const normalized = match[1].toLowerCase().replace(/[`*_]/g, '').trim();
      if (headings.has(normalized)) failures.push(`${display}: duplicate heading "${match[1]}"`);
      headings.add(normalized);
      navigationLinks = new Set();
      continue;
    }

    if (file === join(docsRoot, 'README.md') && /^\s*[-|]/.test(line)) {
      for (const link of line.matchAll(linkPattern)) {
        const target = link[1].trim();
        if (navigationLinks.has(target)) {
          failures.push(`${display}: duplicate navigation target in one section: ${target}`);
        }
        navigationLinks.add(target);
      }
    }
  }

  for (const match of text.matchAll(linkPattern)) {
    const raw = match[1].trim().replace(/^<|>$/g, '');
    if (!raw || raw.startsWith('#') || /^[a-z]+:/i.test(raw)) continue;
    const target = decodeURIComponent(raw.split('#')[0].split('?')[0]);
    if (!target) continue;
    const resolved = normalize(resolve(dirname(file), target));
    if (!resolved.startsWith(root)) {
      failures.push(`${display}: link escapes repository: ${raw}`);
    } else if (!existsSync(resolved)) {
      failures.push(`${display}: missing link target: ${raw}`);
    }
  }

  for (const { label, regex } of unsafePatterns) {
    const match = text.match(regex);
    if (match) failures.push(`${display}: possible ${label}: "${match[0]}"`);
  }
}

if (failures.length) {
  console.error(`Documentation check failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Documentation check passed: ${files.length} Markdown files checked.`);
