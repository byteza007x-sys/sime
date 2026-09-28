"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { UserPlus, X } from "lucide-react";

interface CreateUserDrawerProps {
  title: string;
  triggerLabel: string;
  closeLabel: string;
  children: ReactNode;
}

export default function CreateUserDrawer({
  title,
  triggerLabel,
  closeLabel,
  children,
}: CreateUserDrawerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white shadow-[0_6px_16px_rgba(29,78,216,0.2)] transition hover:bg-blue-800 hover:shadow-[0_8px_20px_rgba(29,78,216,0.26)]"
      >
        <UserPlus size={17} />
        {triggerLabel}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex justify-end" role="presentation">
              <button
                type="button"
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
                className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
              />
              <section
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-[-20px_0_60px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900"
              >
                <header className="flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900">
                      <UserPlus size={19} />
                    </span>
                    <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                      {title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="interactive-button inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label={closeLabel}
                    title={closeLabel}
                  >
                    <X size={19} />
                  </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
