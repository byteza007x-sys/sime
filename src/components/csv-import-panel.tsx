"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import type { Locale } from "@/lib/i18n";

interface CsvImportPanelProps {
  title: string;
  subtitle: string;
  hint: string;
  fileLabel: string;
  buttonLabel: string;
  pendingLabel: string;
  inputName: string;
  action: (formData: FormData) => void | Promise<void>;
  locale: Locale;
  errorMessage: string | null;
  stats: Array<readonly [string, string | string[] | undefined]>;
  returnPath?: string;
  modeOptions?: {
    name: string;
    defaultValue: string;
    options: Array<{
      value: string;
      label: string;
      description: string;
    }>;
  };
}

function SubmitButton({
  buttonLabel,
  pendingLabel,
}: {
  buttonLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0d6efd] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70 sm:self-end"
    >
      <Upload size={16} />
      {pending ? pendingLabel : buttonLabel}
    </button>
  );
}

function PendingOverlay({
  pendingLabel,
  progress,
}: {
  pendingLabel: string;
  progress: number;
}) {
  const { pending } = useFormStatus();

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700 dark:border-blue-950 dark:border-t-blue-300" />
        <p className="text-base font-bold text-slate-950 dark:text-white">
          {pendingLabel}
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-200">
            <span>Import progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-[#0d6efd] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Please keep this page open.
        </p>
      </div>
    </div>
  );
}

function ImportProgress({
  isImporting,
  progress,
}: {
  isImporting: boolean;
  progress: number;
}) {
  if (!isImporting) return null;

  return (
    <div className="sm:col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 dark:border-blue-900/70 dark:bg-blue-950/40">
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-blue-800 dark:text-blue-200">
        <span>Import progress</span>
        <span>{progress}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-900">
        <div
          className="h-full rounded-full bg-[#0d6efd] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-blue-700 dark:text-blue-200">
        Estimated progress. The page will update automatically when the import
        is complete.
      </p>
    </div>
  );
}

export default function CsvImportPanel({
  title,
  subtitle,
  hint,
  fileLabel,
  buttonLabel,
  pendingLabel,
  inputName,
  action,
  locale,
  errorMessage,
  stats,
  returnPath,
  modeOptions,
}: CsvImportPanelProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isImporting) return;

    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 94) return current;

        const remaining = 94 - current;
        return Math.min(94, current + Math.max(1, Math.ceil(remaining * 0.12)));
      });
    }, 650);

    return () => window.clearInterval(interval);
  }, [isImporting]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0d6efd] dark:bg-blue-950/60 dark:text-blue-300">
          <Upload size={21} />
        </div>
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
          <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        </div>
      </div>

      <form
        action={action}
        onSubmit={() => {
          setProgress(6);
          setIsImporting(true);
        }}
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
      >
        <input type="hidden" name="lang" value={locale} />
        {returnPath ? <input type="hidden" name="returnTo" value={returnPath} /> : null}
        {modeOptions ? (
          <div className="sm:col-span-2">
            <div className="grid gap-2 sm:grid-cols-2">
              {modeOptions.options.map((option) => (
                <label
                  key={option.value}
                  className="interactive-card flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <input
                    type="radio"
                    name={modeOptions.name}
                    value={option.value}
                    defaultChecked={option.value === modeOptions.defaultValue}
                    className="mt-1 h-4 w-4 accent-blue-700"
                  />
                  <span>
                    <span className="block font-bold text-slate-900 dark:text-white">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <label className="block">
          <span className="text-xs font-bold text-slate-500">{fileLabel}</span>
          <input
            name={inputName}
            type="file"
            accept=".csv,text/csv"
            required
            className="mt-1 block h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:file:bg-slate-100 dark:file:text-slate-950"
          />
        </label>
        <SubmitButton buttonLabel={buttonLabel} pendingLabel={pendingLabel} />
        <ImportProgress isImporting={isImporting} progress={progress} />
        <PendingOverlay pendingLabel={pendingLabel} progress={progress} />
      </form>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      {stats.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40"
            >
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-200">
                {label}
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-900 dark:text-emerald-100">
                {Array.isArray(value) ? value[0] : value ?? "0"}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
