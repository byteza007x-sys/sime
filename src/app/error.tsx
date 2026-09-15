"use client";

import { useEffect } from "react";
import BrandLogo from "@/components/brand-logo";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="animate-page grid min-h-screen place-items-center bg-slate-100 px-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="interactive-card w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <BrandLogo size={64} priority className="mx-auto mb-5 rounded-2xl" />
        <p className="text-sm font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">
          System error
        </p>
        <h1 className="mt-2 text-2xl font-bold">โหลดหน้านี้ไม่สำเร็จ</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          ระบบเจอปัญหาระหว่างโหลดข้อมูล ลองใหม่อีกครั้ง
          หรือตรวจสอบว่าฐานข้อมูลและไฟล์ .env พร้อมใช้งาน
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="interactive-button mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
        >
          ลองใหม่
        </button>
      </section>
    </main>
  );
}
