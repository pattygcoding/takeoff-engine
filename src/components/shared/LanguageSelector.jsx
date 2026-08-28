import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/context/I18nContext';

export const LANGUAGES = [
  {
    code: 'en',
    label: 'English'
  },
  {
    code: 'es',
    label: 'Español'
  },
  {
    code: 'fr',
    label: 'Français'
  },
  {
    code: 'pt',
    label: 'Português'
  },
];

export default function LanguageSelector({ variant = 'light' }) {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = variant === 'dark';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer select-none ${
          isDark
            ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600 shadow-xs'
            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-2xs'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Select Language / Seleccionar idioma"
      >
        <span className="hidden sm:inline font-medium">{currentLang.label}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isDark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
          } ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-1.5 w-36 rounded-xl border shadow-xl z-50 py-1 overflow-hidden animate-fade-in ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-slate-100 divide-y divide-slate-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 divide-y divide-slate-100 dark:divide-slate-800'
          }`}
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition cursor-pointer text-left ${
                  isDark
                    ? isSelected
                      ? 'bg-indigo-600/40 text-white font-bold'
                      : 'hover:bg-slate-800 text-slate-100 hover:text-white'
                    : isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{lang.label}</span>
                </div>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
