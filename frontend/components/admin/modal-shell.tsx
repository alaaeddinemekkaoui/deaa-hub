'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

type ModalShellProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export function ModalShell({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: ModalShellProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const widthClass = {
    sm: 'max-w-xl',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex max-h-[calc(100vh-3rem)] w-full ${widthClass} flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_32px_90px_-48px_rgba(15,36,26,0.65)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
            {description ? (
              <p className="text-sm leading-6 text-slate-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-white text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-slate-950"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
