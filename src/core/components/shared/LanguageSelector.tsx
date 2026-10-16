import React, { useState, useRef, useEffect, useId } from 'react';
import { useTranslation } from '@/core/components/context/I18nContext';

interface Language {
  code: string;
  label: string;
}

/** Trigger button styling for the selector's visual variant. */
function languageTriggerClass(isLanding: boolean, isDark: boolean): string {
  if (isLanding) return 'rounded-none border-[var(--lp-line)] bg-transparent text-[var(--lp-ink)] hover:bg-[var(--lp-ink)] hover:text-[var(--lp-paper)] h-9';
  if (isDark) return 'rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600 shadow-xs';
  return 'rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-2xs';
}

/** Chevron colour for the selector's visual variant. */
function languageChevronClass(isLanding: boolean, isDark: boolean): string {
  if (isLanding) return '';
  if (isDark) return 'text-slate-400';
  return 'text-slate-500 dark:text-slate-400';
}

/** Dropdown panel styling for the selector's visual variant. */
function languagePanelClass(isLanding: boolean, isDark: boolean): string {
  if (isLanding) return 'bg-[var(--lp-card)] border-[var(--lp-line)] text-[var(--lp-ink)] divide-y divide-[var(--lp-rule)]';
  if (isDark) return 'rounded-xl bg-slate-900 border-slate-700 text-slate-100 divide-y divide-slate-800';
  return 'rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 divide-y divide-slate-100 dark:divide-slate-800';
}

/** Styling for one language option, given the selector variant and selection state. */
function languageOptionClass(isLanding: boolean, isDark: boolean, isSelected: boolean): string {
  if (isLanding) {
    if (isSelected) return 'bg-[var(--lp-tint)] font-bold';
    return 'hover:bg-[var(--lp-tint)]';
  }
  if (isDark) {
    if (isSelected) return 'bg-blue-600/40 text-white font-bold';
    return 'hover:bg-slate-800 text-slate-100 hover:text-white';
  }
  if (isSelected) return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold';
  return 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white';
}

export const LANGUAGES: Language[] = [
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

// Width of the dropdown panel (matches the `w-36` class) used to decide whether
// it should open leftwards (right-aligned) or rightwards (left-aligned).
const DROPDOWN_WIDTH = 144;

export default function LanguageSelector({ variant = 'light' }: Readonly<{ variant?: string }>) {
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // Flip the panel to open rightwards when a right-aligned panel would clip off the left edge.
  const [alignLeft, setAlignLeft] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Close dropdown on outside click, or on Escape (returning focus to the trigger)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Keep the panel inside the viewport if the trigger moves while it is open
  // (e.g. a mobile orientation change or keyboard resize).
  useEffect(() => {
    if (!isOpen) return undefined;
    const reposition = () => {
      if (!triggerRef.current) return;
      setAlignLeft(triggerRef.current.getBoundingClientRect().right - DROPDOWN_WIDTH < 8);
    };
    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      setAlignLeft(triggerRef.current.getBoundingClientRect().right - DROPDOWN_WIDTH < 8);
    }
    setIsOpen((prev) => !prev);
  };

  const isDark = variant === 'dark';
  const isLanding = variant === 'landing';

  const triggerClass = languageTriggerClass(isLanding, isDark);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold border transition cursor-pointer select-none ${triggerClass}`}
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={t('core.languageSelector.label', { language: currentLang.label })}
        title="Select Language / Seleccionar idioma"
      >
        <span className="hidden sm:inline font-medium">{currentLang.label}</span>
        <svg
          aria-hidden="true"
          className={`w-3.5 h-3.5 transition-transform duration-200 ${languageChevronClass(isLanding, isDark)} ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={listId}
          className={`absolute mt-1.5 w-36 max-w-[min(12rem,calc(100vw-1.5rem))] border shadow-xl z-50 py-1 overflow-hidden animate-fade-in ${
            alignLeft ? 'left-0' : 'right-0'
          } ${languagePanelClass(isLanding, isDark)}`}
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang.code;
            return (
              <button
                key={lang.code}
                type="button"
                lang={lang.code}
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition cursor-pointer text-left ${languageOptionClass(isLanding, isDark, isSelected)}`}
              >
                <div className="flex items-center gap-2">
                  <span>{lang.label}</span>
                </div>
                {isSelected && (
                  <svg aria-hidden="true" className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
