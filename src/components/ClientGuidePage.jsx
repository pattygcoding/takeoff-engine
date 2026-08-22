import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { downloadSampleCsv, downloadSampleExcel } from '@/lib/csv';

function MarkdownRenderer({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let inTable = false;
  let tableRows = [];
  let currentList = null; // { type: 'ul' | 'ol', items: [] }
  let key = 0;

  const flushList = () => {
    if (!currentList || currentList.items.length === 0) {
      currentList = null;
      return;
    }
    if (currentList.type === 'ol') {
      elements.push(
        <ol key={`ol-${key++}`} className="list-decimal list-outside ml-6 space-y-1.5 my-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {currentList.items.map((it, idx) => (
            <li key={idx}>{it}</li>
          ))}
        </ol>
      );
    } else {
      elements.push(
        <ul key={`ul-${key++}`} className="list-disc list-outside ml-6 space-y-1.5 my-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {currentList.items.map((it, idx) => (
            <li key={idx}>{it}</li>
          ))}
        </ul>
      );
    }
    currentList = null;
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(2);

    elements.push(
      <div key={`table-${key++}`} className="overflow-x-auto my-5 rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-800 border-b border-slate-200">
            <tr>
              {headerRow.map((cell, cIdx) => (
                <th key={cIdx} className="px-3 py-2.5 font-bold uppercase tracking-wider">
                  {renderInlineMarkdown(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50 transition">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-slate-700">
                    {renderInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Markdown Table Detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList();
      elements.push(<hr key={key++} className="my-6 border-t border-slate-200" />);
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={key++} className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 mb-3 pb-2 border-b border-slate-200">
          {renderInlineMarkdown(trimmed.slice(2))}
        </h1>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-lg sm:text-xl font-bold text-slate-900 mt-6 mb-3">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-sm sm:text-base font-bold text-slate-800 mt-4 mb-2">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(renderInlineMarkdown(trimmed.slice(2)));
      continue;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(renderInlineMarkdown(numberedMatch[2]));
      continue;
    }

    flushList();

    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={key++} className="border-l-4 border-indigo-500 pl-4 py-1.5 my-3 bg-indigo-50/50 rounded-r-lg text-xs sm:text-sm text-slate-700 italic">
          {renderInlineMarkdown(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    elements.push(
      <p key={key++} className="text-xs sm:text-sm text-slate-700 leading-relaxed my-2">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  }

  if (inTable) {
    flushTable();
  }
  flushList();

  return <div className="space-y-1">{elements}</div>;
}

function renderInlineMarkdown(text) {
  if (!text) return '';

  const parts = [];
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

  return parts.map((part, idx) => {
    if (part.type === 'code') {
      return (
        <code key={idx} className="bg-slate-100 text-indigo-700 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-xs">
          {part.content}
        </code>
      );
    }

    let str = part.content;
    const formattedElements = [];
    const formattingRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/g;
    let fLastIdx = 0;
    let fMatch;

    while ((fMatch = formattingRegex.exec(str)) !== null) {
      if (fMatch.index > fLastIdx) {
        formattedElements.push(str.slice(fLastIdx, fMatch.index));
      }

      if (fMatch[1].startsWith('**')) {
        formattedElements.push(<strong key={`b-${fMatch.index}`} className="font-bold text-slate-900">{fMatch[2]}</strong>);
      } else if (fMatch[1].startsWith('*')) {
        formattedElements.push(<em key={`i-${fMatch.index}`} className="italic">{fMatch[3]}</em>);
      } else if (fMatch[4] && fMatch[5]) {
        formattedElements.push(
          <a
            key={`a-${fMatch.index}`}
            href={fMatch[5]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 underline font-medium"
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

    return <React.Fragment key={idx}>{formattedElements}</React.Fragment>;
  });
}

export default function ClientGuidePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGuide = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}CLIENT_GUIDE.md`);
        if (!res.ok) throw new Error('Failed to load CLIENT_GUIDE.md');
        const text = await res.text();
        setMarkdown(text);
      } catch (err) {
        setMarkdown(`# ${t('clientGuide.title')}\n\n${t('clientGuide.errorLoading')}`);
      } finally {
        setLoading(false);
      }
    };
    loadGuide();
  }, [t]);

  const handleBack = () => {
    if (isAuthenticated && user?.username) {
      navigate(`/${user.username}/upload`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
              title={t('common.goBack')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                {t('clientGuide.documentation')}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {t('clientGuide.title')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadSampleCsv()}
              className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
            >
              {t('clientGuide.csvTemplate')}
            </button>
            <button
              type="button"
              onClick={() => downloadSampleExcel()}
              className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
            >
              {t('clientGuide.excelTemplate')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Renders CLIENT_GUIDE.md directly in a clean page container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-10 min-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-sm">{t('clientGuide.loadingGuide')}</span>
            </div>
          ) : (
            <MarkdownRenderer content={markdown} />
          )}
        </div>
      </main>
    </div>
  );
}
