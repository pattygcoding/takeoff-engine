import { useTranslation } from '@/core/components/context/I18nContext';
import { Lock } from 'lucide-react';

/** Button tint for a step in the takeoff wizard. */
function stepButtonClass(isActive: boolean, isLocked: boolean, isComplete: boolean): string {
  if (isActive) return 'bg-blue-600 text-white shadow-xs';
  if (isLocked) return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75';
  if (isComplete) return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 cursor-pointer';
  return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed';
}

/** Badge fill for a step in the takeoff wizard. */
function stepBadgeClass(isActive: boolean, isLocked: boolean, isComplete: boolean): string {
  if (isActive) return 'bg-white text-blue-600 font-bold';
  if (isLocked) return 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
  if (isComplete) return 'bg-blue-600 text-white font-bold';
  return 'bg-slate-300 dark:bg-slate-700 text-white dark:text-slate-400';
}

export default function Stepper({
  step,
  onStepClick,
  isAwarded = false,
}: {
  step: number;
  onStepClick?: (step: number) => void;
  isAwarded?: boolean;
}) {
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
                ${stepButtonClass(s.id === step, isStepLocked, s.id < step)}`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full text-xs
                  ${stepBadgeClass(s.id === step, isStepLocked, s.id < step)}`}
              >
                {isStepLocked ? <Lock className="w-2.5 h-2.5" /> : s.id}
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
