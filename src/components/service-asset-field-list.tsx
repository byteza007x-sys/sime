"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ListFilter, Plus, Search, Trash2, X } from "lucide-react";

export interface ServiceAssetSuggestion {
  key: string;
  inventoryId: number;
  label: string;
  model: string;
  serialNumber: string;
}

export interface ServiceAssetInitialRow {
  id: string;
  actionType: "Installed" | "Delivered" | "Returned";
  model: string;
  serialNumber: string;
  noSerial: boolean;
  inventoryId: number | null;
  amount: number;
  installationPoint: string;
}

interface ServiceAssetFieldListProps {
  suggestions: ServiceAssetSuggestion[];
  initialRows: ServiceAssetInitialRow[];
  searchUrl?: string;
  actionOptions?: Array<ServiceAssetInitialRow["actionType"]>;
  fixedActionType?: ServiceAssetInitialRow["actionType"];
  labels: {
    title: string;
    help: string;
    actionType: string;
    model: string;
    serialNumber: string;
    noSerial: string;
    amount: string;
    installationPoint: string;
    returnReason: string;
    add: string;
    remove: string;
    installed: string;
    delivered: string;
    returned: string;
    searchPlaceholder: string;
    suggestions: string;
    viewMore: string;
    choose: string;
    noResults: string;
    selected: string;
    close: string;
  };
}

type PickerField = "model" | "serial";
type AssetRowState = Omit<ServiceAssetInitialRow, "amount"> & {
  amount: number | "";
  serialNumbers: string[];
};

const createEmptyRow = (
  actionType: ServiceAssetInitialRow["actionType"] = "Delivered",
): AssetRowState => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  actionType,
  model: "",
  serialNumber: "",
  serialNumbers: [""],
  noSerial: false,
  inventoryId: null,
  amount: 1,
  installationPoint: "",
});

const normalize = (value: string) => value.trim().toLowerCase();

const isSuggestion = (value: unknown): value is ServiceAssetSuggestion => {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<ServiceAssetSuggestion>;

  return (
    typeof item.key === "string" &&
    typeof item.inventoryId === "number" &&
    typeof item.label === "string" &&
    typeof item.model === "string" &&
    typeof item.serialNumber === "string"
  );
};

const mergeSuggestions = (
  base: ServiceAssetSuggestion[],
  incoming: ServiceAssetSuggestion[],
) => {
  const byId = new Map<number, ServiceAssetSuggestion>();

  for (const suggestion of base) byId.set(suggestion.inventoryId, suggestion);
  for (const suggestion of incoming) byId.set(suggestion.inventoryId, suggestion);

  return Array.from(byId.values());
};

const uniqueModelSuggestions = (suggestions: ServiceAssetSuggestion[]) => {
  const byModel = new Map<string, ServiceAssetSuggestion>();

  for (const suggestion of suggestions) {
    const key = normalize(suggestion.model);
    if (!key || byModel.has(key)) continue;
    byModel.set(key, suggestion);
  }

  return Array.from(byModel.values());
};

const resizeSerialNumbers = (serialNumbers: string[], amount: number) => {
  const nextAmount = Math.max(1, Math.floor(amount) || 1);
  const next = serialNumbers.slice(0, nextAmount);

  while (next.length < nextAmount) next.push("");

  return next;
};

const getSafeAmount = (amount: number | "") =>
  typeof amount === "number" && Number.isFinite(amount) && amount > 0
    ? Math.floor(amount)
    : 1;

