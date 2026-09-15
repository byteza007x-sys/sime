"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import type { Locale } from "@/lib/i18n";

interface ClearCustomersButtonProps {
  action: (formData: FormData) => void | Promise<void>;
  locale: Locale;
  label: string;
  pendingLabel: string;
  confirmMessage: string;
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="interactive-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-70 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950 sm:w-auto"
    >
      <Trash2 size={16} />
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function ClearCustomersButton({
  action,
  locale,
  label,
  pendingLabel,
  confirmMessage,
}: ClearCustomersButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="lang" value={locale} />
      <SubmitButton label={label} pendingLabel={pendingLabel} />
    </form>
  );
}
