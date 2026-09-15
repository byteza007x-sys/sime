import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { getLocale, type RouteSearchParams, withLocale } from "@/lib/i18n";

interface FeatureDisabledPageProps {
  searchParams: RouteSearchParams;
}

export default async function FeatureDisabledPage({
  searchParams,
}: FeatureDisabledPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const feature = Array.isArray(params.feature) ? params.feature[0] : params.feature;
  const isThai = locale === "th";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          <LockKeyhole size={28} />
        </div>
        <h1 className="mt-5 text-2xl font-bold">
          {isThai ? "ระบบนี้ถูกปิดชั่วคราว" : "This system is temporarily disabled"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {isThai
            ? `ผู้ดูแลระบบสูงสุดปิดการใช้งาน ${feature || "ระบบนี้"} อยู่ตอนนี้`
            : `The owner has disabled ${feature || "this feature"} for now.`}
        </p>
        <Link
          href={withLocale("/dashboard", locale)}
          className="interactive-button mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
        >
          {isThai ? "กลับแดชบอร์ด" : "Back to dashboard"}
        </Link>
      </section>
    </main>
  );
}
