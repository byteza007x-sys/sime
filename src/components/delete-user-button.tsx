"use client";

import { Trash2 } from "lucide-react";

interface DeleteUserButtonProps {
  action: (formData: FormData) => void | Promise<void>;
  userId: string;
  locale: "en" | "th";
  label: string;
  confirmMessage: string;
}

export default function DeleteUserButton({
  action,
  userId,
  locale,
  label,
  confirmMessage,
}: DeleteUserButtonProps) {
  return (
    <form action={action}>
      <input type="hidden" name="lang" value={locale} />
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm(confirmMessage)) {
            event.preventDefault();
          }
        }}
        className="interactive-button inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
      >
        <Trash2 size={14} />
        {label}
      </button>
    </form>
  );
}
