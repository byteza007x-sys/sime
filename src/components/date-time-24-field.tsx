"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import type { Locale } from "@/lib/i18n";

interface DateTime24FieldProps {
  name: string;
  label: string;
  defaultValue: string;
  locale: Locale;
}

const pad = (value: number) => String(value).padStart(2, "0");

export default function DateTime24Field({
  name,
  label,
  defaultValue,
  locale,
}: DateTime24FieldProps) {
  const [date, setDate] = useState(defaultValue.slice(0, 10));
  const [hour, setHour] = useState(defaultValue.slice(11, 13) || "00");
  const [minute, setMinute] = useState(defaultValue.slice(14, 16) || "00");
  const value = `${date}T${hour}:${minute}`;
  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => pad(index)), []);
  const minutes = useMemo(
    () => Array.from({ length: 12 }, (_, index) => pad(index * 5)),
    [],
  );
  const timeLabel = locale === "th" ? "เวลา" : "Time";
  const dateLabel = locale === "th" ? "วันที่" : "Date";
  const minuteLabel = locale === "th" ? "นาที" : "Minute";

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <input type="hidden" name={name} value={value} />
      <div className="mb-3 flex min-h-9 items-start gap-2 text-sm font-bold leading-5">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <Clock size={15} />
        </span>
        <span className="min-w-0 pt-1">{label}</span>
      </div>
      <div className="grid flex-1 gap-2 sm:grid-cols-3">
        <label className="block min-w-0">
          <span className="text-xs font-bold text-slate-500">{dateLabel}</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="block min-w-0">
          <span className="text-xs font-bold text-slate-500">{timeLabel}</span>
          <select
            value={hour}
            onChange={(event) => setHour(event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            {hours.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="text-xs font-bold text-slate-500">{minuteLabel}</span>
          <select
            value={minute}
            onChange={(event) => setMinute(event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            {minutes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
