import { useTranslation } from '@/core/components/context/I18nContext';

export default function Stepper({ step, onStepClick, isAwarded = false }) {
  const { t } = useTranslation();
  const steps = [
    { id: 1, label: t('product.stepper.step1Label') },
    { id: 2, label: t('product.stepper.step2Label') },
    { id: 3, label: t('product.stepper.step3Label') },
  ];

  return (
    <nav className="no-print flex items-center justify-center gap-2 sm:gap-4 py-6 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      {steps.map((s, idx) => {
        const isStepLocked = isAwarded && (s.id === 1 || s.id === 2);
        const isDisabled = isStepLocked || s.id > step;

        return (
          <div key={s.id} className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => !isDisabled && onStepClick && onStepClick(s.id)}
              disabled={isDisabled}
              title={
                isStepLocked
                  ? t('product.stepper.stepLockedMessage', { label: s.label })
                  : undefined
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${
                  s.id === step
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isStepLocked
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75'
                    : s.id < step
                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full text-xs
                  ${
                    s.id === step
                      ? 'bg-white text-indigo-600 font-bold'
                      : isStepLocked
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      : s.id < step
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-300 dark:bg-slate-700 text-white dark:text-slate-400'
                  }`}
              >
                {isStepLocked ? '🔒' : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
              {isStepLocked && <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-full font-semibold hidden sm:inline">{t('product.stepper.lockedBadge')}</span>}
            </button>
            {idx < steps.length - 1 && <div className="w-6 sm:w-10 h-px bg-slate-300 dark:bg-slate-700" />}
          </div>
        );
      })}
    </nav>
  );
}
