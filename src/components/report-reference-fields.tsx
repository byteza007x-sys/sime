"use client";

import { useState } from "react";

type ReferenceType =
  | "quotation"
  | "project"
  | "service_call"
  | "quotation_project"
  | "quotation_service_call"
  | "project_service_call";

type ReportReferenceFieldsProps = {
  locale: "en" | "th";
  quotationLabel: string;
  projectLabel: string;
  serviceCallLabel: string;
  requiredLabel: string;
  referenceTypeLabel: string;
  quotationOption: string;
  projectOption: string;
  serviceCallOption: string;
  quotationProjectOption: string;
  quotationServiceCallOption: string;
  projectServiceCallOption: string;
  quotationPlaceholder: string;
  projectPlaceholder: string;
  serviceCallPlaceholder: string;
};

export default function ReportReferenceFields({
  locale,
  quotationLabel,
  projectLabel,
  serviceCallLabel,
  requiredLabel,
  referenceTypeLabel,
  quotationOption,
  projectOption,
  serviceCallOption,
  quotationProjectOption,
  quotationServiceCallOption,
  projectServiceCallOption,
  quotationPlaceholder,
  projectPlaceholder,
  serviceCallPlaceholder,
}: ReportReferenceFieldsProps) {
  const [referenceType, setReferenceType] = useState<ReferenceType>("quotation");
  const needsQuotation =
    referenceType === "quotation" ||
    referenceType === "quotation_project" ||
    referenceType === "quotation_service_call";
  const needsProject =
    referenceType === "project" ||
    referenceType === "quotation_project" ||
    referenceType === "project_service_call";
  const needsServiceCall =
    referenceType === "service_call" ||
    referenceType === "quotation_service_call" ||
    referenceType === "project_service_call";
  const fieldClass =
    "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900";
  const helpText =
    locale === "th"
      ? "เลือกประเภทเลขอ้างอิงก่อน ระบบจะแสดงเฉพาะช่องที่ต้องกรอก"
      : "Choose a reference type first. Only the required fields are shown.";

  return (
    <div className="lg:col-span-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="space-y-4">
          <label className="block max-w-xl">
            <span className="text-sm font-bold">{referenceTypeLabel}</span>
            <select
              name="referenceType"
              value={referenceType}
              onChange={(event) => setReferenceType(event.target.value as ReferenceType)}
              className={fieldClass}
            >
              <option value="quotation">{quotationOption}</option>
              <option value="project">{projectOption}</option>
              <option value="service_call">{serviceCallOption}</option>
              <option value="quotation_project">{quotationProjectOption}</option>
              <option value="quotation_service_call">{quotationServiceCallOption}</option>
              <option value="project_service_call">{projectServiceCallOption}</option>
            </select>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {helpText}
            </p>
          </label>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {needsQuotation ? (
              <ReferenceInput
                label={quotationLabel}
                name="quotationNumber"
                placeholder={quotationPlaceholder}
                requiredLabel={requiredLabel}
                className={fieldClass}
              />
            ) : null}

            {needsProject ? (
              <ReferenceInput
                label={projectLabel}
                name="projectNumber"
                placeholder={projectPlaceholder}
                requiredLabel={requiredLabel}
                className={fieldClass}
              />
            ) : null}

            {needsServiceCall ? (
              <ReferenceInput
                label={serviceCallLabel}
                name="serviceCallNumber"
                placeholder={serviceCallPlaceholder}
                requiredLabel={requiredLabel}
                className={fieldClass}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferenceInput({
  label,
  name,
  placeholder,
  requiredLabel,
  className,
}: {
  label: string;
  name: string;
  placeholder: string;
  requiredLabel: string;
  className: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm font-bold">
        <span>{label}</span>
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600 dark:bg-rose-950/50 dark:text-rose-200">
          {requiredLabel}
        </span>
      </span>
      <input name={name} required className={className} placeholder={placeholder} />
    </label>
  );
}
