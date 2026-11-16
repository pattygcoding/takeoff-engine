import { useTranslation } from '@/core/components/context/I18nContext';
import { Check, Lock } from 'lucide-react';

/** Button tint for a step in the takeoff wizard. */
function stepButtonClass(isActive: boolean, isLocked: boolean, isComplete: boolean, isReachable: boolean): string {
  if (isActive) return 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/20';
  if (isLocked) return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75';
  if (isComplete) return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer';
  if (isReachable) return 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-300 cursor-pointer';
  return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed';
}

/** Badge fill for a step in the takeoff wizard. */
function stepBadgeClass(isActive: boolean, isLocked: boolean, isComplete: boolean, isReachable: boolean): string {
  if (isActive) return 'bg-white text-blue-600 font-bold';
  if (isLocked) return 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
  if (isComplete) return 'bg-blue-600 text-white font-bold';
  if (isReachable) return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold';
  return 'bg-slate-300 dark:bg-slate-700 text-white dark:text-slate-400';
}

export default function Stepper({
  step,
  onStepClick,
  isAwarded = false,
  hasItems = false,
}: Readonly<{
  step: number;
  onStepClick?: (step: number) => void;
  isAwarded?: boolean;
  /** When line items already exist, Steps 2 and 3 stay directly reachable from earlier steps. */
  hasItems?: boolean;
}>) {
  const { t } = useTranslation();
  const steps = [
    { id: 1, label: t('product.stepper.step1Label') },
    { id: 2, label: t('product.stepper.step2Label') },
    { id: 3, label: t('product.stepper.step3Label') },
  ];

  return (
    <nav
      aria-label={t('product.stepper.ariaLabel', 'Takeoff progress')}
      className="no-print flex items-center justify-center gap-2 sm:gap-3 py-3.5 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200"
    >
      {steps.map((s, idx) => {
        const isStepLocked = isAwarded && (s.id === 1 || s.id === 2);
        const isActive = s.id === step;
        const isComplete = !isStepLocked && s.id < step;
        const isReachable = !isStepLocked && !isActive && (s.id < step || (hasItems && (s.id === 2 || s.id === 3)));
        const isDisabled = isStepLocked || (!isActive && !isReachable);

        return (
          <div key={s.id} className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => !isDisabled && onStepClick?.(s.id)}
              disabled={isDisabled}
              aria-current={isActive ? 'step' : undefined}
              title={
                isStepLocked
                  ? t('product.stepper.stepLockedMessage', { label: s.label })
                  : s.label
              }
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all
                ${stepButtonClass(isActive, isStepLocked, isComplete, isReachable)}`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full text-xs
                  ${stepBadgeClass(isActive, isStepLocked, isComplete, isReachable)}`}
              >
                {isStepLocked ? (
                  <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                ) : isComplete ? (
                  <Check className="w-3 h-3" aria-hidden="true" />
                ) : (
                  s.id
                )}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
              {isStepLocked && (
                <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-full font-semibold hidden sm:inline">
                  {t('product.stepper.lockedBadge')}
                </span>
              )}
            </button>
            {idx < steps.length - 1 && (
              <div
                className={`w-6 sm:w-10 h-0.5 rounded-full transition-colors ${
                  s.id < step ? 'bg-blue-400 dark:bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
