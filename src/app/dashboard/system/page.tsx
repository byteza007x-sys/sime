import Link from "next/link";
import { redirect } from "next/navigation";
import { access, mkdir, readFile } from "fs/promises";
import { constants } from "fs";
import path from "path";
import {
  Activity,
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  FileClock,
  HardDrive,
  Home,
  Menu,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
  UserCircle,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import BackupButton from "@/components/backup-button";
import BrandLogo from "@/components/brand-logo";
import CsvImportPanel from "@/components/csv-import-panel";
import LanguageSwitcher from "@/components/language-switcher";
import ThemeToggle from "@/components/theme-toggle";
import { triggerBackupAction } from "@/app/backup/actions";
import { logoutAction } from "@/app/login/actions";
import { importBusinessPartnersCsvAction, importInventoryCsvAction } from "@/app/dashboard/actions";
import { requireUser } from "@/lib/auth";
import { isFeatureEnabled, requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type LogUser = {
  username: string | null;
  full_name: string | null;
  email: string;
} | null;

type BackupSummary = {
  status: string;
  finishedAt: string | null;
  retentionDays: number | null;
  databaseOk: boolean;
  databaseSizeBytes: number;
  uploadsOk: boolean;
  uploadsSkipped: boolean;
  uploadsSizeBytes: number;
  errors: string[];
};

interface SystemPageProps {
  searchParams: RouteSearchParams;
}

const copy = {
  en: {
    admin: "Admin",
    logo: "e service",
    logout: "Logout",
    search: "Search system tools...",
    title: "System Admin",
    subtitle: "Control CSV imports, health checks, go-live readiness, and web activity logs.",
    breadcrumbDashboard: "Dashboard",
    breadcrumbCurrent: "System",
    healthTitle: "System Health",
    readinessTitle: "Go-live Readiness",
    csvTitle: "CSV Updates",
    logsTitle: "Web Activity Logs",
    latestImports: "Latest CSV import logs",
    ready: "Ready",
    attention: "Check",
    ok: "OK",
    error: "Error",
    noLogs: "No logs yet",
    database: "Database",
    photos: "Photo upload folder",
    signatures: "Signature upload folder",
    auditLog: "Audit log table",
    backup: "Daily backup",
    customers: "Customer data",
    inventory: "Inventory / serial data",
    users: "Active users",
    reports: "Service reports",
    records: "records",
    backupStatus: {
      title: "Backup Status",
      never: "No backup yet",
      latest: "Latest backup",
      database: "Database",
      uploads: "Uploads",
      retention: "Retention",
      size: "Size",
      errors: "Errors",
      days: "days",
      success: "Success",
      failed: "Failed",
      skipped: "Skipped",
    },
    nav: {
      dashboard: "Dashboard",
      serviceReports: "Service Reports",
      customers: "Customers",
      inventory: "Inventory",
      users: "Users",
      qrCode: "Create QR Code",
      systemAdmin: "System",
    },
    inventoryImport: {
      title: "Update Inventory from CSV",
      subtitle: "Upload the latest SAP CSV to refresh equipment, model, and serial lookup.",
      file: "Inventory CSV",
      button: "Import inventory",
      pending: "Importing inventory...",
      hint: "Use SAP Inventory Aging Report CSV. Sync mode hides serials not found in the latest file.",
      missing: "Please choose an inventory CSV file.",
      size: "Inventory CSV is too large.",
      imported: "Rows",
      created: "Created serials",
      updated: "Updated serials",
      deactivated: "Hidden serials",
      skipped: "Skipped rows",
      modeMerge: "Add / update only",
      modeMergeHelp: "Keep old serials visible even if they are not in this file.",
      modeSync: "Sync with latest SAP",
      modeSyncHelp: "Hide serials that are not found in the uploaded SAP file.",
    },
    customerImport: {
      title: "Update Customers from CSV",
      subtitle: "Upload SAP customer CSV to refresh customers and site addresses.",
      file: "Customer CSV",
      button: "Import customers",
      pending: "Importing customers...",
      hint: "Use the latest SAP Business Partners or Customer CSV file.",
      missing: "Please choose a customer CSV file.",
      size: "Customer CSV is too large.",
      created: "Created customers",
      updated: "Updated customers",
      skipped: "Skipped rows",
    },
  },
  th: {
    admin: "แอดมิน",
    logo: "e service",
    logout: "ออกจากระบบ",
    search: "ค้นหาเครื่องมือระบบ...",
    title: "ระบบ",
    subtitle: "ศูนย์จัดการการนำเข้า CSV สุขภาพระบบ ความพร้อมก่อนใช้งานจริง และ log การใช้งานเว็บ",
    breadcrumbDashboard: "แดชบอร์ด",
    breadcrumbCurrent: "ระบบ",
    healthTitle: "สุขภาพระบบ",
    readinessTitle: "ความพร้อมก่อนใช้งานจริง",
    csvTitle: "อัปเดตข้อมูล CSV",
    logsTitle: "Log การใช้งานเว็บ",
    latestImports: "Log นำเข้า CSV ล่าสุด",
    ready: "พร้อม",
    attention: "ควรตรวจ",
    ok: "ปกติ",
    error: "ผิดพลาด",
    noLogs: "ยังไม่มี log",
    database: "ฐานข้อมูล",
    photos: "โฟลเดอร์รูปภาพ",
    signatures: "โฟลเดอร์ลายเซ็น",
    auditLog: "ตาราง audit log",
    customers: "ข้อมูลลูกค้า",
    inventory: "ข้อมูลอุปกรณ์ / Serial",
    users: "ผู้ใช้ที่เปิดใช้งาน",
    reports: "ใบเซอร์วิซ",
    records: "รายการ",
    nav: {
      dashboard: "แดชบอร์ด",
      serviceReports: "ใบเซอร์วิซ",
      customers: "ลูกค้า",
      inventory: "อุปกรณ์",
      users: "ผู้ใช้",
      qrCode: "สร้าง QR Code",
      systemAdmin: "ระบบ",
    },
    inventoryImport: {
      title: "อัปเดตอุปกรณ์จาก CSV",
      subtitle: "อัปโหลดไฟล์ SAP ล่าสุด เพื่ออัปเดตข้อมูลอุปกรณ์ Model และ Serial",
      file: "ไฟล์ Inventory CSV",
      button: "นำเข้าอุปกรณ์",
      pending: "กำลังนำเข้าอุปกรณ์...",
      hint: "ใช้ไฟล์ SAP Inventory Aging Report CSV โหมด Sync จะซ่อน serial ที่ไม่มีในไฟล์ล่าสุด",
      missing: "กรุณาเลือกไฟล์ Inventory CSV",
      size: "ไฟล์ Inventory CSV ใหญ่เกินไป",
      imported: "จำนวนแถว",
      created: "Serial ใหม่",
      updated: "Serial ที่อัปเดต",
      deactivated: "Serial ที่ซ่อน",
      skipped: "แถวที่ข้าม",
      modeMerge: "เพิ่ม / อัปเดตเท่านั้น",
      modeMergeHelp: "เก็บข้อมูลเก่าไว้ แม้ไม่มีอยู่ในไฟล์รอบนี้",
      modeSync: "Sync กับ SAP ล่าสุด",
      modeSyncHelp: "ซ่อน serial เก่าที่ไม่พบในไฟล์ SAP ล่าสุด",
    },
    customerImport: {
      title: "อัปเดตลูกค้าจาก CSV",
      subtitle: "อัปโหลดไฟล์ลูกค้าจาก SAP เพื่ออัปเดตข้อมูลลูกค้าและที่อยู่ไซต์",
      file: "ไฟล์ Customer CSV",
      button: "นำเข้าลูกค้า",
      pending: "กำลังนำเข้าลูกค้า...",
      hint: "ใช้ไฟล์ SAP Business Partners หรือ Customer CSV ล่าสุด",
      missing: "กรุณาเลือกไฟล์ลูกค้า CSV",
      size: "ไฟล์ลูกค้า CSV ใหญ่เกินไป",
      created: "ลูกค้าใหม่",
      updated: "ลูกค้าที่อัปเดต",
      skipped: "แถวที่ข้าม",
    },
  },
} satisfies Record<Locale, object>;

const navKeys = [
  ["dashboard", "/dashboard", Home],
  ["serviceReports", "/reports", ClipboardList],
  ["customers", "/customers", Building2],
  ["inventory", "/inventory", Boxes],
  ["users", "/users", Users],
  ["qrCode", "/dashboard/qr-code", QrCode],
  ["systemAdmin", "/dashboard/system", Settings],
] as const;

const backupCopy = {
  en: {
    title: "Backup Status",
    healthTitle: "Daily backup",
    never: "No backup yet",
    latest: "Latest backup",
    database: "Database",
    uploads: "Uploads",
    retention: "Retention",
    size: "Size",
    errors: "Errors",
    days: "days",
    success: "Success",
    failed: "Failed",
    skipped: "Skipped",
  },
  th: {
    title: "สถานะสำรองข้อมูล",
    healthTitle: "สำรองข้อมูลรายวัน",
    never: "ยังไม่เคยสำรอง",
    latest: "สำรองล่าสุด",
    database: "ฐานข้อมูล",
    uploads: "รูปและลายเซ็น",
    retention: "เก็บย้อนหลัง",
    size: "ขนาดไฟล์",
    errors: "ข้อผิดพลาด",
    days: "วัน",
    success: "สำเร็จ",
    failed: "ล้มเหลว",
    skipped: "ข้าม",
  },
} satisfies Record<Locale, Record<string, string>>;

const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const checkWritableDirectory = async (directory: string) => {
  try {
    await mkdir(directory, { recursive: true });
    await access(directory, constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const formatNumber = (value: number, locale: Locale) =>
  value.toLocaleString(locale === "th" ? "th-TH" : "en-US");

const formatBytes = (value: number, locale: Locale) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  })} ${units[unitIndex]}`;
};

const resolveBackupRoot = () => {
  const configured = process.env.BACKUP_ROOT || path.join("backups", "daily");
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
};

const resolveConfiguredRetentionDays = () => {
  const raw = process.env.BACKUP_RETENTION_DAYS ?? "forever";
  if (["0", "forever", "never", "none", "off"].includes(raw.toLowerCase())) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const recordFromUnknown = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const stringFromRecord = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === "string" ? record[key] : null;

const numberFromRecord = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === "number" ? record[key] : 0;

const booleanFromRecord = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === "boolean" ? record[key] : false;

const readBackupSummary = async (): Promise<BackupSummary | null> => {
  try {
    const latestFile = path.join(resolveBackupRoot(), "latest-backup.json");
    const parsed: unknown = JSON.parse(await readFile(latestFile, "utf8"));
    const root = recordFromUnknown(parsed);
    if (!root) return null;

    const database = recordFromUnknown(root.database) ?? {};
    const uploads = recordFromUnknown(root.uploads) ?? {};
    const rawErrors = Array.isArray(root.errors) ? root.errors : [];

    return {
      status: stringFromRecord(root, "status") ?? "unknown",
      finishedAt: stringFromRecord(root, "finishedAt"),
      retentionDays: resolveConfiguredRetentionDays(),
      databaseOk: booleanFromRecord(database, "ok"),
      databaseSizeBytes: numberFromRecord(database, "sizeBytes"),
      uploadsOk: booleanFromRecord(uploads, "ok"),
      uploadsSkipped: booleanFromRecord(uploads, "skipped"),
      uploadsSizeBytes: numberFromRecord(uploads, "sizeBytes"),
      errors: rawErrors.filter((item): item is string => typeof item === "string"),
    };
  } catch {
    return null;
  }
};

const displayUser = (user: LogUser) =>
  user?.full_name || user?.username || user?.email || "System";

const summarizeLogData = (value: string | null) => {
  if (!value) return "-";

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return value;

    return Object.entries(parsed as Record<string, unknown>)
      .slice(0, 5)
      .map(([key, entryValue]) => `${key}: ${String(entryValue)}`)
      .join(" | ");
  } catch {
    return value.length > 160 ? `${value.slice(0, 160)}...` : value;
  }
};

export default async function DashboardSystemPage({ searchParams }: SystemPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const t = copy[locale];
  const user = await requireUser(locale);
  const isOwner = isOwnerUser(user);

  await requireFeature({ key: "dashboard", user, locale });
  await requireFeature({ key: "system_admin", user, locale });

  if (!isOwner && user.roles.role_name !== "admin") {
    redirect(withLocale("/reports", locale));
  }

  const [
    qrCodeEnabled,
    counts,
    activeUsers,
    submittedReports,
    needRevisionReports,
    auditLogCount,
    recentLogs,
    recentImportLogs,
    uploadHealth,
    backupSummary,
  ] = await Promise.all([
    isFeatureEnabled("qr_code"),
    Promise.all([
      prisma.customers.count(),
      prisma.customer_sites.count(),
      prisma.inventory.count(),
      prisma.service_reports.count(),
    ]),
    prisma.users.count({ where: { is_active: true } }),
    prisma.service_reports.count({ where: { status: "Submitted" } }),
    prisma.service_reports.count({ where: { status: "Need_Revision" } }),
    prisma.audit_logs.count(),
    prisma.audit_logs.findMany({
      include: {
        users: {
          select: {
            username: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 12,
    }),
    prisma.audit_logs.findMany({
      where: {
        OR: [
          { action: { contains: "import_inventory_csv" } },
          { action: { contains: "import_business_partners_csv" } },
        ],
      },
      include: {
        users: {
          select: {
            username: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 6,
    }),
    Promise.all([
      checkWritableDirectory(path.join(process.cwd(), "public", "uploads", "photos")),
      checkWritableDirectory(path.join(process.cwd(), "public", "uploads", "signatures")),
    ]),
    readBackupSummary(),
  ]);

  const [customerCount, siteCount, inventoryCount, reportCount] = counts;
  const [photosWritable, signaturesWritable] = uploadHealth;
  const backupT = backupCopy[locale];
  const backupReady = backupSummary?.status === "success";
  const importError = readParam(params.import_error);
  const customerImportError = readParam(params.customer_import_error);
  const backupStatus = readParam(params.backup);
  const importSuccess = Boolean(readParam(params.inventory_imported));
  const customerImportSuccess = Boolean(readParam(params.customer_imported));
  const importStats = {
    imported: readParam(params.inventory_imported),
    created: readParam(params.inventory_created),
    updated: readParam(params.inventory_updated),
    deactivated: readParam(params.inventory_deactivated),
    skipped: readParam(params.inventory_skipped),
  };
  const customerImportStats = {
    imported: readParam(params.customer_imported),
    created: readParam(params.customer_created),
    updated: readParam(params.customer_updated),
    skipped: readParam(params.customer_skipped),
  };
  const importErrorMessage =
    importError === "missing"
      ? t.inventoryImport.missing
      : importError === "size"
        ? t.inventoryImport.size
        : null;
  const customerImportErrorMessage =
    customerImportError === "missing"
      ? t.customerImport.missing
      : customerImportError === "size"
        ? t.customerImport.size
        : null;

  const dashboardNavItems = navKeys.filter(([key]) => {
    if (key === "qrCode") return qrCodeEnabled;
    return true;
  });
  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      hourCycle: "h23",
    }).format(date);
  const formatBackupDateTime = (value: string | null | undefined) => {
    if (!value) return backupT.never;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? backupT.never : formatDateTime(date);
  };
  const backupTotalSize =
    (backupSummary?.databaseSizeBytes ?? 0) +
    (backupSummary?.uploadsSizeBytes ?? 0);
  const readinessItems = [
    {
      icon: Building2,
      label: t.customers,
      detail: `${formatNumber(customerCount, locale)} ${t.records} / ${formatNumber(siteCount, locale)} sites`,
      ready: customerCount > 0 && siteCount > 0,
      href: "/customers",
    },
    {
      icon: Boxes,
      label: t.inventory,
      detail: `${formatNumber(inventoryCount, locale)} ${t.records}`,
      ready: inventoryCount > 0,
      href: "/inventory",
    },
    {
      icon: Users,
      label: t.users,
      detail: `${formatNumber(activeUsers, locale)} ${t.records}`,
      ready: activeUsers > 0,
      href: "/users",
    },
    {
      icon: ClipboardList,
      label: t.reports,
      detail: `${formatNumber(submittedReports, locale)} submitted / ${formatNumber(needRevisionReports, locale)} revision`,
      ready: true,
      href: "/reports",
    },
  ] as const;

  return (
    <main className="animate-page min-h-screen bg-[#f3f6fb] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="grid lg:grid-cols-[220px_1fr]">
        <aside className="animate-panel sticky top-0 hidden h-screen self-start overflow-y-auto bg-[#071e49] text-white dark:bg-black lg:block">
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
            <BrandLogo size={36} priority />
            <span className="text-sm font-bold uppercase tracking-wide">{t.logo}</span>
          </div>

          <nav className="space-y-1 px-3 py-4">
            {dashboardNavItems.map(([key, href, Icon]) => {
              const active = href === "/dashboard/system";

              return (
                <Link
                  key={`${key}-${href}`}
                  href={withLocale(href, locale)}
                  className={`interactive-button flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                    active ? "bg-[#0d6efd] text-white shadow-sm" : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  <Icon size={16} />
                  {t.nav[key]}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="animate-panel flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="interactive-button inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  className="h-9 w-72 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                  placeholder={t.search}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitcher locale={locale} pathname="/dashboard/system" />
              <ThemeToggle />
              <button
                type="button"
                className="interactive-button relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                aria-label="Notifications"
              >
                <Bell size={16} />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-blue-600">
                  <UserCircle size={20} />
                </div>
                <span className="hidden text-sm font-bold sm:inline">
                  {user.full_name || user.username || t.admin}
                </span>
              </div>
              <form action={logoutAction}>
                <input type="hidden" name="lang" value={locale} />
                <button
                  type="submit"
                  className="interactive-button hidden h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:inline-flex sm:items-center"
                >
                  {t.logout}
                </button>
              </form>
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6">
            {backupStatus === "success" || backupStatus === "failed" ? (
              <section
                className={`rounded-xl border px-5 py-4 text-sm font-bold ${
                  backupStatus === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                }`}
              >
                {backupStatus === "success"
                  ? locale === "th"
                    ? "สำรองข้อมูลเรียบร้อยแล้ว"
                    : "Backup completed."
                  : locale === "th"
                    ? "สำรองข้อมูลไม่สำเร็จ กรุณาตรวจสอบรายละเอียดด้านล่าง"
                    : "Backup failed. Please check the details below."}
              </section>
            ) : null}

            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <Link href={withLocale("/dashboard", locale)} className="text-blue-700 hover:text-blue-800 dark:text-blue-300">
                {t.breadcrumbDashboard}
              </Link>
              <span>/</span>
              <span>{t.breadcrumbCurrent}</span>
            </nav>

            <section className="animate-panel overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm dark:border-slate-800">
              <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-blue-100">
                    <Settings size={14} />
                    {t.logo}
                  </div>
                  <h1 className="mt-4 text-2xl font-bold tracking-normal sm:text-3xl">{t.title}</h1>
                  <p className="mt-2 max-w-3xl text-sm text-slate-300">{t.subtitle}</p>
                </div>
                <div className="hidden h-20 w-20 place-items-center rounded-2xl bg-white/10 text-blue-100 lg:grid">
                  <HardDrive size={42} />
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <HealthCard icon={Database} title={t.database} value={t.ok} ready />
              <HealthCard icon={UploadCloud} title={t.photos} value={photosWritable ? t.ok : t.error} ready={photosWritable} />
              <HealthCard icon={ShieldCheck} title={t.signatures} value={signaturesWritable ? t.ok : t.error} ready={signaturesWritable} />
              <HealthCard icon={FileClock} title={t.auditLog} value={formatNumber(auditLogCount, locale)} ready />
              <HealthCard icon={ClipboardList} title={t.reports} value={formatNumber(reportCount, locale)} ready />
              <HealthCard
                icon={HardDrive}
                title={backupT.healthTitle}
                value={
                  backupSummary
                    ? backupReady
                      ? backupT.success
                      : backupT.failed
                    : backupT.never
                }
                ready={backupReady}
              />
            </section>

            <section className="grid items-start gap-5 xl:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                <section className="grid gap-4 2xl:grid-cols-2">
                  <CsvImportPanel
                    title={t.customerImport.title}
                    subtitle={t.customerImport.subtitle}
                    hint={t.customerImport.hint}
                    fileLabel={t.customerImport.file}
                    buttonLabel={t.customerImport.button}
                    pendingLabel={t.customerImport.pending}
                    inputName="businessPartnersCsv"
                    action={importBusinessPartnersCsvAction}
                    locale={locale}
                    returnPath="/dashboard/system"
                    errorMessage={customerImportErrorMessage}
                    stats={
                      customerImportSuccess
                        ? [
                            [t.inventoryImport.imported, customerImportStats.imported],
                            [t.customerImport.created, customerImportStats.created],
                            [t.customerImport.updated, customerImportStats.updated],
                            [t.customerImport.skipped, customerImportStats.skipped],
                          ]
                        : []
                    }
                  />
                  <CsvImportPanel
                    title={t.inventoryImport.title}
                    subtitle={t.inventoryImport.subtitle}
                    hint={t.inventoryImport.hint}
                    fileLabel={t.inventoryImport.file}
                    buttonLabel={t.inventoryImport.button}
                    pendingLabel={t.inventoryImport.pending}
                    inputName="inventoryCsv"
                    action={importInventoryCsvAction}
                    locale={locale}
                    returnPath="/dashboard/system"
                    errorMessage={importErrorMessage}
                    modeOptions={{
                      name: "inventoryImportMode",
                      defaultValue: "merge",
                      options: [
                        {
                          value: "merge",
                          label: t.inventoryImport.modeMerge,
                          description: t.inventoryImport.modeMergeHelp,
                        },
                        {
                          value: "sync",
                          label: t.inventoryImport.modeSync,
                          description: t.inventoryImport.modeSyncHelp,
                        },
                      ],
                    }}
                    stats={
                      importSuccess
                        ? [
                            [t.inventoryImport.imported, importStats.imported],
                            [t.inventoryImport.created, importStats.created],
                            [t.inventoryImport.updated, importStats.updated],
                            [t.inventoryImport.deactivated, importStats.deactivated],
                            [t.inventoryImport.skipped, importStats.skipped],
                          ]
                        : []
                    }
                  />
                </section>

                <SystemPanel icon={FileClock} title={t.logsTitle}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3">เวลา</th>
                          <th className="px-4 py-3">ผู้ใช้</th>
                          <th className="px-4 py-3">Action</th>
                          <th className="px-4 py-3">Table</th>
                          <th className="px-4 py-3">รายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentLogs.length > 0 ? (
                          recentLogs.map((log) => (
                            <tr key={log.log_id} className="text-sm">
                              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(log.created_at)}</td>
                              <td className="px-4 py-3 font-semibold">{displayUser(log.users)}</td>
                              <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{log.action || "-"}</td>
                              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{log.table_name || "-"}</td>
                              <td className="max-w-md px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                {summarizeLogData(log.new_data)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                              {t.noLogs}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </SystemPanel>
              </div>

              <aside className="space-y-5">
                <SystemPanel icon={HardDrive} title={backupT.title}>
                  <div className="mb-4">
                    <BackupButton
                      action={triggerBackupAction}
                      locale={locale}
                      returnTo="/dashboard/system"
                      source="system"
                    />
                  </div>
                  {backupSummary ? (
                    <div className="space-y-3">
                      <BackupDetailRow
                        label={backupT.latest}
                        value={formatBackupDateTime(backupSummary.finishedAt)}
                      />
                      <BackupDetailRow
                        label={backupT.database}
                        value={backupSummary.databaseOk ? backupT.success : backupT.failed}
                        ready={backupSummary.databaseOk}
                      />
                      <BackupDetailRow
                        label={backupT.uploads}
                        value={
                          backupSummary.uploadsSkipped
                            ? backupT.skipped
                            : backupSummary.uploadsOk
                              ? backupT.success
                              : backupT.failed
                        }
                        ready={backupSummary.uploadsOk || backupSummary.uploadsSkipped}
                      />
                      <BackupDetailRow
                        label={backupT.size}
                        value={formatBytes(backupTotalSize, locale)}
                      />
                      <BackupDetailRow
                        label={backupT.retention}
                        value={
                          backupSummary.retentionDays
                            ? `${backupSummary.retentionDays} ${backupT.days}`
                            : locale === "th"
                              ? "เก็บถาวร"
                              : "Forever"
                        }
                      />
                      {backupSummary.errors.length > 0 ? (
                        <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs font-semibold leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                          <p className="mb-1 font-bold">{backupT.errors}</p>
                          {backupSummary.errors.slice(0, 3).map((error) => (
                            <p key={error}>{error}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      {backupT.never}
                    </div>
                  )}
                </SystemPanel>

                <SystemPanel icon={Activity} title={t.readinessTitle}>
                  <div className="space-y-3">
                    {readinessItems.map((item) => (
                      <ReadinessRow
                        key={item.label}
                        icon={item.icon}
                        href={withLocale(item.href, locale)}
                        label={item.label}
                        detail={item.detail}
                        ready={item.ready}
                        readyLabel={t.ready}
                        attentionLabel={t.attention}
                      />
                    ))}
                  </div>
                </SystemPanel>

                <SystemPanel icon={UploadCloud} title={t.latestImports}>
                  <div className="space-y-3">
                    {recentImportLogs.length > 0 ? (
                      recentImportLogs.map((log) => (
                        <div
                          key={log.log_id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                        >
                          <p className="text-sm font-bold">{log.action || "-"}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {displayUser(log.users)} | {formatDateTime(log.created_at)}
                          </p>
                          <p className="mt-2 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">
                            {summarizeLogData(log.new_data)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        {t.noLogs}
                      </div>
                    )}
                  </div>
                </SystemPanel>
              </aside>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function BackupDetailRow({
  label,
  value,
  ready,
}: {
  label: string;
  value: string;
  ready?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
      <span className="font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span
        className={`text-right font-bold ${
          ready === undefined
            ? "text-slate-900 dark:text-slate-100"
            : ready
              ? "text-emerald-700 dark:text-emerald-200"
              : "text-rose-700 dark:text-rose-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function HealthCard({
  icon: Icon,
  title,
  value,
  ready,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  ready: boolean;
}) {
  return (
    <article className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
          <Icon size={21} />
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            ready
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200"
          }`}
        >
          {value}
        </span>
      </div>
      <p className="mt-4 text-sm font-bold">{title}</p>
    </article>
  );
}

function SystemPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-panel rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
          <Icon size={20} />
        </div>
        <h2 className="font-bold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ReadinessRow({
  icon: Icon,
  href,
  label,
  detail,
  ready,
  readyLabel,
  attentionLabel,
}: {
  icon: LucideIcon;
  href: string;
  label: string;
  detail: string;
  ready: boolean;
  readyLabel: string;
  attentionLabel: string;
}) {
  const StatusIcon = ready ? CheckCircle2 : AlertTriangle;

  return (
    <Link
      href={href}
      className="interactive-button block rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900 dark:hover:bg-blue-950/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Icon size={16} className="text-blue-700 dark:text-blue-300" />
            {label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            ready
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200"
          }`}
        >
          <StatusIcon size={13} />
          {ready ? readyLabel : attentionLabel}
        </span>
      </div>
    </Link>
  );
}
