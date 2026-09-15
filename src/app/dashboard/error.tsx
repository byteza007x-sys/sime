"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <div className="mx-auto max-w-xl rounded-xl border border-rose-100 bg-white p-6 shadow-sm">
        <p className="font-semibold text-rose-700">โหลดแดชบอร์ดไม่สำเร็จ</p>
        <h1 className="mt-2 text-2xl font-bold">ระบบดึงข้อมูลล่าสุดไม่ได้</h1>
        <p className="mt-3 text-slate-600">
          ตรวจสอบว่าฐานข้อมูลเปิดอยู่ และค่า DATABASE_URL ในไฟล์ .env
          ตรงกับเซิร์ฟเวอร์ฐานข้อมูล แล้วลองโหลดใหม่อีกครั้ง
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white transition hover:bg-sky-800"
          >
            ลองใหม่
          </button>
          <a
            href="/api/health"
            className="rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            เช็กสถานะระบบ
          </a>
        </div>
      </div>
    </main>
  );
}
