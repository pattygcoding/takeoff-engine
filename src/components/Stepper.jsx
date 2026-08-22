import { useTranslation } from '@/context/I18nContext';

export default function Stepper({ step, onStepClick, isAwarded = false }) {
  const { t } = useTranslation();
  const steps = [
    { id: 1, label: t('stepper.step1Label') },
    { id: 2, label: t('stepper.step2Label') },
    { id: 3, label: t('stepper.step3Label') },
  ];

  return (
    <nav className="no-print flex items-center justify-center gap-2 sm:gap-4 py-6 px-4 bg-white border-b border-slate-200">
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
                  ? t('stepper.stepLockedMessage', { label: s.label })
                  : undefined
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${
                  s.id === step
                    ? 'bg-indigo-600 text-white'
                    : isStepLocked
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-75'
                    : s.id < step
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full text-xs
                  ${
                    s.id === step
                      ? 'bg-white text-indigo-600'
                      : isStepLocked
                      ? 'bg-slate-200 text-slate-500'
                      : s.id < step
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-300 text-white'
                  }`}
              >
                {isStepLocked ? '🔒' : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
              {isStepLocked && <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full font-semibold hidden sm:inline">{t('stepper.lockedBadge')}</span>}
            </button>
            {idx < steps.length - 1 && <div className="w-6 sm:w-10 h-px bg-slate-300" />}
          </div>
        );
      })}
    </nav>
  );
}
