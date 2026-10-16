import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/components/context/AuthContext';
import { useTranslation } from '@/core/components/context/I18nContext';
import SeoHead from '@/core/components/shared/SeoHead';
import { downloadSampleCsv, downloadSampleExcel } from '@/product/lib/csv';

/** Mutable cursor while walking the markdown source line by line. */
interface MarkdownCursor {
  /** Monotonic key for the rendered children. */
  key: number;
  inTable: boolean;
  tableRows: string[][];
  currentList: { type: 'ul' | 'ol'; items: { key: string; node: React.ReactNode }[] } | null;
}

const LIST_CLASSES: Record<'ul' | 'ol', string> = {
  ul: 'list-disc list-outside ml-6 space-y-1.5 my-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed',
  ol: 'list-decimal list-outside ml-6 space-y-1.5 my-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed',
};

const HEADING_CLASSES: Record<number, string> = {
  1: 'text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800',
  2: 'text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3',
  3: 'text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2',
};

/** 1/2/3 for an ATX heading line, 0 when the line is not a heading. */
function headingLevel(trimmed: string): number {
  if (trimmed.startsWith('# ')) return 1;
  if (trimmed.startsWith('## ')) return 2;
  if (trimmed.startsWith('### ')) return 3;
  return 0;
}

/** The heading element for a heading line of the given level. */
function headingElement(level: number, trimmed: string, key: number) {
  const className = HEADING_CLASSES[level];
  const content = renderInlineMarkdown(trimmed.slice(level + 1));
  if (level === 1) return <h1 key={key} className={className}>{content}</h1>;
  if (level === 2) return <h2 key={key} className={className}>{content}</h2>;
  return <h3 key={key} className={className}>{content}</h3>;
}

/** Emits the buffered list, if any, and clears the buffer. */
function flushList(cursor: MarkdownCursor, elements: React.ReactNode[]): void {
  const list = cursor.currentList;
  cursor.currentList = null;
  if (!list || list.items.length === 0) return;

  const className = LIST_CLASSES[list.type];
  const key = `${list.type}-${cursor.key++}`;
  const children = list.items.map((item) => <li key={item.key}>{item.node}</li>);
  elements.push(
    list.type === 'ol'
      ? <ol key={key} className={className}>{children}</ol>
      : <ul key={key} className={className}>{children}</ul>
  );
}

