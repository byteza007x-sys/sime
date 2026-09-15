import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  Home,
  Menu,
  QrCode,
  Search,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import BrandLogo from "@/components/brand-logo";
import LanguageSwitcher from "@/components/language-switcher";
import QrCodeGenerator from "@/components/qr-code-generator";
import ThemeToggle from "@/components/theme-toggle";
import { logoutAction } from "@/app/login/actions";
import { requireUser } from "@/lib/auth";
import { isFeatureEnabled, requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";

export const dynamic = "force-dynamic";

const copy = {
  en: {
    admin: "Admin",
    logo: "e service",
    logout: "Logout",
    search: "Search tools...",
    title: "Create QR Code",
    subtitle: "Create a QR Code from a link for documents, labels, or field use.",
    breadcrumbDashboard: "Dashboard",
    breadcrumbCurrent: "QR Code Generator",
    nav: {
      dashboard: "Dashboard",
      serviceReports: "Service Reports",
      customers: "Customers",
      inventory: "Inventory",
      users: "Users",
      qrCode: "Create QR Code",
      systemAdmin: "System",
    },
  },
  th: {
    admin: "แอดมิน",
    logo: "e service",
    logout: "ออกจากระบบ",
    search: "ค้นหาเครื่องมือ...",
    title: "สร้าง QR Code",
    subtitle: "สร้าง QR Code จากลิงก์สำหรับนำไปใช้งานหรือพิมพ์ลงเอกสาร",
    breadcrumbDashboard: "แดชบอร์ด",
    breadcrumbCurrent: "สร้าง QR Code",
    nav: {
      dashboard: "แดชบอร์ด",
      serviceReports: "ใบเซอร์วิซ",
      customers: "ลูกค้า",
      inventory: "อุปกรณ์",
      users: "ผู้ใช้",
      qrCode: "สร้าง QR Code",
      systemAdmin: "ระบบ",
    },
  },
} satisfies Record<Locale, object>;

const navKeys = [
  ["dashboard", "/dashboard", Home],
  ["serviceReports", "/reports", ClipboardList],
  ["customers", "/customers", Building2],
  ["inventory", "/inventory", Boxes],
  ["users", "/users", Users],
  ["qrCode", "/dashboard/qr-code", QrCode],
  ["systemAdmin", "/dashboard/system", Settings],
] as const;

interface DashboardQrCodePageProps {
  searchParams: RouteSearchParams;
}

export default async function DashboardQrCodePage({
  searchParams,
}: DashboardQrCodePageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const t = copy[locale];
  const user = await requireUser(locale);

  if (isOwnerUser(user)) {
    redirect(withLocale("/owner", locale));
  }

  await requireFeature({ key: "dashboard", user, locale });
  await requireFeature({ key: "qr_code", user, locale });

  if (user.roles.role_name !== "admin") {
    redirect(withLocale("/reports", locale));
  }
  const systemAdminEnabled = await isFeatureEnabled("system_admin");
  const dashboardNavItems = navKeys.filter(([key]) => {
    if (key === "systemAdmin") return systemAdminEnabled;
    return true;
  });

  return (
    <main className="animate-page min-h-screen bg-[#f3f6fb] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="grid lg:grid-cols-[220px_1fr]">
        <aside className="animate-panel sticky top-0 hidden h-screen self-start overflow-y-auto bg-[#071e49] text-white dark:bg-black lg:block">
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
            <BrandLogo size={36} priority />
            <span className="text-sm font-bold uppercase tracking-wide">
              {t.logo}
            </span>
          </div>

          <nav className="space-y-1 px-3 py-4">
            {dashboardNavItems.map(([key, href, Icon]) => {
              const active = href === "/dashboard/qr-code";

              return (
                <Link
                  key={`${key}-${href}`}
                  href={withLocale(href, locale)}
                  className={`interactive-button flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#0d6efd] text-white shadow-sm"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  <Icon size={16} />
                  {t.nav[key]}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="animate-panel flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="interactive-button inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>
              <div className="relative hidden sm:block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  className="h-9 w-72 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                  placeholder={t.search}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitcher locale={locale} pathname="/dashboard/qr-code" />
              <ThemeToggle />
              <button
                type="button"
                className="interactive-button relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                aria-label="Notifications"
              >
                <Bell size={16} />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-blue-600">
                  <UserCircle size={20} />
                </div>
                <span className="hidden text-sm font-bold sm:inline">
                  {user.full_name || user.username || t.admin}
                </span>
              </div>
              <form action={logoutAction}>
                <input type="hidden" name="lang" value={locale} />
                <button
                  type="submit"
                  className="interactive-button hidden h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:inline-flex sm:items-center"
                >
                  {t.logout}
                </button>
              </form>
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6">
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <Link
                href={withLocale("/dashboard", locale)}
                className="text-blue-700 hover:text-blue-800 dark:text-blue-300"
              >
                {t.breadcrumbDashboard}
              </Link>
              <span>/</span>
              <span>{t.breadcrumbCurrent}</span>
            </nav>

            <section className="animate-panel overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm dark:border-slate-800">
              <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-blue-100">
                    <QrCode size={14} />
                    e service
                  </div>
                  <h1 className="mt-4 text-2xl font-bold tracking-normal sm:text-3xl">
                    {t.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">
                    {t.subtitle}
                  </p>
                </div>
                <div className="hidden h-20 w-20 place-items-center rounded-2xl bg-white/10 text-blue-100 lg:grid">
                  <QrCode size={42} />
                </div>
              </div>
            </section>

            <QrCodeGenerator />
          </div>
        </section>
      </div>
    </main>
  );
}
