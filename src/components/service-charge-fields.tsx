"use client";

import { useState } from "react";

type ChargeType = "Free_Service" | "Charged" | "Other";

interface ServiceChargeFieldsProps {
  initialChargeType: string | null;
  initialServiceFee: string;
  initialOtherChargeNote: string;
  labels: {
    freeService: string;
    charged: string;
    other: string;
    serviceFee: string;
    chargeNote: string;
    freeServiceNote: string;
  };
}

const isChargeType = (value: string): value is ChargeType =>
  value === "Free_Service" || value === "Charged" || value === "Other";

export default function ServiceChargeFields({
  initialChargeType,
  initialServiceFee,
  initialOtherChargeNote,
  labels,
}: ServiceChargeFieldsProps) {
  const [chargeType, setChargeType] = useState<ChargeType>(
    initialChargeType && isChargeType(initialChargeType)
      ? initialChargeType
      : "Free_Service",
  );
  const [otherChargeNote, setOtherChargeNote] = useState(
    (initialChargeType || "Free_Service") === "Free_Service" && !initialOtherChargeNote
      ? labels.freeServiceNote
      : initialOtherChargeNote,
  );
  const handleChargeTypeChange = (nextChargeType: ChargeType) => {
    setChargeType(nextChargeType);
    if (nextChargeType === "Free_Service" && !otherChargeNote.trim()) {
      setOtherChargeNote(labels.freeServiceNote);
    }
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ["Free_Service", labels.freeService],
          ["Charged", labels.charged],
          ["Other", labels.other],
        ].map(([value, label]) => (
          <label
            key={value}
            className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"
          >
            <input
              type="radio"
              name="chargeType"
              value={value}
              checked={chargeType === value}
              onChange={() => handleChargeTypeChange(value as ChargeType)}
              className="h-4 w-4"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold">{labels.serviceFee}</span>
          <input
            name="serviceFee"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initialServiceFee}
            disabled={chargeType === "Free_Service"}
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold">{labels.chargeNote}</span>
          <input
            name="otherChargeNote"
            value={otherChargeNote}
            onChange={(event) => setOtherChargeNote(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
      </div>
    </>
  );
}
