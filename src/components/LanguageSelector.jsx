import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/context/I18nContext';

export const LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    flag: (
      <svg viewBox="0 0 640 480" className="w-4 h-3 rounded-xs shadow-2xs inline-block shrink-0">
        <path fill="#bd3d44" d="M0 0h640v480H0z" />
        <path stroke="#fff" strokeWidth="37" d="M0 55.5h640M0 129.5h640M0 203.5h640M0 277.5h640M0 351.5h640M0 425.5h640" />
        <path fill="#192f5d" d="M0 0h260v260H0z" />
        <marker id="us-star" markerHeight="6" markerWidth="6" orient="auto" refX="3" refY="3">
          <path fill="#fff" d="M3 0L3.9 2.1 6 2.3 4.4 3.7 4.9 5.8 3 4.7 1.1 5.8 1.6 3.7 0 2.3 2.1 2.1z" />
        </marker>
        <circle cx="130" cy="130" r="10" fill="#fff" opacity="0.9" />
      </svg>
    ),
  },
  {
    code: 'es',
    label: 'Español',
    flag: (
      <svg viewBox="0 0 640 480" className="w-4 h-3 rounded-xs shadow-2xs inline-block shrink-0">
        <path fill="#006847" d="M0 0h213.3v480H0z" />
        <path fill="#fff" d="M213.3 0h213.4v480H213.3z" />
        <path fill="#ce1126" d="M426.7 0H640v480H426.7z" />
        <circle cx="320" cy="240" r="28" fill="#916a2f" />
        <path fill="#534327" d="M312 230h16v20h-16z" />
      </svg>
    ),
  },
  {
    code: 'fr',
    label: 'Français',
    flag: (
      <svg viewBox="0 0 640 480" className="w-4 h-3 rounded-xs shadow-2xs inline-block shrink-0">
        <path fill="#002654" d="M0 0h213.3v480H0z" />
        <path fill="#fff" d="M213.3 0h213.4v480H213.3z" />
        <path fill="#ce1126" d="M426.7 0H640v480H426.7z" />
      </svg>
    ),
  },
  {
    code: 'pt',
    label: 'Português',
    flag: (
      <svg viewBox="0 0 640 480" className="w-4 h-3 rounded-xs shadow-2xs inline-block shrink-0">
        <path fill="#009c3b" d="M0 0h640v480H0z" />
        <path fill="#ffdf00" d="M320 54.9L585.1 240 320 425.1 54.9 240z" />
        <circle cx="320" cy="240" r="95" fill="#002776" />
        <path fill="#fff" d="M227 236c50-20 135-20 185 8-5 12-14 23-25 31-45-25-115-25-160-39z" />
      </svg>
    ),
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
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Select Language / Seleccionar idioma"
      >
        <span className="flex items-center">{currentLang.flag}</span>
        <span className="hidden sm:inline font-medium">{currentLang.label}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
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
              ? 'bg-slate-800 border-slate-700 text-slate-200 divide-y divide-slate-700/50'
              : 'bg-white border-slate-200 text-slate-800 divide-y divide-slate-100'
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
                      ? 'bg-indigo-600/30 text-indigo-300 font-bold'
                      : 'hover:bg-slate-700/70 text-slate-300'
                    : isSelected
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex items-center">{lang.flag}</span>
                  <span>{lang.label}</span>
                </div>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
