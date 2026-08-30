import React from 'react';
import { useTheme } from '@/core/components/context/ThemeContext';
import { useTranslation } from '@/core/components/context/I18nContext';

export default function ThemeToggle({ className = '', variant = 'header' }) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const title = isDark
    ? t('theme.switchToLight', 'Switch to light mode')
    : t('theme.switchToDark', 'Switch to dark mode');

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
          isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
        } ${className}`}
        title={title}
        aria-label={title}
      >
        <span>{isDark ? '☀️' : '🌙'}</span>
        <span>{isDark ? t('theme.light', 'Light') : t('theme.dark', 'Dark')}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-xs'
          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 shadow-xs'
      } ${className}`}
      title={title}
      aria-label={title}
    >
      <span className="text-sm select-none">{isDark ? '☀️' : '🌙'}</span>
    </button>
  );
}
