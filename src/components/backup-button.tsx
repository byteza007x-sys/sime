"use client";

import { useFormStatus } from "react-dom";
import { HardDriveDownload } from "lucide-react";
import type { Locale } from "@/lib/i18n";

interface BackupButtonProps {
  action: (formData: FormData) => void | Promise<void>;
  locale: Locale;
  returnTo: string;
  source: string;
  compact?: boolean;
}

const copy = {
  en: {
    label: "Backup",
    pending: "Backing up...",
    confirm:
      "Create a full backup now? This may take a moment. Please keep the page open.",
  },
  th: {
    label: "สำรองข้อมูล",
    pending: "กำลังสำรอง...",
    confirm:
      "ต้องการสำรองข้อมูลทั้งระบบตอนนี้ไหม? อาจใช้เวลาสักครู่ กรุณาอย่าปิดหน้านี้",
  },
} satisfies Record<Locale, Record<string, string>>;

function SubmitButton({
  label,
  pendingLabel,
  compact,
}: {
  label: string;
  pendingLabel: string;
  compact: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`interactive-button inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-70 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950 ${
        compact ? "w-full px-3 sm:w-auto" : "w-full px-4 sm:w-auto"
      }`}
    >
      <HardDriveDownload size={16} />
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function BackupButton({
  action,
  locale,
  returnTo,
  source,
  compact = false,
}: BackupButtonProps) {
  const t = copy[locale];

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(t.confirm)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="lang" value={locale} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="source" value={source} />
      <SubmitButton label={t.label} pendingLabel={t.pending} compact={compact} />
    </form>
  );
}

