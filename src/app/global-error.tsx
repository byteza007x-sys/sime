"use client";

import Image from "next/image";
import { useEffect } from "react";

export default function GlobalRootError({
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
    <html lang="th">
      <body>
        <main style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0f172a",
          color: "white",
          padding: 24,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}>
          <section style={{
            width: "100%",
            maxWidth: 560,
            border: "1px solid rgba(148, 163, 184, 0.25)",
            borderRadius: 20,
            background: "rgba(15, 23, 42, 0.9)",
            padding: 32,
            textAlign: "center",
          }}>
            <Image
              src="/logo.png"
              alt="e service logo"
              width={64}
              height={64}
              priority
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                borderRadius: 16,
                background: "white",
                margin: "0 auto 20px",
              }}
            />
            <p style={{ color: "#fca5a5", fontWeight: 700 }}>
              e service system error
            </p>
            <h1 style={{ marginTop: 8, fontSize: 28 }}>
              ระบบโหลดไม่สำเร็จ
            </h1>
            <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
              ลองโหลดใหม่อีกครั้ง ถ้ายังไม่หายให้ตรวจสอบฐานข้อมูลและเซิร์ฟเวอร์
            </p>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                marginTop: 24,
                height: 44,
                border: 0,
                borderRadius: 10,
                background: "#2563eb",
                color: "white",
                padding: "0 20px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ลองใหม่
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
