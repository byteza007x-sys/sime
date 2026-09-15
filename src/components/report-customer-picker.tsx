"use client";

import { Check, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type CustomerOption = {
  customer_id: number;
  sap_bp_code: string | null;
  company_name: string;
  phone: string | null;
  address?: string | null;
  province?: string | null;
};

type SiteOption = {
  site_id: number;
  customer_id: number;
  site_name: string | null;
  address: string | null;
  province: string | null;
};

type SearchCustomerOption = CustomerOption & { searchText: string };
type SearchSiteOption = SiteOption & { searchText: string };
type PickerField = "customer" | "site";

type ReportCustomerPickerProps = {
  customers: CustomerOption[];
  sites: SiteOption[];
  locale: "en" | "th";
  searchUrl?: string;
  initialCustomerId?: number | null;
  initialSiteId?: number | null;
  initialContactName?: string | null;
  initialContactPhone?: string | null;
};

const text = {
  en: {
    required: "Required",
    optional: "Optional",
    customer: "Customer",
    site: "Site",
    contact: "Contact person",
    phone: "Customer phone",
    customerPlaceholder: "Type customer name or BP code",
    sitePlaceholder: "Type site name or address",
    contactPlaceholder: "Type contact name",
    phonePlaceholder: "Type customer phone",
    suggestions: "Matching results",
    selectFromList: "Please choose a result from the list.",
    noSite: "No site",
    noResults: "No matching data",
    selected: "Selected",
    clear: "Clear",
    customerHint: "Search by customer name, BP Code, or phone.",
    siteHint: "Search by site name, address, or province.",
    addressPreview: "Address",
    autoSelectedSite: "Site selected automatically",
    chooseSite: "This customer has multiple sites. Please choose one.",
  },
  th: {
    required: "จำเป็น",
    optional: "ไม่บังคับ",
    customer: "ลูกค้า",
    site: "สถานที่",
    contact: "ผู้ติดต่อ",
    phone: "เบอร์ลูกค้า",
    customerPlaceholder: "พิมพ์ชื่อลูกค้า, BP Code หรือเบอร์โทร",
    sitePlaceholder: "พิมพ์ชื่อสถานที่, ที่อยู่ หรือจังหวัด",
    contactPlaceholder: "พิมพ์ชื่อผู้ติดต่อ",
    phonePlaceholder: "พิมพ์เบอร์ลูกค้า",
    suggestions: "รายการที่ตรงกัน",
    selectFromList: "กรุณากดเลือกรายการจากผลลัพธ์",
    noSite: "ไม่เลือกสถานที่",
    noResults: "ไม่พบข้อมูลที่ตรงกัน",
    selected: "เลือกแล้ว",
    clear: "ล้าง",
    customerHint: "ค้นหาได้จากชื่อลูกค้า, BP Code หรือเบอร์โทร",
    siteHint: "ค้นหาได้จากชื่อสถานที่, ที่อยู่ หรือจังหวัด",
  },
} as const;

const thaiText = {
  required: "จำเป็น",
  optional: "ไม่บังคับ",
  customer: "ลูกค้า",
  site: "สถานที่",
  contact: "ผู้ติดต่อ",
  phone: "เบอร์ลูกค้า",
  customerPlaceholder: "พิมพ์ชื่อลูกค้า, BP Code หรือเบอร์โทร",
  sitePlaceholder: "พิมพ์ชื่อสถานที่, ที่อยู่ หรือจังหวัด",
  contactPlaceholder: "พิมพ์ชื่อผู้ติดต่อ",
  phonePlaceholder: "พิมพ์เบอร์ลูกค้า",
  suggestions: "เลือกรายการที่ตรงกัน",
  selectFromList: "กรุณากดเลือกรายการจากผลลัพธ์",
  noSite: "ไม่เลือกสถานที่",
  noResults: "ไม่พบข้อมูลที่ตรงกัน",
  selected: "เลือกแล้ว",
  clear: "ล้าง",
  customerHint: "พิมพ์ชื่อลูกค้าหรือ BP Code แล้วเลือกจาก popup",
  siteHint: "เลือกไซต์จากรายการ หรือเว้นว่างได้",
  addressPreview: "\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48",
  autoSelectedSite: "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e44\u0e0b\u0e15\u0e4c\u0e43\u0e2b\u0e49\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34",
  chooseSite:
    "\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e19\u0e35\u0e49\u0e21\u0e35\u0e2b\u0e25\u0e32\u0e22\u0e44\u0e0b\u0e15\u0e4c \u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48",
} satisfies Record<keyof typeof text.en, string>;

type PickerLabels = Record<keyof typeof text.en, string>;

const normalize = (value: string | number | null | undefined) =>
  String(value ?? "").trim().toLocaleLowerCase();

const compact = (values: Array<string | number | null | undefined>) =>
  values.filter((value) => String(value ?? "").trim().length > 0).join(" ");

const isCustomerOption = (value: unknown): value is CustomerOption => {
  if (!value || typeof value !== "object") return false;

  const customer = value as Partial<CustomerOption>;

  return (
    typeof customer.customer_id === "number" &&
    typeof customer.company_name === "string" &&
    (typeof customer.sap_bp_code === "string" || customer.sap_bp_code === null) &&
    (typeof customer.phone === "string" || customer.phone === null) &&
    (typeof customer.address === "string" ||
      typeof customer.address === "undefined" ||
      customer.address === null) &&
    (typeof customer.province === "string" ||
      typeof customer.province === "undefined" ||
      customer.province === null)
  );
};

const isSiteOption = (value: unknown): value is SiteOption => {
  if (!value || typeof value !== "object") return false;

  const site = value as Partial<SiteOption>;

  return (
    typeof site.site_id === "number" &&
    typeof site.customer_id === "number" &&
    (typeof site.site_name === "string" || site.site_name === null) &&
    (typeof site.address === "string" || site.address === null) &&
    (typeof site.province === "string" || site.province === null)
  );
};

const mergeCustomers = (base: CustomerOption[], incoming: CustomerOption[]) => {
  const byId = new Map<number, CustomerOption>();

  for (const customer of base) byId.set(customer.customer_id, customer);
  for (const customer of incoming) byId.set(customer.customer_id, customer);

  return Array.from(byId.values());
};

const mergeSites = (base: SiteOption[], incoming: SiteOption[]) => {
  const byId = new Map<number, SiteOption>();

  for (const site of base) byId.set(site.site_id, site);
  for (const site of incoming) byId.set(site.site_id, site);

  return Array.from(byId.values());
};

export default function ReportCustomerPicker({
  customers,
  sites,
  locale,
  searchUrl,
  initialCustomerId,
  initialSiteId,
  initialContactName,
  initialContactPhone,
}: ReportCustomerPickerProps) {
  const t = locale === "th" ? thaiText : text.en;
  const openPickerLabel = locale === "th" ? "ค้นหา / เลือกเพิ่มเติม" : "Search / choose more";
  const searchingLabel = locale === "th" ? "กำลังค้นหา..." : "Searching...";
  const [customerOptions, setCustomerOptions] = useState(customers);
  const [siteOptions, setSiteOptions] = useState(sites);
  const initialCustomer = initialCustomerId
    ? customers.find((customer) => customer.customer_id === initialCustomerId)
    : null;
  const initialSite = initialSiteId
    ? sites.find((site) => site.site_id === initialSiteId)
    : null;
  const [customerId, setCustomerId] = useState(
    initialCustomerId ? String(initialCustomerId) : "",
  );
  const [siteId, setSiteId] = useState(initialSiteId ? String(initialSiteId) : "");
  const [customerQuery, setCustomerQuery] = useState(
    initialCustomer ? formatCustomer(initialCustomer) : "",
  );
  const [siteQuery, setSiteQuery] = useState(
    initialSite ? formatSite(initialSite, initialCustomer) : "",
  );
  const [activePicker, setActivePicker] = useState<PickerField | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [touched, setTouched] = useState<Record<PickerField, boolean>>({
    customer: false,
    site: false,
  });

  const searchableCustomers = useMemo<SearchCustomerOption[]>(
    () =>
      customerOptions.map((customer) => ({
        ...customer,
        searchText: normalize(
          compact([customer.company_name, customer.sap_bp_code, customer.phone]),
        ),
      })),
    [customerOptions],
  );

  const searchableSites = useMemo<SearchSiteOption[]>(
    () =>
      siteOptions.map((site) => ({
        ...site,
        searchText: normalize(compact([site.site_name, site.address, site.province])),
      })),
    [siteOptions],
  );

  const customerById = useMemo(() => {
    const map = new Map<string, CustomerOption>();
    for (const customer of customerOptions) {
      map.set(String(customer.customer_id), customer);
    }
    return map;
  }, [customerOptions]);

  const selectedCustomer = customerById.get(customerId) ?? null;
  const selectedSite = siteOptions.find((site) => String(site.site_id) === siteId) ?? null;
  const sitesForSelectedCustomer = useMemo(
    () =>
      customerId
        ? siteOptions.filter((site) => String(site.customer_id) === customerId)
        : [],
    [customerId, siteOptions],
  );
  const addressPreview =
    selectedSite?.address ||
    selectedSite?.province ||
    selectedCustomer?.address ||
    selectedCustomer?.province ||
    "";
  const canChooseSite = Boolean(selectedCustomer && sitesForSelectedCustomer.length > 1);

  const applySiteOptionsForCustomer = useCallback(
    (nextSites: SiteOption[], customer?: CustomerOption | null) => {
    if (nextSites.length === 1) {
      const siteCustomer =
        customer ??
        selectedCustomer ??
        customerById.get(String(nextSites[0].customer_id)) ??
        null;

      setSiteId(String(nextSites[0].site_id));
      setSiteQuery(formatSite(nextSites[0], siteCustomer));
      setActivePicker(null);
      return;
    }

    if (nextSites.length > 1) {
      setSiteId("");
      setSiteQuery("");
      setActivePicker("site");
    }
    },
    [customerById, selectedCustomer, setSiteId, setSiteQuery],
  );

  useEffect(() => {
    if (!searchUrl || !activePicker) {
      return;
    }

    const kind = activePicker;
    const query = normalize(kind === "customer" ? customerQuery : siteQuery);
    const shouldSearch =
      kind === "customer" ? query.length >= 2 : query.length >= 2 || Boolean(customerId);

    if (!shouldSearch) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      const params = new URLSearchParams({ kind });

      if (query) params.set("q", query);
      if (kind === "site" && customerId) params.set("customerId", customerId);

      try {
        setIsSearching(true);
        const response = await fetch(`${searchUrl}?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setIsSearching(false);
          return;
        }

        const data = (await response.json()) as {
          customers?: unknown;
          sites?: unknown;
        };
        const nextCustomers = Array.isArray(data.customers)
          ? data.customers.filter(isCustomerOption)
          : [];
        const nextSites = Array.isArray(data.sites)
          ? data.sites.filter(isSiteOption)
          : [];

        if (nextCustomers.length > 0) {
          setCustomerOptions((current) => mergeCustomers(current, nextCustomers));
        }
        if (nextSites.length > 0) {
          setSiteOptions((current) => mergeSites(current, nextSites));
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [activePicker, customerId, customerQuery, searchUrl, siteQuery]);

  useEffect(() => {
    if (!searchUrl || !customerId) return;

    const controller = new AbortController();
    const shouldAutoApplySite = !siteId;
    const timeoutId = window.setTimeout(async () => {
      const params = new URLSearchParams({
        kind: "site",
        customerId,
      });

      try {
        const response = await fetch(`${searchUrl}?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          customers?: unknown;
          sites?: unknown;
        };
        const nextCustomers = Array.isArray(data.customers)
          ? data.customers.filter(isCustomerOption)
          : [];
        const nextSites = Array.isArray(data.sites)
          ? data.sites.filter(isSiteOption)
          : [];

        if (nextCustomers.length > 0) {
          setCustomerOptions((current) => mergeCustomers(current, nextCustomers));
        }
        if (nextSites.length > 0) {
          setSiteOptions((current) => mergeSites(current, nextSites));
        }
        if (shouldAutoApplySite) {
          applySiteOptionsForCustomer(nextSites);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      }
    }, 80);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [applySiteOptionsForCustomer, customerId, searchUrl, siteId]);

  const customerMatches = useMemo(() => {
    const query = normalize(customerQuery);
    const matches = query
      ? searchableCustomers.filter((customer) => customer.searchText.includes(query))
      : searchableCustomers;

    return matches;
  }, [customerQuery, searchableCustomers]);

  const siteMatches = useMemo(() => {
    const query = normalize(siteQuery);
    const scopedSites = selectedCustomer
      ? searchableSites.filter((site) => String(site.customer_id) === customerId)
      : searchableSites;
    const matches = query
      ? scopedSites.filter((site) => site.searchText.includes(query))
      : scopedSites;

    return matches.slice(0, 30);
  }, [customerId, searchableSites, selectedCustomer, siteQuery]);

  const chooseCustomer = (customer: CustomerOption) => {
    setCustomerId(String(customer.customer_id));
    setCustomerQuery(formatCustomer(customer));
    setSiteId("");
    setSiteQuery("");
    setActivePicker(null);
    setTouched((current) => ({ ...current, customer: true }));

    const customerSites = siteOptions.filter(
      (site) => site.customer_id === customer.customer_id,
    );
    applySiteOptionsForCustomer(customerSites, customer);
  };

  const chooseSite = (site: SiteOption) => {
    const customer = customerById.get(String(site.customer_id)) ?? null;

    if (customer) {
      setCustomerId(String(customer.customer_id));
      setCustomerQuery(formatCustomer(customer));
    }

    setSiteId(String(site.site_id));
    setSiteQuery(formatSite(site, customer));
    setActivePicker(null);
    setTouched((current) => ({ ...current, customer: true, site: true }));
  };

  const clearCustomer = () => {
    setCustomerId("");
    setCustomerQuery("");
    setSiteId("");
    setSiteQuery("");
    setActivePicker("customer");
    setTouched((current) => ({ ...current, customer: true, site: false }));
  };

  const clearSite = () => {
    setSiteId("");
    setSiteQuery("");
    setActivePicker("site");
    setTouched((current) => ({ ...current, site: true }));
  };

  const customerNeedsSelection = touched.customer && customerQuery.trim() && !selectedCustomer;
  const showCustomerPanel = activePicker === "customer" || Boolean(customerNeedsSelection);
  const showSitePanel = activePicker === "site";

  return (
    <div className="space-y-4">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="siteId" value={siteId} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <SearchField
            label={t.customer}
            badge={t.required}
            value={customerQuery}
            placeholder={t.customerPlaceholder}
            hint={t.customerHint}
            selected={Boolean(selectedCustomer)}
            required
            invalid={Boolean(customerNeedsSelection)}
            requireSelection={!selectedCustomer}
            clearLabel={t.clear}
            openLabel={openPickerLabel}
            showOpenButton={false}
            onFocus={() => setActivePicker("customer")}
            onOpen={() => setActivePicker("customer")}
            onBlur={() => setTouched((current) => ({ ...current, customer: true }))}
            onClear={clearCustomer}
            onChange={(value) => {
              setCustomerQuery(value);
              setCustomerId("");
              setSiteId("");
              setSiteQuery("");
              setActivePicker("customer");
            }}
          />
          {showCustomerPanel ? (
            <CustomerResults
              labels={t}
              matches={customerMatches}
              selectedCustomerId={customerId}
              query={customerQuery}
              placeholder={t.customerPlaceholder}
              loading={
                isSearching &&
                activePicker === "customer" &&
                normalize(customerQuery).length >= 2
              }
              loadingLabel={searchingLabel}
              onQueryChange={(value) => {
                setCustomerQuery(value);
                setCustomerId("");
                setSiteId("");
                setSiteQuery("");
                setActivePicker("customer");
              }}
              onClose={() => setActivePicker(null)}
              onSelect={chooseCustomer}
            />
          ) : selectedCustomer ? (
            <SelectedLine label={t.selected} value={selectedCustomer.company_name} />
          ) : null}
          {customerNeedsSelection ? (
            <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">
              {t.selectFromList}
            </p>
          ) : null}
        </div>

        <div>
          <SearchField
            label={t.site}
            badge={t.optional}
            value={siteQuery}
            placeholder={t.sitePlaceholder}
            hint={t.siteHint}
            selected={Boolean(selectedSite)}
            clearLabel={t.clear}
            openLabel={openPickerLabel}
            showOpenButton={canChooseSite}
            readOnly={!canChooseSite}
            canClear={canChooseSite}
            onFocus={() => {
              if (canChooseSite) setActivePicker("site");
            }}
            onOpen={() => {
              if (canChooseSite) setActivePicker("site");
            }}
            onBlur={() => setTouched((current) => ({ ...current, site: true }))}
            onClear={clearSite}
            onChange={(value) => {
              if (!canChooseSite) return;
              setSiteQuery(value);
              setSiteId("");
              setActivePicker("site");
            }}
          />
          {showSitePanel ? (
            <SiteResults
              labels={t}
              matches={siteMatches}
              customerById={customerById}
              selectedSiteId={siteId}
              query={siteQuery}
              placeholder={t.sitePlaceholder}
              loading={
                isSearching &&
                activePicker === "site" &&
                (normalize(siteQuery).length >= 2 || Boolean(customerId))
              }
              loadingLabel={searchingLabel}
              onQueryChange={(value) => {
                setSiteQuery(value);
                setSiteId("");
                setActivePicker("site");
              }}
              onClose={() => setActivePicker(null)}
              onClear={clearSite}
              onSelect={chooseSite}
            />
          ) : selectedSite ? (
            <SelectedLine
              label={t.selected}
              value={formatSite(selectedSite, selectedCustomer)}
            />
          ) : null}
          {sitesForSelectedCustomer.length > 1 && !selectedSite ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {t.chooseSite}
            </p>
          ) : selectedSite && sitesForSelectedCustomer.length === 1 ? (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              {t.autoSelectedSite}
            </p>
          ) : null}
        </div>
      </div>

      {selectedCustomer && addressPreview ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
            {t.addressPreview}
          </p>
          <p className="mt-1 leading-6">{addressPreview}</p>
        </div>
      ) : null}

      <label className="block">
        <span className="flex items-center justify-between text-sm font-bold">
          {t.contact}
          <span className="text-xs text-slate-400">{t.optional}</span>
        </span>
        <input
          name="contactName"
          defaultValue={initialContactName ?? ""}
          placeholder={t.contactPlaceholder}
          autoComplete="off"
          className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
        />
      </label>

      <label className="block">
        <span className="flex items-center justify-between text-sm font-bold">
          {t.phone}
          <span className="text-xs text-slate-400">{t.optional}</span>
        </span>
        <input
          name="contactPhone"
          defaultValue={initialContactPhone ?? ""}
          placeholder={t.phonePlaceholder}
          autoComplete="tel"
          inputMode="tel"
          className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
        />
      </label>
    </div>
  );
}

