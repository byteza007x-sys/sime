"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

interface ReportPhotoFieldListProps {
  addLabel: string;
  captionLabel: string;
  captionPlaceholder: string;
  compressingLabel?: string;
  compressionFailedLabel?: string;
  fileHint: string;
  fileLabel: string;
  optimizedLabel?: string;
  originalLabel?: string;
  removeLabel: string;
  tooLargeLabel?: string;
}

type PhotoStatus = "idle" | "compressing" | "optimized" | "original" | "too-large" | "error";

type PhotoRow = {
  id: string;
  compressedSize?: number;
  fileName?: string;
  originalSize?: number;
  previewUrl?: string;
  status: PhotoStatus;
};

const createRow = () => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  status: "idle" as PhotoStatus,
});

const MAX_IMAGE_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const formatBytes = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const fileNameAsJpeg = (fileName: string) => {
  const cleanName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]+/g, "-");

  return `${cleanName || "service-photo"}.jpg`;
};

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cannot read selected image."));
    };
    image.src = url;
  });

const compressImageFile = async (file: File) => {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type)) return file;

  const image = await loadImage(file);
  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });

  if (!blob || blob.size >= file.size) return file;

  return new File([blob], fileNameAsJpeg(file.name), {
    lastModified: Date.now(),
    type: "image/jpeg",
  });
};

export default function ReportPhotoFieldList({
  addLabel,
  captionLabel,
  captionPlaceholder,
  compressingLabel = "Optimizing image...",
  compressionFailedLabel = "Could not optimize. Original image will be used.",
  fileHint,
  fileLabel,
  optimizedLabel = "Optimized",
  originalLabel = "Original image",
  removeLabel,
  tooLargeLabel = "Image is larger than 5 MB. Please choose a smaller image.",
}: ReportPhotoFieldListProps) {
  const [rows, setRows] = useState<PhotoRow[]>([createRow()]);
  const previewUrls = useRef(new Set<string>());

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    [],
  );

  const rememberPreviewUrl = (url: string) => {
    previewUrls.current.add(url);

    return url;
  };

  const releasePreviewUrl = (url?: string) => {
    if (!url) return;

    URL.revokeObjectURL(url);
    previewUrls.current.delete(url);
  };

  const removeRow = (rowId: string) => {
    setRows((current) => {
      if (current.length === 1) return current;

      const removedRow = current.find((item) => item.id === rowId);
      releasePreviewUrl(removedRow?.previewUrl);

      return current.filter((item) => item.id !== rowId);
    });
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    rowId: string,
  ) => {
    const input = event.currentTarget;
    input.setCustomValidity("");
    const file = input.files?.[0] ?? null;
    const existingRow = rows.find((row) => row.id === rowId);

    releasePreviewUrl(existingRow?.previewUrl);

    if (!file) {
      setRows((current) =>
        current.map((row) =>
          row.id === rowId
            ? { ...row, fileName: undefined, previewUrl: undefined, status: "idle" }
            : row,
        ),
      );
      return;
    }

    const initialPreviewUrl = rememberPreviewUrl(URL.createObjectURL(file));

    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              compressedSize: undefined,
              fileName: file.name,
              originalSize: file.size,
              previewUrl: initialPreviewUrl,
              status: "compressing",
            }
          : row,
      ),
    );

    try {
      const optimizedFile = await compressImageFile(file);
      const canReplaceInputFiles =
        optimizedFile !== file && typeof DataTransfer !== "undefined";
      const finalFile = canReplaceInputFiles ? optimizedFile : file;

      if (canReplaceInputFiles) {
        const transfer = new DataTransfer();

        transfer.items.add(finalFile);
        input.files = transfer.files;
      }

      if (finalFile.size > MAX_UPLOAD_BYTES) {
        input.setCustomValidity(tooLargeLabel);
      }

      const finalPreviewUrl =
        finalFile === file
          ? initialPreviewUrl
          : rememberPreviewUrl(URL.createObjectURL(finalFile));

      if (finalPreviewUrl !== initialPreviewUrl) releasePreviewUrl(initialPreviewUrl);

      setRows((current) =>
        current.map((row) =>
          row.id === rowId
            ? {
              ...row,
                compressedSize: finalFile.size,
                fileName: finalFile.name,
                originalSize: file.size,
                previewUrl: finalPreviewUrl,
                status:
                  finalFile.size > MAX_UPLOAD_BYTES
                    ? "too-large"
                    : finalFile.size < file.size
                      ? "optimized"
                      : "original",
              }
            : row,
        ),
      );
    } catch {
      setRows((current) =>
        current.map((row) =>
          row.id === rowId
            ? {
                ...row,
                compressedSize: file.size,
                fileName: file.name,
                originalSize: file.size,
                previewUrl: initialPreviewUrl,
                status: "error",
              }
            : row,
        ),
      );
    }
  };

  const photoStatusText = (row: PhotoRow) => {
    if (row.status === "compressing") return compressingLabel;
    if (row.status === "optimized") {
      return `${optimizedLabel}: ${formatBytes(row.originalSize)} -> ${formatBytes(
        row.compressedSize,
      )}`;
    }
    if (row.status === "error") return compressionFailedLabel;
    if (row.status === "too-large") return tooLargeLabel;
    if (row.status === "original") return `${originalLabel}: ${formatBytes(row.originalSize)}`;

    return "";
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto]">
            <label className="block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {captionLabel}
              </span>
              <textarea
                name="photoCaptions"
                rows={2}
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                placeholder={captionPlaceholder}
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {fileLabel}
              </span>
              <input type="hidden" name="photoTypes" value="Other" />
              <input
                name="photoFiles"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  void handleFileChange(event, row.id);
                }}
                className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-800 dark:text-slate-300"
              />
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {fileHint}
              </p>
              {row.previewUrl ? (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                  <div
                    className="h-14 w-14 shrink-0 rounded-md bg-slate-100 bg-cover bg-center dark:bg-slate-800"
                    style={{ backgroundImage: `url(${row.previewUrl})` }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                      {row.fileName}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {photoStatusText(row)}
                    </p>
                  </div>
                </div>
              ) : null}
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                className="interactive-button inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label={`${removeLabel} ${index + 1}`}
                title={removeLabel}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((current) => [...current, createRow()])}
        className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
      >
        <ImagePlus size={18} />
        {addLabel}
      </button>
    </div>
  );
}