/** Emits the buffered table, if any, and clears the buffer. */
function flushTable(cursor: MarkdownCursor, elements: React.ReactNode[]): void {
  if (cursor.tableRows.length === 0) return;

  // Row 1 is the header and row 2 is the `---` separator, so only the rest are data rows.
  const headerRow = cursor.tableRows[0];
  const dataRows = cursor.tableRows.slice(2);

  elements.push(
    <div key={`table-${cursor.key++}`} tabIndex={0 /* NOSONAR: a horizontally scrollable region must stay keyboard reachable (WCAG 2.1.1; axe scrollable-region-focusable). */} className="overflow-x-auto my-5 rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
          <tr>
            {headerRow.map((cell) => (
              <th key={cell} className="px-3 py-2.5 font-bold uppercase tracking-wider">
                {renderInlineMarkdown(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {dataRows.map((row) => (
            <tr key={row.join('|')} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              {headerRow.map((header, ci) => (
                <td key={header} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                  {renderInlineMarkdown(row[ci] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  cursor.tableRows = [];
  cursor.inTable = false;
}

/** Appends a `-`/`*` bullet item; returns false when the line is not a bullet item. */
function appendListItem(cursor: MarkdownCursor, elements: React.ReactNode[], trimmed: string): boolean {
  if (!trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
    return appendNumberedItem(cursor, elements, trimmed);
  }

  if (cursor.currentList?.type !== 'ul') {
    flushList(cursor, elements);
    cursor.currentList = { type: 'ul', items: [] };
  }
  cursor.currentList.items.push({ key: `li-${cursor.key++}`, node: renderInlineMarkdown(trimmed.slice(2)) });
  return true;
}

/** Appends a `1.`-style numbered item; returns false when the line is not one. */
function appendNumberedItem(cursor: MarkdownCursor, elements: React.ReactNode[], trimmed: string): boolean {
  const numberedMatch = /^(\d+)\.\s+(.*)/.exec(trimmed);
  if (!numberedMatch) return false;

  if (cursor.currentList?.type !== 'ol') {
    flushList(cursor, elements);
    cursor.currentList = { type: 'ol', items: [] };
  }
  cursor.currentList.items.push({ key: `li-${cursor.key++}`, node: renderInlineMarkdown(numberedMatch[2]) });
  return true;
}

/** Appends the element(s) one markdown line produces to `elements`. */
function appendMarkdownLine(cursor: MarkdownCursor, elements: React.ReactNode[], trimmed: string): void {
  // Markdown Table Detection
  if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
    flushList(cursor, elements);
    cursor.inTable = true;
    cursor.tableRows.push(trimmed.slice(1, -1).split('|').map((c) => c.trim()));
    return;
  }
  if (cursor.inTable) flushTable(cursor, elements);

  if (!trimmed) {
    flushList(cursor, elements);
    return;
  }

  if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
    flushList(cursor, elements);
    elements.push(<hr key={cursor.key++} className="my-6 border-t border-slate-200 dark:border-slate-800" />);
    return;
  }

  const level = headingLevel(trimmed);
  if (level) {
    flushList(cursor, elements);
    elements.push(headingElement(level, trimmed, cursor.key++));
    return;
  }

  if (appendListItem(cursor, elements, trimmed)) return;

  flushList(cursor, elements);
  appendTrailingBlock(cursor, elements, trimmed);
}

/** Appends a blockquote for a `>` line, or a plain paragraph for anything else. */
function appendTrailingBlock(cursor: MarkdownCursor, elements: React.ReactNode[], trimmed: string): void {
  if (trimmed.startsWith('> ')) {
    elements.push(
      <blockquote key={cursor.key++} className="border-l-4 border-blue-500 pl-4 py-1.5 my-3 bg-blue-50/50 dark:bg-blue-950/40 rounded-r-lg text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic">
        {renderInlineMarkdown(trimmed.slice(2))}
      </blockquote>
    );
    return;
  }

  elements.push(
    <p key={cursor.key++} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-2">
      {renderInlineMarkdown(trimmed)}
    </p>
  );
}

function MarkdownRenderer({ content }: Readonly<{ content?: string }>) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  const cursor: MarkdownCursor = { key: 0, inTable: false, tableRows: [], currentList: null };

  for (const rawLine of lines) {
    appendMarkdownLine(cursor, elements, rawLine.trim());
  }

  if (cursor.inTable) flushTable(cursor, elements);
  flushList(cursor, elements);

  return <div className="space-y-1">{elements}</div>;
}





function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return '';

  const parts: { type: string; content: string }[] = [];
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.map((part) => {
    const partKey = `${part.type}-${part.content}`;
    if (part.type === 'code') {
      return (
        <code key={partKey} className="bg-slate-100 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded font-mono text-xs">
          {part.content}
        </code>
      );
    }

    let str = part.content;
    const formattedElements: React.ReactNode[] = [];
    const formattingRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^[\]]+)\]\(([^()]+)\))/g;
    let fLastIdx = 0;
    let fMatch;

    while ((fMatch = formattingRegex.exec(str)) !== null) {
      if (fMatch.index > fLastIdx) {
        formattedElements.push(str.slice(fLastIdx, fMatch.index));
      }

      if (fMatch[1].startsWith('**')) {
        formattedElements.push(<strong key={`b-${fMatch.index}`} className="font-bold text-slate-900 dark:text-white">{fMatch[2]}</strong>);
      } else if (fMatch[1].startsWith('*')) {
        formattedElements.push(<em key={`i-${fMatch.index}`} className="italic">{fMatch[3]}</em>);
      } else if (fMatch[4] && fMatch[5]) {
        formattedElements.push(
          <a
            key={`a-${fMatch.index}`}
            href={fMatch[5]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium"
          >
            {fMatch[4]}
          </a>
        );
      }
      fLastIdx = fMatch.index + fMatch[0].length;
    }

    if (fLastIdx < str.length) {
      formattedElements.push(str.slice(fLastIdx));
    }

    return <React.Fragment key={partKey}>{formattedElements}</React.Fragment>;
  });
}

export default function ClientGuidePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useTranslation();
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGuide = async () => {
      setLoading(true);
      try {
        const langCode = ['es', 'fr', 'pt'].includes(language) ? language : 'en';
        const guideBase = `${import.meta.env.BASE_URL}product/clientguide/`;
        const res = await fetch(`${guideBase}CLIENT_GUIDE.${langCode}.md`);
        if (!res.ok) {
          // Fallback to en
          const fallbackRes = await fetch(`${guideBase}CLIENT_GUIDE.en.md`);
          if (!fallbackRes.ok) throw new Error('Failed to load CLIENT_GUIDE');
          const fallbackText = await fallbackRes.text();
          setMarkdown(fallbackText);
          return;
        }
        const text = await res.text();
        setMarkdown(text);
      } catch (err) {
        console.warn('Could not load the client guide:', (err as Error).message);
        setMarkdown(`# ${t('product.clientGuide.title')}\n\n${t('product.clientGuide.errorLoading')}`);
      } finally {
        setLoading(false);
      }
    };
    void loadGuide();
  }, [t, language]);

  const handleBack = () => {
    if (isAuthenticated && user?.username) {
      navigate(`/${user.username}/upload`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 transition-colors">
      <SeoHead
        title={t('core.seo.guide.title', 'Takeoff Import & Formatting Documentation — Takeoff Engine')}
        description={t('core.seo.guide.description', 'Learn how to format CSV/Excel takeoffs from Bluebeam, PlanSwift, and Trimble Agtek for automated ingestion, trench calculations, and client proposals.')}
        canonicalUrl="https://takeoffengine.com/guide"
      />
      {/* Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
              title={t('core.common.goBack')}
            >
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {t('product.clientGuide.documentation')}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {t('product.clientGuide.title')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadSampleCsv()}
              className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-xl transition cursor-pointer"
            >
              {t('product.clientGuide.csvTemplate')}
            </button>
            <button
              type="button"
              onClick={() => downloadSampleExcel()}
              className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer"
            >
              {t('product.clientGuide.excelTemplate')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Renders CLIENT_GUIDE.md directly in a clean page container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-10 min-h-[500px] transition-colors">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 dark:text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm">{t('product.clientGuide.loadingGuide')}</span>
            </div>
          ) : (
            <MarkdownRenderer content={markdown} />
          )}
        </div>
      </div>
    </div>
  );
}