function SearchField({
  label,
  badge,
  value,
  placeholder,
  hint,
  selected,
  required = false,
  invalid = false,
  requireSelection = false,
  clearLabel,
  openLabel,
  showOpenButton = true,
  readOnly = false,
  canClear = true,
  onFocus,
  onOpen,
  onBlur,
  onClear,
  onChange,
}: {
  label: string;
  badge: string;
  value: string;
  placeholder: string;
  hint: string;
  selected: boolean;
  required?: boolean;
  invalid?: boolean;
  requireSelection?: boolean;
  clearLabel: string;
  openLabel: string;
  showOpenButton?: boolean;
  readOnly?: boolean;
  canClear?: boolean;
  onFocus: () => void;
  onOpen: () => void;
  onBlur: () => void;
  onClear: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label className="block">
        <span className="flex items-center justify-between text-sm font-bold">
          {label}
          <span className={required ? "text-xs text-rose-500" : "text-xs text-slate-400"}>
            {badge}
          </span>
        </span>
        <div
          className={[
            "mt-2 flex h-11 items-center rounded-lg border bg-slate-50 px-3 transition focus-within:bg-white dark:bg-slate-950 dark:focus-within:bg-slate-900",
            invalid
              ? "border-rose-300 focus-within:border-rose-500 dark:border-rose-800"
              : "border-slate-200 focus-within:border-blue-400 dark:border-slate-700",
          ].join(" ")}
        >
          <Search size={17} className="mr-2 shrink-0 text-slate-400" />
          <input
            value={value}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            readOnly={readOnly}
            required={required}
            pattern={requireSelection ? "a^" : undefined}
            title={requireSelection ? "Please choose a result from the list." : undefined}
            autoComplete="off"
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {selected ? <Check size={16} className="ml-2 shrink-0 text-emerald-600" /> : null}
          {value && canClear ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onClear}
              className="interactive-button ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={clearLabel}
            >
              <X size={15} />
            </button>
          ) : null}
        </div>
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      </label>
      {showOpenButton ? (
        <button
          type="button"
          onClick={onOpen}
          className="interactive-button mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950 sm:w-auto"
        >
          <Search size={16} />
          {openLabel}
        </button>
      ) : null}
    </>
  );
}

