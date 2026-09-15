"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { Trash2, X } from "lucide-react";

interface DeleteReportButtonProps {
  action: (formData: FormData) => void | Promise<void>;
  reportId: string;
  locale: "en" | "th";
  label: string;
  confirmMessage: string;
}

export default function DeleteReportButton({
  action,
  reportId,
  locale,
  label,
  confirmMessage,
}: DeleteReportButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="interactive-button inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
      >
        <Trash2 size={14} />
        {label}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-5 shadow-2xl dark:border-rose-900 dark:bg-slate-900 sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    {label}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {confirmMessage}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="interactive-button inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label={locale === "th" ? "ปิด" : "Close"}
              >
                <X size={17} />
              </button>
            </div>
            <form action={action} className="mt-6 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="reportId" value={reportId} />
              <input type="hidden" name="lang" value={locale} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="interactive-button h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {locale === "th" ? "ยกเลิก" : "Cancel"}
              </button>
              <ConfirmButton locale={locale} />
            </form>
          </div>
        </div>,
          document.body,
        )
        : null}
    </>
  );
}

function ConfirmButton({ locale }: { locale: "en" | "th" }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="interactive-button h-11 rounded-lg bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-70"
    >
      {pending
        ? locale === "th"
          ? "กำลังลบ..."
          : "Deleting..."
        : locale === "th"
          ? "ยืนยันลบ"
          : "Delete"}
    </button>
  );
}
