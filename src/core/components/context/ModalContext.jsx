import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState(null); // { type, title, message, confirmText, cancelText, confirmVariant, defaultValue, placeholder, resolve }
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const modalContainerRef = useRef(null);

  const closeModal = useCallback((result) => {
    if (modalState?.resolve) {
      modalState.resolve(result);
    }
    setModalState(null);
    setInputValue('');
  }, [modalState]);

  // Alert dialog
  const showAlert = useCallback(({ title = 'Notice', message = '', confirmText = 'OK', variant = 'info' } = {}) => {
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
  }, []);

  // Confirm dialog
  const showConfirm = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'danger', // 'danger' | 'primary'
  } = {}) => {
    return new Promise((resolve) => {
      setModalState({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        confirmVariant,
        resolve,
      });
    });
  }, []);

  // Prompt dialog
  const showPrompt = useCallback(({
    title = 'Prompt',
    message = '',
    defaultValue = '',
    placeholder = '',
    confirmText = 'Submit',
    cancelText = 'Cancel',
  } = {}) => {
    return new Promise((resolve) => {
      setInputValue(defaultValue);
      setModalState({
        type: 'prompt',
        title,
        message,
        defaultValue,
        placeholder,
        confirmText,
        cancelText,
        resolve,
      });
    });
  }, []);

  // Handle ESC key to dismiss / cancel
  useEffect(() => {
    if (!modalState) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (modalState.type === 'alert') {
          closeModal(true);
        } else if (modalState.type === 'prompt') {
          closeModal(null);
        } else {
          closeModal(false);
        }
      }

      // Trap Focus within modal container
      if (e.key === 'Tab' && modalContainerRef.current) {
        const focusableElements = modalContainerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState, closeModal]);

  // Auto focus input or primary confirm button
  useEffect(() => {
    if (!modalState) return;
    const timer = setTimeout(() => {
      if (modalState.type === 'prompt' && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      } else if (confirmBtnRef.current) {
        confirmBtnRef.current.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [modalState]);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}

      {modalState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            ref={modalContainerRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-7 relative transition-all transform scale-100 opacity-100"
          >
            {/* Header Icon & Title */}
            <div className="flex items-start gap-3.5 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  modalState.type === 'confirm' && modalState.confirmVariant === 'danger'
                    ? 'bg-red-100 text-red-600'
                    : modalState.variant === 'error'
                    ? 'bg-red-100 text-red-600'
                    : modalState.variant === 'success'
                    ? 'bg-emerald-100 text-emerald-600'
                    : modalState.variant === 'warning'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                {modalState.type === 'confirm' && modalState.confirmVariant === 'danger' ? (
                  '⚠️'
                ) : modalState.variant === 'error' ? (
                  '✕'
                ) : modalState.variant === 'success' ? (
                  '✓'
                ) : modalState.variant === 'warning' ? (
                  '⚠️'
                ) : modalState.type === 'prompt' ? (
                  '✍️'
                ) : (
                  'ℹ️'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="modal-title" className="text-base font-bold text-slate-900 leading-6">
                  {modalState.title}
                </h3>
                {modalState.message && (
                  <p className="mt-1.5 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
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
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  placeholder={modalState.placeholder}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
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
                  {modalState.cancelText || 'Cancel'}
                </button>
              )}

              <button
                ref={confirmBtnRef}
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
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                }`}
              >
                {modalState.confirmText || (modalState.type === 'alert' ? 'OK' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
