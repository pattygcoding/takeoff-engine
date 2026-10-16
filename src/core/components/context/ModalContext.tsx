import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, X, Check, PenLine, Info } from 'lucide-react';
import AccessibleDialog from '@/core/components/shared/AccessibleDialog';
import { useTranslation } from '@/core/components/context/I18nContext';

interface AlertOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  variant?: string;
}

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: string;
}

interface PromptOptions {
  title?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ModalState {
  type: 'alert' | 'confirm' | 'prompt';
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: string;
  variant?: string;
  defaultValue?: string;
  placeholder?: string;
  resolve: (value: unknown) => void;
}

interface ModalContextValue {
  showAlert: (options?: AlertOptions) => Promise<unknown>;
  showConfirm: (options?: ConfirmOptions) => Promise<boolean>;
  showPrompt: (options?: PromptOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/** Icon tile tint for the dialog, keyed by variant (a destructive confirm wins). */
function dialogIconClass(state: ModalState): string {
  if (state.type === 'confirm' && state.confirmVariant === 'danger') return 'bg-red-100 text-red-600';
  if (state.variant === 'error') return 'bg-red-100 text-red-600';
  if (state.variant === 'success') return 'bg-emerald-100 text-emerald-600';
  if (state.variant === 'warning') return 'bg-amber-100 text-amber-600';
  return 'bg-blue-100 text-blue-600';
}

/** Header icon for the dialog, keyed by variant. */
function dialogIcon(state: ModalState) {
  if (state.type === 'confirm' && state.confirmVariant === 'danger') return <AlertTriangle className="w-5 h-5" />;
  if (state.variant === 'error') return <X className="w-5 h-5" />;
  if (state.variant === 'success') return <Check className="w-5 h-5" />;
  if (state.variant === 'warning') return <AlertTriangle className="w-5 h-5" />;
  if (state.type === 'prompt') return <PenLine className="w-5 h-5" />;
  return <Info className="w-5 h-5" />;
}

/** The value a dismissed dialog resolves with: alerts confirm, prompts cancel, confirms decline. */
function dismissValue(type: ModalState['type']): boolean | null {
  if (type === 'alert') return true;
  if (type === 'prompt') return null;
  return false;
}

export function ModalProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [inputValue, setInputValue] = useState('');
  const { t } = useTranslation();

  const closeModal = useCallback((result: unknown) => {
    if (modalState?.resolve) {
      modalState.resolve(result);
    }
    setModalState(null);
    setInputValue('');
  }, [modalState]);

  // Alert dialog
  const showAlert = useCallback(({ title = t('core.accessibility.notice'), message = '', confirmText = t('core.accessibility.ok'), variant = 'info' }: AlertOptions = {}) => {
    return new Promise((resolve) => {
      setModalState({
        type: 'alert',
        title,
        message,
        confirmText,
        variant,
        resolve,
      });
    });
  }, [t]);

  // Confirm dialog
  const showConfirm = useCallback(({
    title = t('core.accessibility.confirmAction'),
    message = t('core.accessibility.confirmMessage'),
    confirmText = t('core.accessibility.confirm'),
    cancelText = t('core.accessibility.cancel'),
    confirmVariant = 'danger', // 'danger' | 'primary'
  }: Readonly<ConfirmOptions> = {}) => {
    return new Promise<boolean>((resolve) => {
      setModalState({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        confirmVariant,
        resolve: (value) => resolve(value as boolean),
      });
    });
  }, [t]);

  // Prompt dialog
  const showPrompt = useCallback(({
    title = t('core.accessibility.prompt'),
    message = '',
    defaultValue = '',
    placeholder = '',
    confirmText = t('core.accessibility.submit'),
    cancelText = t('core.accessibility.cancel'),
  }: PromptOptions = {}) => {
    return new Promise<string | null>((resolve) => {
      setInputValue(defaultValue);
      setModalState({
        type: 'prompt',
        title,
        message,
        defaultValue,
        placeholder,
        confirmText,
        cancelText,
        resolve: (value) => resolve(value as string | null),
      });
    });
  }, [t]);

  const value = useMemo(() => ({ showAlert, showConfirm, showPrompt }), [showAlert, showConfirm, showPrompt]);

  return (
    <ModalContext.Provider value={value}>
      {children}

      {modalState && (
        <AccessibleDialog
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          aria-labelledby="modal-title"
          aria-describedby={modalState.message ? 'modal-message' : undefined}
          onClose={() => closeModal(dismissValue(modalState.type))}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-7 relative transition-all transform scale-100 opacity-100"
          >
            {/* Header Icon & Title */}
            <div className="flex items-start gap-3.5 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${dialogIconClass(modalState)}`}
              >
                {dialogIcon(modalState)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="modal-title" className="text-base font-bold text-slate-900 leading-6">
                  {modalState.title}
                </h3>
                {modalState.message && (
                  <p id="modal-message" className="mt-1.5 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {modalState.message}
                  </p>
                )}
              </div>
            </div>

            {/* Prompt Input Form */}
            {modalState.type === 'prompt' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  closeModal(inputValue);
                }}
                className="my-4"
              >
                <input
                  aria-labelledby="modal-title"
                  aria-describedby={modalState.message ? 'modal-message' : undefined}
                  type="text"
                  value={inputValue}
                  placeholder={modalState.placeholder}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
              </form>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              {modalState.type !== 'alert' && (
                <button
                  type="button"
                  onClick={() => closeModal(modalState.type === 'prompt' ? null : false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors"
                >
                  {modalState.cancelText || t('core.accessibility.cancel')}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (modalState.type === 'prompt') {
                    closeModal(inputValue);
                  } else {
                    closeModal(true);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm ${
                  modalState.type === 'confirm' && modalState.confirmVariant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }`}
              >
                {modalState.confirmText || t(modalState.type === 'alert' ? 'core.accessibility.ok' : 'core.accessibility.confirm')}
              </button>
            </div>
          </div>
        </AccessibleDialog>
      )}
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
