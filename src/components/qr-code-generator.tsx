"use client";

import { FormEvent, useState } from "react";
import QRCode from "qrcode";
import { Clipboard, Download, Link2, Loader2, QrCode, RotateCcw } from "lucide-react";

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const validateUrl = (value: string) => {
  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

export default function QrCodeGenerator() {
  const [inputUrl, setInputUrl] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const generateQrCode = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (isGenerating) return;

    const url = normalizeUrl(inputUrl);
    setCopyStatus("");

    if (!validateUrl(url)) {
      setErrorMessage("กรุณากรอก URL ให้ถูกต้อง เช่น https://example.com");
      setQrDataUrl("");
      setGeneratedUrl("");
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage("");
      const dataUrl = await QRCode.toDataURL(url, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#071e49",
          light: "#ffffff",
        },
      });

      setInputUrl(url);
      setGeneratedUrl(url);
      setQrDataUrl(dataUrl);
    } catch {
      setErrorMessage("สร้าง QR Code ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQrCode = () => {
    if (!qrDataUrl) return;

    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = "e-service-qr-code.png";
    anchor.click();
  };

  const copyLink = async () => {
    if (!generatedUrl) return;

    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopyStatus("คัดลอกลิงก์แล้ว");
    } catch {
      setCopyStatus("คัดลอกลิงก์ไม่สำเร็จ");
    }
  };

  const clearForm = () => {
    setInputUrl("");
    setGeneratedUrl("");
    setQrDataUrl("");
    setErrorMessage("");
    setCopyStatus("");
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)]">
      <section className="interactive-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
            <Link2 size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black">กรอกลิงก์สำหรับสร้าง QR Code</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              วาง URL ที่ต้องการ ระบบจะเติม https:// ให้อัตโนมัติถ้ายังไม่ได้ใส่
            </p>
          </div>
        </div>

        <form onSubmit={generateQrCode} className="space-y-4">
          <label className="block">
            <span className="text-sm font-bold">URL</span>
            <input
              value={inputUrl}
              onChange={(event) => {
                setInputUrl(event.target.value);
                setErrorMessage("");
                setCopyStatus("");
              }}
              placeholder="example.com หรือ https://example.com"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <button
              type="submit"
              disabled={isGenerating}
              className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={17} /> : <QrCode size={17} />}
              {isGenerating ? "กำลังสร้าง..." : "สร้าง QR Code"}
            </button>
            <button
              type="button"
              onClick={copyLink}
              disabled={!generatedUrl}
              className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Clipboard size={16} />
              คัดลอกลิงก์
            </button>
            <button
              type="button"
              onClick={clearForm}
              className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw size={16} />
              ล้างข้อมูล
            </button>
          </div>

          {copyStatus ? (
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {copyStatus}
            </p>
          ) : null}
        </form>
      </section>

      <section className="interactive-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
            <QrCode size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black">ตัวอย่าง QR Code</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              ดาวน์โหลดเป็น PNG เพื่อนำไปพิมพ์ลงเอกสารได้
            </p>
          </div>
        </div>

        {qrDataUrl ? (
          <div className="space-y-4">
            <div className="grid place-items-center rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Generated QR Code"
                className="h-auto w-full max-w-[280px] rounded-xl bg-white p-3 shadow-sm"
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-xs font-bold text-slate-500">ลิงก์ที่นำไปสร้าง</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-800 dark:text-slate-100">
                {generatedUrl}
              </p>
            </div>
            <button
              type="button"
              onClick={downloadQrCode}
              className="interactive-button inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              <Download size={17} />
              ดาวน์โหลด PNG
            </button>
          </div>
        ) : (
          <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-slate-900">
                <QrCode size={34} />
              </div>
              <p className="mt-4 font-bold text-slate-700 dark:text-slate-200">
                ยังไม่ได้สร้าง QR Code
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                กรอก URL แล้วกดสร้างเพื่อดูตัวอย่างที่นี่
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
