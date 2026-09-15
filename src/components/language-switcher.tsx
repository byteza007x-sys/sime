import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { locales, withLocale } from "@/lib/i18n";

interface LanguageSwitcherProps {
  locale: Locale;
  pathname: string;
}

const labels: Record<Locale, string> = {
  en: "EN",
  th: "TH",
};

export default function LanguageSwitcher({
  locale,
  pathname,
}: LanguageSwitcherProps) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
      {locales.map((item) => (
        <Link
          key={item}
          href={withLocale(pathname, item)}
          className={`interactive-button rounded-md px-3 py-1.5 text-sm font-semibold transition ${
            item === locale
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {labels[item]}
        </Link>
      ))}
    </div>
  );
}
