"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (displayWidth <= 0 || displayHeight <= 0) return;

      const nextWidth = Math.max(1, Math.round(displayWidth));
      const nextHeight = Math.max(1, Math.round(displayHeight));
      if (canvas.width === nextWidth && canvas.height === nextHeight) return;

      const previous = document.createElement("canvas");
      previous.width = canvas.width;
      previous.height = canvas.height;
      previous.getContext("2d")?.drawImage(canvas, 0, 0);

      canvas.width = nextWidth;
      canvas.height = nextHeight;
      const context = canvas.getContext("2d");
      if (!context) return;

      if (hasSignatureRef.current && previous.width > 0 && previous.height > 0) {
        context.drawImage(previous, 0, 0, nextWidth, nextHeight);
      }

      if (inputRef.current && hasSignatureRef.current) {
        inputRef.current.value = canvas.toDataURL("image/png");
      }
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const nativeEvent = event.nativeEvent;
    if (Number.isFinite(nativeEvent.offsetX) && Number.isFinite(nativeEvent.offsetY)) {
      return {
        x: Math.max(0, Math.min(canvas.clientWidth, nativeEvent.offsetX)),
        y: Math.max(0, Math.min(canvas.clientHeight, nativeEvent.offsetY)),
      };
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.offsetWidth > 0 ? rect.width / canvas.offsetWidth : 1;
    const scaleY = canvas.offsetHeight > 0 ? rect.height / canvas.offsetHeight : 1;
    if (rect.width <= 0 || rect.height <= 0 || scaleX <= 0 || scaleY <= 0) {
      return null;
    }

    return {
      x: (event.clientX - rect.left) / scaleX - canvas.clientLeft,
      y: (event.clientY - rect.top) / scaleY - canvas.clientTop,
    };
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !inputRef.current) return;

    inputRef.current.value = hasSignatureRef.current ? canvas.toDataURL("image/png") : "";
  };

  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;

    event.preventDefault();
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
    isDrawingRef.current = true;
  };

  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;

    event.preventDefault();
    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;
    saveSignature();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
    isDrawingRef.current = false;
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
        className="h-44 w-full touch-none cursor-crosshair rounded-lg border border-dashed border-slate-300 bg-white dark:border-slate-700"
        style={{ touchAction: "none" }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={(event) => {
          draw(event);
          stopDrawing();
        }}
        onPointerCancel={stopDrawing}
        onLostPointerCapture={stopDrawing}
      />
      <input ref={inputRef} type="hidden" name={name} />
    </div>
  );
}
