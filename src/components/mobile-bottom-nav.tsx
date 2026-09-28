import Link from "next/link";
import { ClipboardList, Home, LogOut, QrCode, UserCircle } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";

type MobileBottomNavProps = {
  locale: Locale;
  active?: "dashboard" | "reports" | "qr" | "profile";
  homeHref?: string;
  showQr?: boolean;
};

const labels = {
  en: {
    home: "Home",
    reports: "Jobs",
    qr: "QR",
    logout: "Logout",
  },
  th: {
    home: "หน้าหลัก",
    reports: "ใบงาน",
    qr: "QR",
    logout: "ออก",
  },
} satisfies Record<Locale, Record<string, string>>;

export default function MobileBottomNav({
  locale,
  active,
  homeHref = "/dashboard",
  showQr = true,
}: MobileBottomNavProps) {
  const t = labels[locale];
  const navItems = [
    {
      key: "dashboard" as const,
      href: homeHref,
      label: t.home,
      icon: Home,
    },
    {
      key: "reports" as const,
      href: "/reports",
      label: t.reports,
      icon: ClipboardList,
    },
    ...(showQr
      ? [
          {
            key: "qr" as const,
            href: "/dashboard/qr-code",
            label: t.qr,
            icon: QrCode,
          },
        ]
      : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {navItems.map(({ key, href, label, icon: Icon }) => {
          const selected = active === key;

          return (
            <Link
              key={key}
              href={withLocale(href, locale)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition ${
                selected
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
        <form action={logoutAction}>
          <input type="hidden" name="lang" value={locale} />
          <button
            type="submit"
            className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition ${
              active === "profile"
                ? "bg-blue-700 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="relative">
              <UserCircle size={20} />
              <LogOut className="absolute -bottom-1 -right-2 rounded-full bg-white text-slate-500 dark:bg-slate-950" size={12} />
            </span>
            <span>{t.logout}</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
