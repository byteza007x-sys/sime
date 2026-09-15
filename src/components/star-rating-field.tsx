"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingFieldProps {
  name: string;
  label: string;
  defaultValue?: number | null;
  emptyLabel: string;
}

export default function StarRatingField({
  name,
  label,
  defaultValue,
  emptyLabel,
}: StarRatingFieldProps) {
  const [value, setValue] = useState(defaultValue ?? 0);

  return (
    <div className="block">
      <input type="hidden" name={name} value={value > 0 ? value : ""} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">{label}</span>
        <button
          type="button"
          onClick={() => setValue(0)}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          {emptyLabel}
        </button>
      </div>
      <div className="mt-2 flex h-11 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-950">
        {[1, 2, 3, 4, 5].map((score) => {
          const active = score <= value;

          return (
            <button
              key={score}
              type="button"
              aria-label={`${label} ${score}`}
              aria-pressed={active}
              onClick={() => setValue(score)}
              className="interactive-button flex h-9 w-9 items-center justify-center rounded-md text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <Star
                size={22}
                className={active ? "fill-amber-400" : "fill-transparent"}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
