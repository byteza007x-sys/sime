import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Boxes, Download, EyeOff, Hash, Layers3, Search, Tag } from "lucide-react";
import LanguageSwitcher from "@/components/language-switcher";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import ThemeToggle from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type InventoryView = "active" | "inactive" | "all";

const copy = {
  en: {
    back: "Dashboard",
    title: "Inventory",
    subtitle: "Equipment serials imported from SAP Inventory Aging Report.",
    search: "Search item no., model, or serial no...",
    searchButton: "Search",
    clear: "Clear",
    exportCsv: "Export CSV",
    serials: "Serials",
    itemNo: "Item No.",
    totalModels: "Models",
    totalSerials: "Visible serials",
    inactiveSerials: "Hidden from SAP",
    empty: "No inventory found",
    noData: "-",
    active: "Current SAP",
    inactive: "Hidden",
    all: "All",
    lastSeen: "Last seen",
    neverSeen: "Not synced yet",
  },
  th: {
    back: "แดชบอร์ด",
    title: "อุปกรณ์",
    subtitle: "ข้อมูล serial จาก SAP Inventory Aging Report",
    search: "ค้นหา item no., model, serial no...",
    searchButton: "ค้นหา",
    clear: "ล้าง",
    exportCsv: "Export CSV",
    serials: "Serial",
    itemNo: "Item No.",
    totalModels: "รุ่นอุปกรณ์",
    totalSerials: "Serial ที่แสดง",
    inactiveSerials: "ซ่อนจาก SAP",
    empty: "ไม่พบข้อมูลอุปกรณ์",
    noData: "-",
    active: "อยู่ใน SAP ล่าสุด",
    inactive: "ซ่อนแล้ว",
    all: "ทั้งหมด",
    lastSeen: "พบล่าสุด",
    neverSeen: "ยังไม่เคย sync",
  },
} satisfies Record<Locale, object>;

const thaiCopy = {
  back: "แดชบอร์ด",
  title: "อุปกรณ์",
  subtitle: "ข้อมูล Serial จาก SAP Inventory Aging Report สำหรับค้นหาในใบเซอร์วิซ",
  search: "ค้นหา item no., model หรือ serial no...",
  searchButton: "ค้นหา",
  clear: "ล้าง",
  exportCsv: "Export CSV",
  serials: "Serial",
  itemNo: "Item No.",
  totalModels: "รุ่นอุปกรณ์",
  totalSerials: "Serial ที่แสดง",
  inactiveSerials: "ซ่อนจาก SAP",
  empty: "ไม่พบข้อมูลอุปกรณ์",
  noData: "-",
  active: "อยู่ใน SAP ล่าสุด",
  inactive: "ซ่อนแล้ว",
  all: "ทั้งหมด",
  lastSeen: "พบล่าสุด",
  neverSeen: "ยังไม่เคย sync",
} satisfies typeof copy.en;

interface InventoryPageProps {
  searchParams: RouteSearchParams;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const user = await requireUser(locale);
  await requireFeature({ key: "inventory", user, locale });
  const t = locale === "th" ? thaiCopy : copy.en;

  if (user.roles.role_name !== "admin" && !isOwnerUser(user)) {
    redirect(withLocale("/reports", locale));
  }

