import Link from "next/link";
import { Home } from "lucide-react";
import BrandLogo from "@/components/brand-logo";

export default function NotFound() {
  return (
    <main className="animate-page grid min-h-screen place-items-center bg-slate-100 px-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="interactive-card w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <BrandLogo size={64} priority className="mx-auto mb-5 rounded-2xl" />
        <p className="text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold">ไม่พบหน้านี้</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          ลิงก์นี้อาจถูกย้ายหรือไม่มีอยู่ในระบบ e service แล้ว
        </p>
        <Link
          href="/"
          className="interactive-button mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
        >
          <Home size={16} />
          กลับหน้าหลัก
        </Link>
      </section>
    </main>
  );
}
