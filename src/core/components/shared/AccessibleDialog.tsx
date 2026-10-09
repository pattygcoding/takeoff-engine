import { useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

interface AccessibleDialogProps extends ComponentPropsWithoutRef<'dialog'> {
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

export default function AccessibleDialog({ children, onClose, className = '', ...props }: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      {...props}
      ref={dialogRef}
      className={`accessible-dialog ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}