  const queryText = String(
    Array.isArray(params.q) ? params.q[0] : params.q ?? "",
  ).trim();
  const view = parseView(Array.isArray(params.view) ? params.view[0] : params.view);
  const exportParams = new URLSearchParams({
    lang: locale,
    view,
  });
  if (queryText) {
    exportParams.set("q", queryText);
  }
  const exportHref = `/api/inventory/export?${exportParams.toString()}`;
  const statusWhere =
    view === "active"
      ? {
          sap_is_active: {
            not: false,
          },
        }
      : view === "inactive"
        ? {
            sap_is_active: false,
          }
        : {};
  const searchWhere = queryText
    ? {
        OR: [
          {
            serial_number: {
              contains: queryText,
            },
          },
          {
            equipment_master: {
              sap_item_no: {
                contains: queryText,
              },
            },
          },
          {
            equipment_master: {
              model: {
                contains: queryText,
              },
            },
          },
          {
            equipment_master: {
              description: {
                contains: queryText,
              },
            },
          },
        ],
      }
    : {};
  const inventoryWhere = {
    AND: [statusWhere, searchWhere],
  };
  const [inventory, totalSerials, inactiveSerials] = await Promise.all([
    prisma.inventory.findMany({
      where: inventoryWhere,
      select: {
        inventory_id: true,
        serial_number: true,
        sap_is_active: true,
        last_seen_import_at: true,
        equipment_master: {
          select: {
            sap_item_no: true,
            model: true,
            description: true,
          },
        },
      },
      orderBy: [
        {
          equipment_master: {
            sap_item_no: "asc",
          },
        },
        {
          serial_number: "asc",
        },
      ],
      take: 1200,
    }),
    prisma.inventory.count({
      where: inventoryWhere,
    }),
    prisma.inventory.count({
      where: {
        sap_is_active: false,
      },
    }),
  ]);
  const groupedInventory = Array.from(
    inventory.reduce<
      Map<
        string,
        {
          key: string;
          itemNo: string;
          model: string;
          inactive: boolean;
          lastSeen: Date | null;
          serials: Array<{
            serial: string;
            inactive: boolean;
          }>;
        }
      >
    >((groups, item) => {
      const itemNo = item.equipment_master.sap_item_no || t.noData;
      const model =
        item.equipment_master.description || item.equipment_master.model || t.noData;
      const inactive = item.sap_is_active === false;
      const key = `${itemNo}::${model}::${inactive ? "inactive" : "active"}`;
      const group =
        groups.get(key) ??
        groups
          .set(key, {
            key,
            itemNo,
            model,
            inactive,
            lastSeen: item.last_seen_import_at,
            serials: [],
          })
          .get(key);

      group?.serials.push({
        serial: item.serial_number,
        inactive,
      });
      if (group && item.last_seen_import_at && (!group.lastSeen || item.last_seen_import_at > group.lastSeen)) {
        group.lastSeen = item.last_seen_import_at;
      }

      return groups;
    }, new Map()).values(),
  );

  return (
    <main className="min-h-screen bg-[#f3f6fb] px-4 py-5 pb-24 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6 md:pb-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href={withLocale("/dashboard", locale)}
                className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300"
              >
                <ArrowLeft size={16} />
                {t.back}
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <Boxes size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl">{t.title}</h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t.subtitle}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher locale={locale} pathname="/inventory" />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form action="/inventory" className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
            <input type="hidden" name="lang" value={locale} />
            <label className="relative block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />
              <input
                name="q"
                defaultValue={queryText}
                placeholder={t.search}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <select
              name="view"
              defaultValue={view}
              className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="active">{t.active}</option>
              <option value="inactive">{t.inactive}</option>
              <option value="all">{t.all}</option>
            </select>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
            >
              <Search size={16} />
              {t.searchButton}
            </button>
            <Link
              href={withLocale("/inventory", locale)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t.clear}
            </Link>
            <Link
              href={exportHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950"
            >
              <Download size={16} />
              {t.exportCsv}
            </Link>
          </form>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label={t.totalModels} value={groupedInventory.length} />
          <SummaryCard label={t.totalSerials} value={totalSerials} />
          <SummaryCard label={t.inactiveSerials} value={inactiveSerials} />
        </section>

        {groupedInventory.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {t.empty}
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {groupedInventory.map((group) => (
              <article
                key={group.key}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-2 text-xs font-bold uppercase text-blue-700 dark:text-blue-300">
                      <Tag size={14} />
                      {t.itemNo}: {group.itemNo}
                    </p>
                    <h2 className="mt-2 text-base font-bold text-slate-950 dark:text-white">
                      {group.model}
                    </h2>
                    <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t.lastSeen}:{" "}
                      {group.lastSeen ? formatDate(group.lastSeen, locale) : t.neverSeen}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {group.inactive ? (
                      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900">
                        <EyeOff size={13} />
                        {t.inactive}
                      </span>
                    ) : null}
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Hash size={13} />
                      {group.serials.length}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold uppercase text-slate-400">
                    {t.serials}
                  </p>
                  <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
                    {group.serials.map((item) => (
                      <span
                        key={item.serial}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                          item.inactive
                            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        }`}
                      >
                        <Layers3 size={13} />
                        {item.serial}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
      <MobileBottomNav locale={locale} homeHref="/dashboard" />
    </main>
  );
}

function parseView(value: string | undefined): InventoryView {
  return value === "inactive" || value === "all" ? value : "active";
}

function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}