function CustomerResults({
  labels,
  matches,
  selectedCustomerId,
  query,
  placeholder,
  loading,
  loadingLabel,
  onQueryChange,
  onClose,
  onSelect,
}: {
  labels: PickerLabels;
  matches: CustomerOption[];
  selectedCustomerId: string;
  query: string;
  placeholder: string;
  loading: boolean;
  loadingLabel: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSelect: (customer: CustomerOption) => void;
}) {
  return (
    <ResultShell
      title={labels.suggestions}
      closeLabel={labels.clear}
      query={query}
      placeholder={placeholder}
      visibleRows={10}
      onQueryChange={onQueryChange}
      onClose={onClose}
    >
      {loading ? <LoadingResult label={loadingLabel} /> : null}
      {matches.length > 0 ? (
        matches.map((customer) => {
          const selected = String(customer.customer_id) === selectedCustomerId;

          return (
            <button
              key={customer.customer_id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(customer)}
              className={[
                "block w-full rounded-lg px-3 py-2 text-left transition",
                selected
                  ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                  : "hover:bg-blue-50 dark:hover:bg-blue-950/40",
              ].join(" ")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {customer.company_name}
                </span>
                {selected ? <Check size={15} className="shrink-0 text-emerald-600" /> : null}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                {[customer.sap_bp_code, customer.phone].filter(Boolean).join(" / ") || "-"}
              </span>
            </button>
          );
        })
      ) : (
        <EmptyResult label={labels.noResults} />
      )}
    </ResultShell>
  );
}

function SiteResults({
  labels,
  matches,
  customerById,
  selectedSiteId,
  query,
  placeholder,
  loading,
  loadingLabel,
  onQueryChange,
  onClose,
  onClear,
  onSelect,
}: {
  labels: PickerLabels;
  matches: SiteOption[];
  customerById: Map<string, CustomerOption>;
  selectedSiteId: string;
  query: string;
  placeholder: string;
  loading: boolean;
  loadingLabel: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onClear: () => void;
  onSelect: (site: SiteOption) => void;
}) {
  return (
    <ResultShell
      title={labels.suggestions}
      closeLabel={labels.clear}
      query={query}
      placeholder={placeholder}
      visibleRows={10}
      onQueryChange={onQueryChange}
      onClose={onClose}
    >
      {loading ? <LoadingResult label={loadingLabel} /> : null}
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClear}
        className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {labels.noSite}
      </button>
      {matches.length > 0 ? (
        matches.map((site) => {
          const selected = String(site.site_id) === selectedSiteId;
          const customer = customerById.get(String(site.customer_id));

          return (
            <button
              key={site.site_id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(site)}
              className={[
                "block w-full rounded-lg px-3 py-2 text-left transition",
                selected
                  ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                  : "hover:bg-blue-50 dark:hover:bg-blue-950/40",
              ].join(" ")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                  {formatSite(site, customer)}
                </span>
                {selected ? <Check size={15} className="shrink-0 text-emerald-600" /> : null}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                {[customer?.company_name, site.province, site.address]
                  .filter(Boolean)
                  .join(" / ") || "-"}
              </span>
            </button>
          );
        })
      ) : (
        <EmptyResult label={labels.noResults} />
      )}
    </ResultShell>
  );
}

function ResultShell({
  title,
  closeLabel,
  query,
  placeholder,
  onQueryChange,
  onClose,
  children,
  visibleRows = 10,
}: {
  title: string;
  closeLabel: string;
  query: string;
  placeholder: string;
  visibleRows?: number;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-bold text-slate-950 dark:text-white">{title}</p>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClose}
            className="interactive-button inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
            aria-label={closeLabel}
          >
            <X size={17} />
          </button>
        </div>
        <div className="border-b border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <label className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-400 focus-within:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus-within:bg-slate-900">
            <Search size={17} className="mr-2 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              autoFocus
              autoComplete="off"
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        <div
          className="overflow-y-auto p-3"
          style={{ maxHeight: `min(62vh, ${Math.max(1, visibleRows) * 56}px)` }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function EmptyResult({ label }: { label: string }) {
  return <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">{label}</div>;
}

function LoadingResult({ label }: { label: string }) {
  return (
    <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
      {label}
    </div>
  );
}

function SelectedLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
      {label}: {value}
    </p>
  );
}

function formatCustomer(customer: CustomerOption) {
  return customer.sap_bp_code
    ? `${customer.sap_bp_code} - ${customer.company_name}`
    : customer.company_name;
}

function formatSite(site: SiteOption, customer?: CustomerOption | null) {
  const siteName = site.site_name?.trim() ?? "";
  const customerName = customer?.company_name.trim() ?? "";

  if (siteName && siteName !== customerName) return siteName;
  if (site.address) return site.address;
  if (site.province) return site.province;

  return siteName || "-";
}