export default function ServiceAssetFieldList({
  suggestions,
  initialRows,
  searchUrl,
  actionOptions = ["Delivered", "Installed", "Returned"],
  fixedActionType,
  labels,
}: ServiceAssetFieldListProps) {
  const [rows, setRows] = useState<AssetRowState[]>(
    initialRows.length > 0
      ? initialRows.map((row) => ({
          ...row,
          amount: Math.max(1, row.amount || 1),
          serialNumbers: row.serialNumber ? [row.serialNumber] : [""],
        }))
      : [createEmptyRow(fixedActionType ?? actionOptions[0] ?? "Delivered")],
  );
  const [remoteSuggestions, setRemoteSuggestions] = useState<ServiceAssetSuggestion[]>([]);
  const [activePicker, setActivePicker] = useState<{
    rowId: string;
    field: PickerField;
    serialIndex?: number;
  } | null>(null);
  const [modalRowId, setModalRowId] = useState<string | null>(null);
  const [modalPicker, setModalPicker] = useState<{
    field: PickerField;
    serialIndex?: number;
  }>({ field: "serial" });
  const [modalQuery, setModalQuery] = useState("");
  const allSuggestions = useMemo(
    () => mergeSuggestions(suggestions, remoteSuggestions),
    [remoteSuggestions, suggestions],
  );

  const searchableSuggestions = useMemo(
    () =>
      allSuggestions.map((suggestion) => ({
        ...suggestion,
        searchText: normalize(
          [
            suggestion.label,
            suggestion.model,
            suggestion.serialNumber,
            String(suggestion.inventoryId),
          ].join(" "),
        ),
      })),
    [allSuggestions],
  );

  const suggestionBySerial = useMemo(() => {
    const options = new Map<string, ServiceAssetSuggestion>();

    for (const suggestion of allSuggestions) {
      options.set(normalize(suggestion.serialNumber), suggestion);
    }

    return options;
  }, [allSuggestions]);

  const updateRow = (
    rowId: string,
    patch: Partial<AssetRowState>,
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  };

  const modelMatchesRow = (suggestionModel: string, rowModel: string) => {
    const suggestionValue = normalize(suggestionModel);
    const rowValue = normalize(rowModel);

    if (!rowValue) return true;
    return suggestionValue.includes(rowValue) || rowValue.includes(suggestionValue);
  };

  const getModelMatches = (query: string, limit: number) => {
    const normalizedQuery = normalize(query);
    const matches = normalizedQuery
      ? searchableSuggestions.filter((suggestion) =>
          normalize(suggestion.model).includes(normalizedQuery),
        )
      : searchableSuggestions;

    return uniqueModelSuggestions(matches).slice(0, limit);
  };

  const getSerialMatches = (row: AssetRowState, query: string, limit: number) => {
    const normalizedQuery = normalize(query);
    const matches = searchableSuggestions.filter((suggestion) => {
      const matchesModel = modelMatchesRow(suggestion.model, row.model);
      const matchesSerial = normalizedQuery
        ? normalize(suggestion.serialNumber).includes(normalizedQuery)
        : true;

      return matchesModel && matchesSerial;
    });

    return matches.slice(0, limit);
  };

  const selectSuggestion = (
    rowId: string,
    suggestion: ServiceAssetSuggestion,
    field: PickerField = "serial",
    serialIndex = 0,
  ) => {
    const row = rows.find((item) => item.id === rowId);
    const currentSerials = row?.serialNumbers ?? [""];

    if (field === "model") {
      updateRow(rowId, {
        inventoryId: null,
        model: suggestion.model,
        serialNumber: "",
        serialNumbers: resizeSerialNumbers(
          currentSerials.map(() => ""),
          getSafeAmount(row?.amount ?? 1),
        ),
        noSerial: false,
      });
    } else {
      const nextSerials = resizeSerialNumbers(
        currentSerials,
        getSafeAmount(row?.amount ?? 1),
      );
      nextSerials[serialIndex] = suggestion.serialNumber;
      updateRow(rowId, {
        inventoryId: suggestion.inventoryId,
        model: suggestion.model || row?.model || "",
        serialNumber: nextSerials[0] || "",
        serialNumbers: nextSerials,
        noSerial: false,
      });
    }
    setActivePicker(null);
    setModalRowId(null);
  };

  const updateSerialNumber = (rowId: string, serialIndex: number, value: string) => {
    const row = rows.find((item) => item.id === rowId);
    if (!row) return;

    const nextSerials = resizeSerialNumbers(
      row.serialNumbers,
      getSafeAmount(row.amount),
    );
    const suggestion = suggestionBySerial.get(normalize(value));
    nextSerials[serialIndex] = value;

    updateRow(rowId, {
      serialNumber: nextSerials[0] || "",
      serialNumbers: nextSerials,
      noSerial: false,
      inventoryId: suggestion?.inventoryId ?? row.inventoryId,
      model: suggestion?.model || row.model,
    });
  };

  const openModal = (
    row: AssetRowState,
    field: PickerField = "serial",
    serialIndex = 0,
  ) => {
    setModalRowId(row.id);
    setModalPicker({ field, serialIndex });
    setModalQuery(
      field === "model"
        ? row.model
        : row.serialNumbers?.[serialIndex] || row.serialNumber || row.model || "",
    );
  };

  const modalRow = rows.find((row) => row.id === modalRowId) ?? null;
  const modalMatches = modalRow
    ? modalPicker.field === "model"
      ? getModelMatches(modalQuery || modalRow.model, 80)
      : getSerialMatches(modalRow, modalQuery, 80)
    : getModelMatches(modalQuery, 80);

  useEffect(() => {
    if (!searchUrl) return;

    const activeRow = activePicker
      ? rows.find((row) => row.id === activePicker.rowId) ?? null
      : null;
    const rawQuery =
      modalRow
        ? modalQuery
        : activeRow
          ? activePicker?.field === "model"
            ? activeRow.model
            : activeRow.serialNumbers[activePicker?.serialIndex ?? 0] || ""
          : "";
    const query = normalize(rawQuery);
    const modelFilter =
      activeRow && activePicker?.field === "serial"
        ? activeRow.model
        : modalRow?.model || "";

    if (query.length < 2 && normalize(modelFilter).length < 2) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (modelFilter) params.set("model", modelFilter);

        const response = await fetch(`${searchUrl}?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = (await response.json()) as { suggestions?: unknown };
        const nextSuggestions = Array.isArray(data.suggestions)
          ? data.suggestions.filter(isSuggestion)
          : [];

        if (nextSuggestions.length > 0) {
          setRemoteSuggestions((current) =>
            mergeSuggestions(current, nextSuggestions),
          );
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [activePicker, modalQuery, modalRow, rows, searchUrl]);

  useEffect(() => {
    if (!modalRow) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalRow]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-bold">{labels.title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {labels.help}
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const hasLinkedInventory = row.inventoryId !== null;
          const modelMatches = getModelMatches(row.model, 8);
          const safeAmount = getSafeAmount(row.amount);
          const serialFields = resizeSerialNumbers(row.serialNumbers, safeAmount);

          return (
            <div
              key={row.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
            >
              <AssetHiddenFields row={row} suggestionBySerial={suggestionBySerial} />
              <div className="grid gap-3 lg:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_90px_auto]">
                <label className="block">
                  <span className="text-xs font-bold text-slate-500">
                    {labels.actionType}
                  </span>
                  {fixedActionType ? (
                    <>
                      <input
                        type="hidden"
                        value={fixedActionType}
                      />
                      <div className="mt-1 flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900">
                        {fixedActionType === "Returned"
                          ? labels.returned
                          : fixedActionType === "Installed"
                            ? labels.installed
                            : labels.delivered}
                      </div>
                    </>
                  ) : (
                    <select
                      value={row.actionType}
                      onChange={(event) =>
                        updateRow(row.id, {
                          actionType: event.target
                            .value as ServiceAssetInitialRow["actionType"],
                        })
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                    >
                      {actionOptions.includes("Delivered") ? (
                        <option value="Delivered">{labels.delivered}</option>
                      ) : null}
                      {actionOptions.includes("Installed") ? (
                        <option value="Installed">{labels.installed}</option>
                      ) : null}
                      {actionOptions.includes("Returned") ? (
                        <option value="Returned">{labels.returned}</option>
                      ) : null}
                    </select>
                  )}
                </label>

                <div>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">
                      {labels.model}
                    </span>
                    <div className="mt-1 flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-400 dark:border-slate-700 dark:bg-slate-900">
                      <input
                        value={row.model}
                        onFocus={() =>
                          setActivePicker({ rowId: row.id, field: "model" })
                        }
                        onBlur={() =>
                          window.setTimeout(() => setActivePicker(null), 120)
                        }
                        onChange={(event) => {
                          updateRow(row.id, {
                            model: event.target.value,
                            inventoryId: null,
                            serialNumber: "",
                            serialNumbers: resizeSerialNumbers([], safeAmount),
                          });
                          setActivePicker({ rowId: row.id, field: "model" });
                        }}
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                        placeholder={labels.searchPlaceholder}
                      />
                      <button
                        type="button"
                        onClick={() => openModal(row, "model")}
                        className="interactive-button ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                        aria-label={labels.viewMore}
                      >
                        <Search size={15} />
                      </button>
                      {hasLinkedInventory ? (
                        <Check size={15} className="ml-2 shrink-0 text-emerald-600" />
                      ) : null}
                    </div>
                  </label>
                  <InlineSuggestionPanel
                    isOpen={
                      activePicker?.rowId === row.id &&
                      activePicker.field === "model"
                    }
                    labels={labels}
                    matches={modelMatches}
                    displayMode="model"
                    onSelect={(suggestion) =>
                      selectSuggestion(row.id, suggestion, "model")
                    }
                    onViewMore={() => openModal(row, "model")}
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500">
                    {labels.serialNumber}
                  </span>
                  <div className="mt-1 space-y-2">
                    {row.noSerial ? (
                      <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
                        {labels.noSerial}
                      </div>
                    ) : (
                      serialFields.map((serialValue, serialIndex) => {
                        const serialMatches = getSerialMatches(row, serialValue, 8);
                        const serialSuggestion = suggestionBySerial.get(
                          normalize(serialValue),
                        );

                        return (
                          <div key={`${row.id}-serial-${serialIndex}`}>
                            <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-400 dark:border-slate-700 dark:bg-slate-900">
                              <span className="mr-2 shrink-0 text-xs font-bold text-slate-400">
                                {serialIndex + 1}
                              </span>
                              <input
                                value={serialValue}
                                required={!row.noSerial}
                                onFocus={() =>
                                  setActivePicker({
                                    rowId: row.id,
                                    field: "serial",
                                    serialIndex,
                                  })
                                }
                                onBlur={() =>
                                  window.setTimeout(() => setActivePicker(null), 120)
                                }
                                onChange={(event) => {
                                  updateSerialNumber(
                                    row.id,
                                    serialIndex,
                                    event.target.value,
                                  );
                                  setActivePicker({
                                    rowId: row.id,
                                    field: "serial",
                                    serialIndex,
                                  });
                                }}
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                                placeholder="S/N"
                              />
                              <button
                                type="button"
                                onClick={() => openModal(row, "serial", serialIndex)}
                                className="interactive-button ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                                aria-label={labels.viewMore}
                              >
                                <Search size={15} />
                              </button>
                              {serialSuggestion ? (
                                <Check size={15} className="ml-2 shrink-0 text-emerald-600" />
                              ) : null}
                            </div>
                            <InlineSuggestionPanel
                              isOpen={
                                activePicker?.rowId === row.id &&
                                activePicker.field === "serial" &&
                                activePicker.serialIndex === serialIndex
                              }
                              labels={labels}
                              matches={serialMatches}
                              displayMode="serial"
                              onSelect={(suggestion) =>
                                selectSuggestion(row.id, suggestion, "serial", serialIndex)
                              }
                              onViewMore={() =>
                                openModal(row, "serial", serialIndex)
                              }
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <input
                      type="checkbox"
                      checked={row.noSerial}
                      onChange={(event) =>
                        updateRow(row.id, {
                          noSerial: event.target.checked,
                          serialNumber: "",
                          serialNumbers: event.target.checked
                            ? resizeSerialNumbers([], safeAmount)
                            : row.serialNumbers,
                          inventoryId: event.target.checked ? null : row.inventoryId,
                        })
                      }
                      className="h-4 w-4"
                    />
                    {labels.noSerial}
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-bold text-slate-500">
                    {labels.amount}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={row.amount}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      const nextAmount =
                        nextValue === "" ? "" : Math.max(1, Number(nextValue) || 1);

                      updateRow(row.id, {
                        amount: nextAmount,
                        serialNumbers: resizeSerialNumbers(
                          row.serialNumbers,
                          getSafeAmount(nextAmount),
                        ),
                      });
                    }}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setRows((current) =>
                      current.length > 1
                        ? current.filter((item) => item.id !== row.id)
                        : [createEmptyRow(fixedActionType ?? actionOptions[0] ?? "Delivered")],
                    )
                  }
                  className="interactive-button mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 px-3 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
                  aria-label={`${labels.remove} ${index + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="text-xs font-bold text-slate-500">
                    {row.actionType === "Returned"
                      ? labels.returnReason
                      : labels.installationPoint}
                  </span>
                  <input
                    value={row.installationPoint}
                    onChange={(event) =>
                      updateRow(row.id, {
                        installationPoint: event.target.value,
                      })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => openModal(row, "serial")}
                  className="interactive-button mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-200 dark:hover:bg-blue-950/40"
                >
                  <ListFilter size={16} />
                  {labels.viewMore}
                </button>
              </div>

              {hasLinkedInventory ? (
                <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {labels.selected}: #{row.inventoryId}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() =>
          setRows((current) => [
            ...current,
            createEmptyRow(fixedActionType ?? actionOptions[0] ?? "Delivered"),
          ])
        }
        className="interactive-button mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Plus size={16} />
        {labels.add}
      </button>

      {modalRow && typeof document !== "undefined"
        ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalRowId(null);
            }
          }}
        >
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 dark:border-slate-800">
              <div>
                <h3 className="font-bold">{labels.viewMore}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {labels.help}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalRowId(null)}
                className="interactive-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                aria-label={labels.close}
              >
                <X size={17} />
              </button>
            </div>

            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400 dark:border-slate-700 dark:bg-slate-950">
                <Search size={17} className="mr-2 shrink-0 text-slate-400" />
                <input
                  value={modalQuery}
                      onChange={(event) => setModalQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder={labels.searchPlaceholder}
                  autoFocus
                />
              </div>
              {modalRow.model || modalRow.serialNumber ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {labels.selected}:{" "}
                  {[modalRow.model, modalRow.serialNumber].filter(Boolean).join(" / ")}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {modalMatches.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {modalMatches.map((suggestion) => (
                    <AssetSuggestionCard
                      key={suggestion.key}
                      suggestion={suggestion}
                      chooseLabel={labels.choose}
                      displayMode={modalPicker.field}
                      onSelect={() =>
                        selectSuggestion(
                          modalRow.id,
                          suggestion,
                          modalPicker.field,
                          modalPicker.serialIndex ?? 0,
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {labels.noResults}
                  </p>
                  {modalQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => {
                        updateRow(modalRow.id, {
                          inventoryId: null,
                          model: modalQuery.trim(),
                          serialNumber: modalRow.serialNumber,
                        });
                        setModalRowId(null);
                      }}
                      className="interactive-button mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {labels.choose}: {modalQuery.trim()}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>,
          document.body,
        )
        : null}
    </div>
  );
}

function AssetHiddenFields({
  row,
  suggestionBySerial,
}: {
  row: AssetRowState;
  suggestionBySerial: Map<string, ServiceAssetSuggestion>;
}) {
  const safeAmount = getSafeAmount(row.amount);
  const serialNumbers = resizeSerialNumbers(row.serialNumbers, safeAmount);
  const entries = row.noSerial
    ? [
        {
          serialNumber: "",
          inventoryId: "",
          amount: safeAmount,
        },
      ]
    : serialNumbers.map((serialNumber) => {
        const suggestion = suggestionBySerial.get(normalize(serialNumber));

        return {
          serialNumber,
          inventoryId: suggestion?.inventoryId ? String(suggestion.inventoryId) : "",
          amount: 1,
        };
      });

  return (
    <>
      {entries.map((entry, index) => (
        <span key={`${row.id}-hidden-${index}`} className="hidden">
          <input type="hidden" name="assetActionTypes" value={row.actionType} />
          <input type="hidden" name="assetInventoryIds" value={entry.inventoryId} />
          <input type="hidden" name="assetModels" value={row.model} />
          <input type="hidden" name="assetSerialNumbers" value={entry.serialNumber} />
          <input type="hidden" name="assetNoSerials" value={row.noSerial ? "1" : "0"} />
          <input type="hidden" name="assetAmounts" value={String(entry.amount)} />
          <input
            type="hidden"
            name="assetInstallationPoints"
            value={row.installationPoint}
          />
        </span>
      ))}
    </>
  );
}

function AssetSuggestionCard({
  suggestion,
  chooseLabel,
  displayMode = "full",
  onSelect,
}: {
  suggestion: ServiceAssetSuggestion;
  chooseLabel: string;
  displayMode?: "full" | "model" | "serial";
  onSelect: () => void;
}) {
  const primaryText =
    displayMode === "serial"
      ? suggestion.serialNumber || "-"
      : suggestion.model || "-";
  const secondaryText =
    displayMode === "serial"
      ? suggestion.label || suggestion.model || ""
      : suggestion.serialNumber || "";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="interactive-card rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-800 dark:hover:bg-blue-950/40"
    >
      <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
        {primaryText}
      </span>
      {secondaryText ? (
        <span className="mt-2 block rounded-lg bg-white px-3 py-2 font-mono text-xs font-bold text-blue-700 dark:bg-slate-900 dark:text-blue-300">
          {secondaryText}
        </span>
      ) : null}
      {suggestion.label ? (
        <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
          {suggestion.label}
        </span>
      ) : null}
      <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
        <Check size={14} />
        {chooseLabel}
      </span>
    </button>
  );
}

function InlineSuggestionPanel({
  isOpen,
  labels,
  matches,
  displayMode = "full",
  onSelect,
  onViewMore,
}: {
  isOpen: boolean;
  labels: ServiceAssetFieldListProps["labels"];
  matches: ServiceAssetSuggestion[];
  displayMode?: "full" | "model" | "serial";
  onSelect: (suggestion: ServiceAssetSuggestion) => void;
  onViewMore: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>{labels.suggestions}</span>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onViewMore}
          className="interactive-button shrink-0 text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
        >
          {labels.viewMore}
        </button>
      </div>

      {matches.length > 0 ? (
        <div className="max-h-60 overflow-y-auto p-2">
          {matches.map((suggestion) => (
            <button
              key={suggestion.key}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(suggestion)}
              className="interactive-button block w-full rounded-lg px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              {displayMode === "serial" ? (
                <span className="block truncate font-mono text-sm font-bold text-blue-700 dark:text-blue-300">
                  {suggestion.serialNumber || "-"}
                </span>
              ) : displayMode === "model" ? (
                <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {suggestion.model || "-"}
                </span>
              ) : (
                <>
                  <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {suggestion.model || "-"}
                  </span>
                  <span className="mt-1 block truncate font-mono text-xs font-semibold text-blue-700 dark:text-blue-300">
                    S/N: {suggestion.serialNumber || "-"}
                  </span>
                  {suggestion.label ? (
                    <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
                      {suggestion.label}
                    </span>
                  ) : null}
                </>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
          {labels.noResults}
        </div>
      )}
    </div>
  );
}
