"use client";

import { useMemo, useState } from "react";
import { MapPin, Navigation, Save, Search, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type CustomerSiteGpsItem = {
  site_id: number;
  site_name: string;
  customer_name: string;
  address: string;
  house_no: string;
  village_no: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  postal_code: string;
  gps_lat: string;
  gps_long: string;
  gps_radius_meters: number;
};

type CustomerSiteGpsLabels = {
  open: string;
  title: string;
  hint: string;
  search: string;
  close: string;
  empty: string;
  noData: string;
  addressTitle: string;
  houseNo: string;
  villageNo: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  saveAddress: string;
  geocodeAddress: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  saveGps: string;
  gpsReady: string;
  gpsMissing: string;
};

interface CustomerSiteGpsModalProps {
  locale: Locale;
  sites: CustomerSiteGpsItem[];
  labels: CustomerSiteGpsLabels;
  updateAddressAction: (formData: FormData) => void | Promise<void>;
  updateGpsAction: (formData: FormData) => void | Promise<void>;
}

export default function CustomerSiteGpsModal({
  locale,
  sites,
  labels,
  updateAddressAction,
  updateGpsAction,
}: CustomerSiteGpsModalProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const localeName = locale === "th" ? "th-TH" : "en-US";
  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!normalizedQuery) return sites;

    return sites.filter((site) =>
      [
        site.site_name,
        site.customer_name,
        site.address,
        site.province,
        site.gps_lat,
        site.gps_long,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, sites]);

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black">
              <MapPin size={19} className="text-blue-700 dark:text-blue-300" />
              {labels.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {labels.hint}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="interactive-button inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800 md:w-auto"
          >
            <Search size={16} />
            {labels.open}
          </button>
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:px-5">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black">
                  <MapPin size={20} className="text-blue-700 dark:text-blue-300" />
                  {labels.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {matches.length.toLocaleString(localeName)} /{" "}
                  {sites.length.toLocaleString(localeName)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label={labels.close}
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <label className="relative block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={labels.search}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {matches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
                  {labels.empty}
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {matches.map((site) => {
                    const hasGps = Boolean(site.gps_lat && site.gps_long);

                    return (
                      <article
                        key={site.site_id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                              {site.site_name || labels.noData}
                            </p>
                            <p className="mt-1 truncate text-xs font-bold text-blue-700 dark:text-blue-300">
                              {site.customer_name}
                            </p>
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {site.address || site.province || labels.noData}
                            </p>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                              hasGps
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900"
                                : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900"
                            }`}
                          >
                            <Navigation size={13} />
                            {hasGps ? labels.gpsReady : labels.gpsMissing}
                          </span>
                        </div>

                        <form action={updateAddressAction} className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <input type="hidden" name="lang" value={locale} />
                          <input type="hidden" name="siteId" value={site.site_id} />
                          <p className="mb-3 text-sm font-bold">{labels.addressTitle}</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <TextInput label={labels.houseNo} name="houseNo" value={site.house_no} />
                            <TextInput label={labels.villageNo} name="villageNo" value={site.village_no} />
                            <TextInput label={labels.road} name="road" value={site.road} wide />
                            <TextInput label={labels.subdistrict} name="subdistrict" value={site.subdistrict} />
                            <TextInput label={labels.district} name="district" value={site.district} />
                            <TextInput label={labels.province} name="province" value={site.province} />
                            <TextInput label={labels.postalCode} name="postalCode" value={site.postal_code} />
                          </div>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <button
                              type="submit"
                              className="interactive-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
                            >
                              <Save size={16} />
                              {labels.saveAddress}
                            </button>
                            <button
                              type="submit"
                              name="geocode"
                              value="1"
                              className="interactive-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 sm:w-auto"
                            >
                              <Navigation size={16} />
                              {labels.geocodeAddress}
                            </button>
                          </div>
                        </form>

                        <form action={updateGpsAction} className="mt-3">
                          <input type="hidden" name="lang" value={locale} />
                          <input type="hidden" name="siteId" value={site.site_id} />
                          <div className="grid gap-3 sm:grid-cols-3">
                            <NumberInput
                              label={labels.latitude}
                              name="gpsLat"
                              value={site.gps_lat}
                              min={-90}
                              max={90}
                              step="0.000001"
                              placeholder="13.756331"
                            />
                            <NumberInput
                              label={labels.longitude}
                              name="gpsLong"
                              value={site.gps_long}
                              min={-180}
                              max={180}
                              step="0.000001"
                              placeholder="100.501762"
                            />
                            <NumberInput
                              label={labels.radiusMeters}
                              name="gpsRadiusMeters"
                              value={String(site.gps_radius_meters)}
                              min={50}
                              max={10000}
                              step="1"
                            />
                          </div>
                          <button
                            type="submit"
                            className="interactive-button mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 sm:w-auto"
                          >
                            <Save size={16} />
                            {labels.saveGps}
                          </button>
                        </form>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TextInput({
  label,
  name,
  value,
  wide = false,
}: {
  label: string;
  name: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "block sm:col-span-2" : "block"}>
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <input
        name={name}
        defaultValue={value}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}

function NumberInput({
  label,
  name,
  value,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  min: number;
  max: number;
  step: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <input
        name={name}
        type="number"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}
