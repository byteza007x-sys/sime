import { redirect } from "next/navigation";
import { LockKeyhole, UserRound } from "lucide-react";
import BrandLogo from "@/components/brand-logo";
import LanguageSwitcher from "@/components/language-switcher";
import ThemeToggle from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { loginAction } from "./actions";

const copy = {
  en: {
    title: "Sign in",
    subtitle: "Access the e service management system",
    username: "Username",
    password: "Password",
    submit: "Sign in",
    invalid: "Username or password is incorrect.",
    hint: "Existing admin can still sign in with admin@siamebu.com / Admin@1234",
  },
  th: {
    title: "เข้าสู่ระบบ",
    subtitle: "เข้าใช้งานระบบจัดการงานบริการ e service",
    username: "Username",
    password: "รหัสผ่าน",
    submit: "เข้าสู่ระบบ",
    invalid: "Username หรือรหัสผ่านไม่ถูกต้อง",
    hint: "บัญชีเดิมยังเข้าได้ด้วย admin@siamebu.com / Admin@1234",
  },
} satisfies Record<Locale, object>;

interface LoginPageProps {
  searchParams: RouteSearchParams;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(
      withLocale(
        isOwnerUser(currentUser)
          ? "/owner"
          : currentUser.roles.role_name === "admin"
            ? "/dashboard"
            : "/technician/jobs",
        locale,
      ),
    );
  }

  const t = copy[locale];
  const hasError = params.error === "invalid";

  return (
    <main className="animate-page grid min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white lg:grid-cols-[1fr_520px]">
      <section className="animate-panel hidden bg-[#071e49] p-10 text-white dark:bg-black lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size={40} priority className="rounded-lg" />
          <span className="text-lg font-bold uppercase tracking-wide">
            e service
          </span>
        </div>

        <div>
          <p className="max-w-xl text-4xl font-bold leading-tight">
            Service operations, field evidence, and admin review in one system.
          </p>
          <p className="mt-5 max-w-lg text-blue-100">
            Built for admin teams and field users who need simple, reliable
            service workflows.
          </p>
        </div>

        <p className="text-sm text-blue-100">e-service.local</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="animate-panel w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <LanguageSwitcher locale={locale} pathname="/login" />
            <ThemeToggle />
          </div>

          <div className="interactive-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-8 text-center">
              <BrandLogo size={56} priority className="animate-pop mx-auto mb-4" />
              <h1 className="text-2xl font-bold">{t.title}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t.subtitle}
              </p>
            </div>

            {hasError ? (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
                {t.invalid}
              </div>
            ) : null}

            <form action={loginAction} className="space-y-4">
              <input type="hidden" name="lang" value={locale} />
              <label className="block">
                <span className="text-sm font-bold">{t.username}</span>
                <span className="relative mt-2 block">
                  <UserRound
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
                    placeholder="admin"
                  />
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-bold">{t.password}</span>
                <span className="relative mt-2 block">
                  <LockKeyhole
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
                    placeholder="••••••••"
                  />
                </span>
              </label>

              <button
                type="submit"
                className="interactive-button h-11 w-full rounded-lg bg-blue-700 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
              >
                {t.submit}
              </button>
            </form>

            <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              {t.hint}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
