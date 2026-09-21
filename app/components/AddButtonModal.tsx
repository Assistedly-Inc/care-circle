'use client';

import { useState, useEffect, useRef } from 'react';

interface AddButtonModalProps {
  title: string;
  iconSize?: number;
  children: React.ReactNode;
}

export default function AddButtonModal({ title, iconSize = 20, children }: AddButtonModalProps) {
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('keydown', onKey);
      document.addEventListener('mousedown', onClick);
      return () => {
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('mousedown', onClick);
      };
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white shadow-md hover:bg-green-700 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-green-500 transition-colors"
        aria-expanded={open}
        aria-label={`Open ${title}`}
        title={title}
      >
        <svg width={iconSize} height={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14"/></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50" ref={modalRef}>
          <div className="bg-white rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] border border-[var(--color-border)] p-5 w-[min(90vw,28rem)]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-extrabold text-[var(--color-text)]">{title}</h4>
              <button
                type="button"
                onClick={() => { setOpen(false); buttonRef.current?.focus(); }}
                className="w-7 h-7 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[#f5f2ee] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-accent)]"
                aria-label="Close"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12m0-12L6 18"/></svg>
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
