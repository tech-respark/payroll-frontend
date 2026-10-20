import React from 'react';
import { Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LuCheck, LuLink } from 'react-icons/lu';
import { slugifyHeading } from './catalog';
import styles from './DocsApp.module.scss';

const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node.props?.children) return textOf(node.props.children);
  return '';
};

const Heading = ({ as: Tag, children, className }) => {
  const text = textOf(children);
  const id = slugifyHeading(text);
  const [copied, setCopied] = React.useState(false);

  const copyLink = async (event) => {
    event.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      window.location.hash = id;
    }
  };

  return (
    <Tag id={id} className={className}>
      <a href={`#${id}`} className={styles.headingLink} onClick={copyLink} aria-label={`Copy link to ${text}`}>
        {copied ? <LuCheck size={14} /> : <LuLink size={14} />}
      </a>
      {children}
    </Tag>
  );
};

const Callout = ({ children }) => {
  const text = textOf(children);
  let tone = 'note';
  if (/^\s*tip:/i.test(text)) tone = 'tip';
  else if (/^\s*warning:/i.test(text)) tone = 'warning';
  return (
    <blockquote className={styles.callout} data-tone={tone}>
      {children}
    </blockquote>
  );
};

const MarkdownLink = ({ href, children }) => {
  if (!href) return <span>{children}</span>;
  if (href.startsWith('/docs')) {
    return <Link to={href}>{children}</Link>;
  }
  if (href.startsWith('#')) {
    return <a href={href}>{children}</a>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
};

const CodeBlock = ({ children }) => {
  const [copied, setCopied] = React.useState(false);
  const text = textOf(children).replace(/\n$/, '');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.codeBlock}>
      <button type="button" className={styles.codeCopy} onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  );
};

const components = {
  h1: ({ children }) => <Heading as="h1" className={styles.mdH1}>{children}</Heading>,
  h2: ({ children }) => <Heading as="h2" className={styles.mdH2}>{children}</Heading>,
  h3: ({ children }) => <Heading as="h3" className={styles.mdH3}>{children}</Heading>,
  p: ({ children }) => <p className={styles.mdP}>{children}</p>,
  ul: ({ children }) => <ul className={styles.mdList}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.mdList}>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  table: ({ children }) => (
    <div className={styles.tableWrap}>
      <table className={styles.table}>{children}</table>
    </div>
  ),
  blockquote: ({ children }) => <Callout>{children}</Callout>,
  a: MarkdownLink,
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  code: ({ children, className }) => {
    if (className || String(children).includes('\n')) {
      return <code className={className}>{children}</code>;
    }
    return <code className={styles.inlineCode}>{children}</code>;
  },
};

export function DocsMarkdown({ content }) {
  return (
    <div className={styles.markdown}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
