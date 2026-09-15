"use client";

import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { RotateCcw } from "lucide-react";

interface SignaturePadProps {
  name: string;
  label: string;
  clearLabel: string;
}

export default function SignaturePad({
  name,
  label,
  clearLabel,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSignatureRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const getPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !inputRef.current) return;

    inputRef.current.value = hasSignatureRef.current ? canvas.toDataURL("image/png") : "";
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
    context.beginPath();
    context.moveTo(point.x, point.y);
    hasSignatureRef.current = true;
    setIsDrawing(true);
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    saveSignature();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{label}</p>
        <button
          type="button"
          onClick={clearSignature}
          className="interactive-button inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RotateCcw size={14} />
          {clearLabel}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={720}
        height={220}
        className="h-44 w-full touch-none rounded-lg border border-dashed border-slate-300 bg-white dark:border-slate-700"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      <input ref={inputRef} type="hidden" name={name} />
    </div>
  );
}
