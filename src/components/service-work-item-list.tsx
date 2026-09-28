"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export interface ServiceWorkItemInitialRow {
  id: string;
  serviceType: string;
  serviceDetail: string;
  amount: number;
  rootProblem: string;
  resolution: string;
}

interface ServiceWorkItemListProps {
  initialRows: ServiceWorkItemInitialRow[];
  serviceOptions: Array<{
    value: string;
    label: string;
  }>;
  labels: {
    serviceType: string;
    serviceDetail: string;
    rootProblem: string;
    resolution: string;
    add: string;
    remove: string;
    required: string;
    placeholders: {
      serviceDetail: string;
      rootProblem: string;
      resolution: string;
    };
  };
}

const createEmptyRow = (): ServiceWorkItemInitialRow => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `work-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  serviceType: "Maintenance",
  serviceDetail: "",
  amount: 1,
  rootProblem: "",
  resolution: "",
});

export default function ServiceWorkItemList({
  initialRows,
  serviceOptions,
  labels,
}: ServiceWorkItemListProps) {
  const [rows, setRows] = useState<ServiceWorkItemInitialRow[]>(
    initialRows.length > 0 ? initialRows : [createEmptyRow()],
  );

  const updateRow = (
    rowId: string,
    patch: Partial<ServiceWorkItemInitialRow>,
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  };

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold">No.{index + 1}</p>
            <button
              type="button"
              onClick={() =>
                setRows((current) =>
                  current.length > 1
                    ? current.filter((item) => item.id !== row.id)
                    : [createEmptyRow()],
                )
              }
              className="interactive-button inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
            >
              <Trash2 size={15} />
              {labels.remove}
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <label className="block">
              <span className="flex items-center justify-between text-sm font-bold">
                {labels.serviceType}
                <span className="text-xs text-rose-500">{labels.required}</span>
              </span>
              <select
                name="serviceItemTypes"
                required
                value={row.serviceType}
                onChange={(event) =>
                  updateRow(row.id, { serviceType: event.target.value })
                }
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
              >
                {serviceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="flex items-center justify-between text-sm font-bold">
                {labels.serviceDetail}
                <span className="text-xs text-rose-500">{labels.required}</span>
              </span>
              <textarea
                name="serviceDetails"
                required
                rows={3}
                value={row.serviceDetail}
                onChange={(event) =>
                  updateRow(row.id, { serviceDetail: event.target.value })
                }
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                placeholder={labels.placeholders.serviceDetail}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="flex items-center justify-between text-sm font-bold">
                {labels.rootProblem}
                <span className="text-xs text-rose-500">{labels.required}</span>
              </span>
              <textarea
                name="rootProblems"
                required
                rows={3}
                value={row.rootProblem}
                onChange={(event) =>
                  updateRow(row.id, { rootProblem: event.target.value })
                }
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                placeholder={labels.placeholders.rootProblem}
              />
            </label>
            <label className="block">
              <span className="flex items-center justify-between text-sm font-bold">
                {labels.resolution}
                <span className="text-xs text-rose-500">{labels.required}</span>
              </span>
              <textarea
                name="resolutions"
                required
                rows={3}
                value={row.resolution}
                onChange={(event) =>
                  updateRow(row.id, { resolution: event.target.value })
                }
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                placeholder={labels.placeholders.resolution}
              />
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((current) => [...current, createEmptyRow()])}
        className="interactive-button inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Plus size={16} />
        {labels.add}
      </button>
    </div>
  );
}
