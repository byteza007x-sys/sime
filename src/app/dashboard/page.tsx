import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Boxes,
  Building2,
  ChevronRight,
  ClipboardList,
  Home,
  LifeBuoy,
  QrCode,
  Settings,
  Sparkles,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";
import BrandLogo from "@/components/brand-logo";
import DashboardAnalytics from "@/components/dashboard-analytics";
import LanguageSwitcher from "@/components/language-switcher";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import NotificationBell from "@/components/notification-bell";
import NotificationInbox from "@/components/notification-inbox";
import ThemeToggle from "@/components/theme-toggle";
import { logoutAction } from "@/app/login/actions";
import { requireUser } from "@/lib/auth";
import { isFeatureEnabled, requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ServiceReportStatus =
  | "Draft"
  | "Open"
  | "Assigned"
  | "In_Progress"
  | "On_Site"
  | "Pending_Customer"
  | "Submitted"
  | "Need_Revision"
  | "Completed"
  | "Approved"
  | "Closed"
  | "Cancelled";

const copy = {
  en: {
    search: "Search jobs, customers, serials...",
    admin: "Admin",
    title: "Command Dashboard",
    subtitle: "Live service operations, SAP imports, review queue, and system health.",
    newJob: "Create Job",
    logout: "Logout",
    logo: "e service",
    nav: {
      dashboard: "Dashboard",
      serviceReports: "Jobs",
      customers: "Customers",
      inventory: "Inventory",
      qrCode: "Create QR Code",
      systemAdmin: "System",
      users: "Users",
    },
    kpi: {
      totalJobs: "Total Job",
      customers: "Customers",
      users: "Users",
      equipment: "Serials",
    },
    charts: {
      jobsByMonth: "Jobs in the last 6 months",
      statusMix: "Workload status mix",
      open: "Active",
      inProgress: "In Progress Jobs",
      inReview: "Submitted",
      rework: "Rework",
      closed: "Approved",
    },
    recent: {
      title: "Recent Jobs",
      viewAll: "View All",
      empty: "No service jobs yet",
      latest: "Latest Jobs",
      jobNo: "Job No.",
      customer: "Customer",
      owner: "Owner",
      date: "Date",
      status: "Status",
      unassigned: "Unassigned",
    },
    system: {
      title: "System Health",
      secure: "Security headers",
      database: "Database",
      activeUsers: "Active users",
      imports: "SAP imports",
      online: "Ready",
      protected: "Protected",
      managed: "Managed",
    },
    readiness: {
      title: "Go-live Readiness",
      ready: "Ready",
      attention: "Needs attention",
      customers: "Customer master data",
      customersReady: "Customer records are available for service reports.",
      customersMissing: "Import SAP Business Partners before opening jobs.",
      inventory: "Inventory / serial master",
      inventoryReady: "Inventory suggestions are available for technicians.",
      inventoryMissing: "Import SAP inventory CSV before using equipment lookup.",
      users: "Active user accounts",
      usersReady: "Active accounts can access the system.",
      usersMissing: "Create at least one active user account.",
      reviewQueue: "Admin review queue",
      reviewReady: "No submitted reports are waiting for review.",
      reviewPending: "Submitted reports are waiting for admin review.",
      reworkQueue: "Returned work queue",
      reworkReady: "No reports are waiting for technician revision.",
      reworkPending: "Reports were sent back and need revision.",
    },
    status: {
      Draft: "Draft",
      Open: "Open",
      Assigned: "Assigned",
      In_Progress: "In Progress",
      On_Site: "On Site",
      Pending_Customer: "Pending Customer",
      Submitted: "Submitted",
      Need_Revision: "Active",
      Completed: "Approved",
      Approved: "Approved",
      Closed: "Approved",
      Cancelled: "Cancelled",
      Unknown: "Unknown",
    },
    inventoryImport: {
      title: "Update Inventory from CSV",
      subtitle:
        "Upload the latest SAP CSV to refresh model and serial number suggestions.",
      file: "Inventory CSV",
      button: "Import inventory",
      pending: "Importing inventory...",
      hint: "Supports item/model/description/serial columns from SAP Inventory Aging Report.",
      missing: "Please choose an inventory CSV file.",
      size: "Inventory CSV is too large.",
      imported: "Rows",
      created: "Created serials",
      updated: "Updated serials",
      deactivated: "Hidden from latest SAP",
      skipped: "Skipped rows",
      modeMerge: "Add / update only",
      modeMergeHelp: "Keep old serials visible even if they are not in this file.",
      modeSync: "Sync with latest SAP",
      modeSyncHelp: "Hide serials that are not found in the uploaded SAP file.",
    },
    customerImport: {
      title: "Update Customers from CSV",
      subtitle: "Upload SAP Business Partners CSV to refresh customer master data.",
      file: "Business Partners CSV",
      button: "Import customers",
      pending: "Importing customers...",
      hint: "Supported columns: BP Code, BP Name, Account Balance.",
      missing: "Please choose a Business Partners CSV file.",
      size: "Business Partners CSV is too large.",
      created: "Created customers",
      updated: "Updated customers",
      skipped: "Skipped rows",
    },
  },
  th: {
    search: "ค้นหาใบงาน ลูกค้า หรือ Serial...",
    admin: "แอดมิน",
    title: "แดชบอร์ดควบคุมระบบ",
    subtitle: "ภาพรวมใบเซอร์วิส การนำเข้า SAP คิวรอตรวจ และสุขภาพระบบแบบสด",
    newJob: "สร้างใบเซอร์วิส",
    logout: "ออกจากระบบ",
    logo: "e service",
    nav: {
      dashboard: "แดชบอร์ด",
      serviceReports: "ใบเซอร์วิส",
      customers: "ลูกค้า",
      inventory: "อุปกรณ์",
      qrCode: "สร้าง QR Code",
      systemAdmin: "ระบบ",
      users: "ผู้ใช้",
    },
    kpi: {
      totalJobs: "Total Job",
      customers: "ลูกค้า",
      users: "ผู้ใช้",
      equipment: "Serial ทั้งหมด",
    },
    charts: {
      jobsByMonth: "ใบงาน 6 เดือนล่าสุด",
      statusMix: "สัดส่วนสถานะงาน",
      open: "Active",
      inProgress: "In Progress Jobs",
      inReview: "Submitted",
      rework: "ส่งกลับแก้",
      closed: "Approved",
    },
    recent: {
      title: "งานล่าสุด",
      viewAll: "ดูทั้งหมด",
      empty: "ยังไม่มีใบเซอร์วิส",
      latest: "ใบเซอร์วิสล่าสุด",
      jobNo: "เลขงาน",
      customer: "ลูกค้า",
      owner: "ผู้รับผิดชอบ",
      date: "วันที่",
      status: "สถานะ",
      unassigned: "ยังไม่ระบุ",
    },
    system: {
      title: "สุขภาพระบบ",
      secure: "Security headers",
      database: "ฐานข้อมูล",
      activeUsers: "ผู้ใช้ที่เปิดใช้งาน",
      imports: "นำเข้า SAP",
      online: "พร้อมใช้งาน",
      protected: "ป้องกันแล้ว",
      managed: "จัดการแล้ว",
    },
    readiness: {
      title: "ความพร้อมก่อนใช้งานจริง",
      ready: "พร้อม",
      attention: "ควรตรวจ",
      customers: "ข้อมูลลูกค้า",
      customersReady: "มีข้อมูลลูกค้าสำหรับเปิดใบเซอร์วิสแล้ว",
      customersMissing: "ควรนำเข้า SAP Business Partners ก่อนเปิดงาน",
      inventory: "ข้อมูลอุปกรณ์ / Serial",
      inventoryReady: "มีข้อมูลอุปกรณ์ให้ช่างค้นหาในใบงานแล้ว",
      inventoryMissing: "ควรนำเข้า SAP Inventory CSV ก่อนใช้งานค้นหาอุปกรณ์",
      users: "บัญชีผู้ใช้ที่เปิดใช้งาน",
      usersReady: "มีบัญชีที่สามารถเข้าใช้งานระบบได้",
      usersMissing: "ควรสร้างผู้ใช้งานที่ active อย่างน้อย 1 คน",
      reviewQueue: "คิวรอแอดมินตรวจ",
      reviewReady: "ไม่มีใบงานที่รอตรวจ",
      reviewPending: "มีใบงานที่ user ส่งมาและรอแอดมินตรวจ",
      reworkQueue: "คิวงานที่ส่งกลับแก้",
      reworkReady: "ไม่มีใบงานที่รอช่างแก้ไข",
      reworkPending: "มีใบงานที่ถูกส่งกลับและต้องแก้ไข",
    },
    status: {
      Draft: "แบบร่าง",
      Open: "เปิดงาน",
      Assigned: "มอบหมายแล้ว",
      In_Progress: "กำลังทำ",
      On_Site: "ถึงหน้างาน",
      Pending_Customer: "รอลูกค้า",
      Submitted: "Submitted",
      Need_Revision: "Active",
      Completed: "Approved",
      Approved: "ตรวจแล้ว",
      Closed: "Approved",
      Cancelled: "ยกเลิก",
      Unknown: "ไม่ทราบ",
    },
    inventoryImport: {
      title: "อัปเดตอุปกรณ์จาก CSV",
      subtitle:
        "อัปโหลดไฟล์ SAP ล่าสุดเพื่อใช้เป็นข้อมูล Model และ Serial ในใบเซอร์วิส",
      file: "ไฟล์ Inventory CSV",
      button: "นำเข้าอุปกรณ์",
      pending: "กำลังนำเข้าอุปกรณ์...",
      hint: "รองรับคอลัมน์ item/model/description/serial จาก SAP Inventory Aging Report",
      missing: "กรุณาเลือกไฟล์ Inventory CSV",
      size: "ไฟล์ Inventory CSV ใหญ่เกินไป",
      imported: "จำนวนแถว",
      created: "Serial ใหม่",
      updated: "Serial ที่อัปเดต",
      skipped: "แถวที่ข้าม",
    },
    customerImport: {
      title: "อัปเดตลูกค้าจาก CSV",
      subtitle: "อัปโหลดไฟล์ SAP Business Partners เพื่ออัปเดตข้อมูลลูกค้า",
      file: "ไฟล์ Business Partners CSV",
      button: "นำเข้าลูกค้า",
      pending: "กำลังนำเข้าลูกค้า...",
      hint: "รองรับคอลัมน์ BP Code, BP Name, Account Balance",
      missing: "กรุณาเลือกไฟล์ Business Partners CSV",
      size: "ไฟล์ Business Partners CSV ใหญ่เกินไป",
      created: "ลูกค้าใหม่",
      updated: "ลูกค้าที่อัปเดต",
      skipped: "แถวที่ข้าม",
    },
  },
} satisfies Record<Locale, object>;

const thaiCopy = {
  search: "ค้นหาใบงาน ลูกค้า หรือ Serial...",
  admin: "แอดมิน",
  title: "แดชบอร์ดควบคุมระบบ",
  subtitle: "ภาพรวมใบเซอร์วิซ การนำเข้า SAP คิวรอตรวจ และสุขภาพระบบแบบสด",
  newJob: "สร้างใบเซอร์วิซ",
  logout: "ออกจากระบบ",
  logo: "e service",
  nav: {
    dashboard: "แดชบอร์ด",
    serviceReports: "ใบเซอร์วิซ",
    customers: "ลูกค้า",
    inventory: "อุปกรณ์",
    qrCode: "สร้าง QR Code",
    systemAdmin: "ระบบ",
    users: "ผู้ใช้",
  },
  kpi: {
    totalJobs: "Total Job",
    customers: "ลูกค้า",
    users: "ผู้ใช้",
    equipment: "Serial ทั้งหมด",
  },
  charts: {
    jobsByMonth: "ใบงาน 6 เดือนล่าสุด",
    statusMix: "สัดส่วนสถานะงาน",
    open: "Active",
    inProgress: "In Progress Jobs",
    inReview: "Submitted",
    rework: "ส่งกลับแก้",
    closed: "Approved",
  },
  recent: {
    title: "งานล่าสุด",
    viewAll: "ดูทั้งหมด",
    empty: "ยังไม่มีใบเซอร์วิซ",
    latest: "ใบเซอร์วิซล่าสุด",
    jobNo: "เลขงาน",
    customer: "ลูกค้า",
    owner: "ผู้รับผิดชอบ",
    date: "วันที่",
    status: "สถานะ",
    unassigned: "ยังไม่ระบุ",
  },
  system: {
    title: "สุขภาพระบบ",
    secure: "Security headers",
    database: "ฐานข้อมูล",
    activeUsers: "ผู้ใช้ที่เปิดใช้งาน",
    imports: "นำเข้า SAP",
    online: "พร้อมใช้งาน",
    protected: "ป้องกันแล้ว",
    managed: "จัดการแล้ว",
  },
  readiness: {
    title: "ความพร้อมก่อนใช้งานจริง",
    ready: "พร้อม",
    attention: "ควรตรวจ",
    customers: "ข้อมูลลูกค้า",
    customersReady: "มีข้อมูลลูกค้าสำหรับเปิดใบเซอร์วิซแล้ว",
    customersMissing: "ควรนำเข้า SAP Business Partners ก่อนเปิดงาน",
    inventory: "ข้อมูลอุปกรณ์ / Serial",
    inventoryReady: "มีข้อมูลอุปกรณ์ให้ช่างค้นหาในใบงานแล้ว",
    inventoryMissing: "ควรนำเข้า SAP Inventory CSV ก่อนใช้ค้นหาอุปกรณ์",
    users: "บัญชีผู้ใช้ที่เปิดใช้งาน",
    usersReady: "มีบัญชีที่สามารถเข้าใช้งานระบบได้",
    usersMissing: "ควรสร้างผู้ใช้งานที่ active อย่างน้อย 1 คน",
    reviewQueue: "คิวรอแอดมินตรวจ",
    reviewReady: "ไม่มีใบงานที่รอตรวจ",
    reviewPending: "มีใบงานที่ user ส่งมาและรอแอดมินตรวจ",
    reworkQueue: "คิวงานที่ส่งกลับแก้",
    reworkReady: "ไม่มีใบงานที่รอช่างแก้ไข",
    reworkPending: "มีใบงานที่ถูกส่งกลับและต้องแก้ไข",
  },
  status: {
    Draft: "แบบร่าง",
    Open: "เปิดงาน",
    Assigned: "มอบหมายแล้ว",
    In_Progress: "กำลังทำ",
    On_Site: "ถึงหน้างาน",
    Pending_Customer: "รอลูกค้า",
    Submitted: "Submitted",
    Need_Revision: "Active",
    Completed: "Approved",
    Approved: "ตรวจแล้ว",
    Closed: "Approved",
    Cancelled: "ยกเลิก",
    Unknown: "ไม่ทราบ",
  },
  inventoryImport: {
    title: "อัปเดตอุปกรณ์จาก CSV",
    subtitle: "อัปโหลดไฟล์ SAP ล่าสุดเพื่อใช้เป็นข้อมูล Model และ Serial ในใบเซอร์วิซ",
    file: "ไฟล์ Inventory CSV",
    button: "นำเข้าอุปกรณ์",
    pending: "กำลังนำเข้าอุปกรณ์...",
    hint: "รองรับคอลัมน์ item/model/description/serial จาก SAP Inventory Aging Report",
    missing: "กรุณาเลือกไฟล์ Inventory CSV",
    size: "ไฟล์ Inventory CSV ใหญ่เกินไป",
    imported: "จำนวนแถว",
    created: "Serial ใหม่",
    updated: "Serial ที่อัปเดต",
    deactivated: "ซ่อนจาก SAP ล่าสุด",
    skipped: "แถวที่ข้าม",
    modeMerge: "เพิ่ม/อัปเดตเท่านั้น",
    modeMergeHelp: "เก็บ Serial เก่าไว้เหมือนเดิม แม้ไฟล์รอบนี้ไม่มีรายการนั้น",
    modeSync: "Sync ตาม SAP ล่าสุด",
    modeSyncHelp: "ซ่อน Serial ที่ไม่พบในไฟล์ SAP ที่อัปโหลดรอบนี้",
  },
  customerImport: {
    title: "อัปเดตลูกค้าจาก CSV",
    subtitle: "อัปโหลดไฟล์ SAP Business Partners เพื่ออัปเดตข้อมูลลูกค้า",
    file: "ไฟล์ Business Partners CSV",
    button: "นำเข้าลูกค้า",
    pending: "กำลังนำเข้าลูกค้า...",
    hint: "รองรับคอลัมน์ BP Code, BP Name, Account Balance",
    missing: "กรุณาเลือกไฟล์ Business Partners CSV",
    size: "ไฟล์ Business Partners CSV ใหญ่เกินไป",
    created: "ลูกค้าใหม่",
    updated: "ลูกค้าที่อัปเดต",
    skipped: "แถวที่ข้าม",
  },
} as typeof copy.en;

const navKeys = [
  ["dashboard", "/dashboard", Home],
  ["serviceReports", "/reports", ClipboardList],
  ["customers", "/customers", Building2],
  ["inventory", "/inventory", Boxes],
  ["qrCode", "/dashboard/qr-code", QrCode],
  ["systemAdmin", "/dashboard/system", Settings],
  ["users", "/users", Users],
] as const;

const statusTone = (status: ServiceReportStatus | null) => {
  switch (status) {
    case "On_Site":
    case "In_Progress":
    case "Assigned":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-800";
    case "Pending_Customer":
    case "Submitted":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800";
    case "Need_Revision":
    case "Cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-800";
    case "Completed":
    case "Approved":
    case "Closed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";
  }
};

const statusText = (
  status: ServiceReportStatus | null,
  labels: (typeof copy)[Locale]["status"],
) => (status ? labels[status] : labels.Unknown);

const formatShortDate = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "short",
    day: "2-digit",
  }).format(date);

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const percent = (part: number, total: number) =>
  total === 0 ? 0 : Math.round((part / total) * 100);

interface DashboardPageProps {
  searchParams: RouteSearchParams;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const t = locale === "th" ? thaiCopy : copy.en;
  const user = await requireUser(locale);

  if (isOwnerUser(user)) {
    redirect(withLocale("/owner", locale));
  }

  await requireFeature({ key: "dashboard", user, locale });

  if (user.roles.role_name !== "admin") {
    redirect(withLocale("/reports", locale));
  }

  const [qrCodeEnabled, systemAdminEnabled] = await Promise.all([
    isFeatureEnabled("qr_code"),
    isFeatureEnabled("system_admin"),
  ]);

  const inventorySyncLabels =
    locale === "th"
      ? {
          deactivated: "ซ่อนจาก SAP ล่าสุด",
          modeMerge: "เพิ่ม/อัปเดตเท่านั้น",
          modeMergeHelp: "เก็บ Serial เก่าไว้เหมือนเดิม แม้ไฟล์รอบนี้ไม่มีรายการนั้น",
          modeSync: "Sync ตาม SAP ล่าสุด",
          modeSyncHelp: "ซ่อน Serial ที่ไม่พบในไฟล์ SAP ที่อัปโหลดรอบนี้",
        }
      : {
          deactivated: "Hidden from latest SAP",
          modeMerge: "Add / update only",
          modeMergeHelp: "Keep old serials visible even if they are not in this file.",
          modeSync: "Sync with latest SAP",
          modeSyncHelp: "Hide serials that are not found in the uploaded SAP file.",
        };
  const cleanInventorySyncLabels = {
    deactivated: t.inventoryImport.deactivated,
    modeMerge: t.inventoryImport.modeMerge,
    modeMergeHelp: t.inventoryImport.modeMergeHelp,
    modeSync: t.inventoryImport.modeSync,
    modeSyncHelp: t.inventoryImport.modeSyncHelp,
  };
  void inventorySyncLabels;
  void cleanInventorySyncLabels;

  const now = new Date();
  const readRangeNumber = (key: string, fallback: number) => {
    const rawValue = Array.isArray(params[key]) ? params[key]?.[0] : params[key];
    const value = Number(rawValue);

    return Number.isInteger(value) ? value : fallback;
  };
  const legacyYear = readRangeNumber("year", now.getFullYear());
  const legacyMonth = readRangeNumber("month", now.getMonth() + 1);
  const rawFromYear = readRangeNumber("fromYear", legacyYear);
  const rawFromMonth = readRangeNumber("fromMonth", legacyMonth);
  const rawToYear = readRangeNumber("toYear", legacyYear);
  const rawToMonth = readRangeNumber("toMonth", legacyMonth);
  const selectedFromYear =
    rawFromYear >= 2000 && rawFromYear <= 2100 ? rawFromYear : now.getFullYear();
  const selectedFromMonth =
    rawFromMonth >= 1 && rawFromMonth <= 12 ? rawFromMonth : now.getMonth() + 1;
  const selectedToYear =
    rawToYear >= 2000 && rawToYear <= 2100 ? rawToYear : selectedFromYear;
  const selectedToMonth =
    rawToMonth >= 1 && rawToMonth <= 12 ? rawToMonth : selectedFromMonth;
  const rawRangeStart = new Date(selectedFromYear, selectedFromMonth - 1, 1);
  const rawRangeEnd = new Date(selectedToYear, selectedToMonth, 1);
  const selectedRangeStart =
    rawRangeStart <= rawRangeEnd ? rawRangeStart : new Date(selectedToYear, selectedToMonth - 1, 1);
  const selectedRangeEnd =
    rawRangeStart <= rawRangeEnd ? rawRangeEnd : new Date(selectedFromYear, selectedFromMonth, 1);
  const selectedRangeLabel = `${new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    { dateStyle: "medium" },
  ).format(selectedRangeStart)} - ${new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    { dateStyle: "medium" },
  ).format(new Date(selectedRangeEnd.getTime() - 1))}`;
  const yearOptions = Array.from({ length: 8 }, (_, index) => now.getFullYear() - index + 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalReports,
    totalCustomers,
    totalUsers,
    totalEquipment,
    openReports,
    inProgressReports,
    submittedReports,
    completedReports,
    recentReports,
    monthlyReports,
    notifications,
  ] = await Promise.all([
    prisma.service_reports.count({
      where: {
        created_at: {
          gte: selectedRangeStart,
          lt: selectedRangeEnd,
        },
      },
    }),
    prisma.customers.count(),
    prisma.users.count(),
    prisma.inventory.count({
      where: {
        sap_is_active: {
          not: false,
        },
      },
    }),
    prisma.service_reports.count({
      where: { status: { in: ["Draft", "Open", "Need_Revision"] } },
    }),
    prisma.service_reports.count({
      where: {
        status: {
          in: ["Assigned", "In_Progress", "On_Site", "Pending_Customer"],
        },
      },
    }),
    prisma.service_reports.count({ where: { status: "Submitted" } }),
    prisma.service_reports.count({
      where: { status: { in: ["Completed", "Approved", "Closed"] } },
    }),
    prisma.service_reports.findMany({
      take: 6,
      select: {
        report_id: true,
        job_number: true,
        status: true,
        created_at: true,
        customers: {
          select: {
            company_name: true,
          },
        },
        engineers: {
          select: {
            first_name: true,
            last_name: true,
            employee_id: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.service_reports.findMany({
      select: { created_at: true },
      where: { created_at: { gte: sixMonthsAgo } },
    }),
    prisma.notifications.findMany({
      where: {
        user_id: user.user_id,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 6,
    }),
  ]);

  const monthlyCounts = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = monthKey(date);

    return {
      label: new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
        month: "short",
      }).format(date),
      count: monthlyReports.filter((report) => monthKey(report.created_at) === key)
        .length,
    };
  });
  const statusData = [
    [t.charts.inProgress, openReports + inProgressReports, "#2563eb"],
    [t.charts.inReview, submittedReports, "#f59e0b"],
    [t.charts.closed, completedReports, "#16a34a"],
  ] as const;
  const donePercent = percent(completedReports, totalReports);

  const kpis = [
    [totalReports, t.kpi.totalJobs, ClipboardList, "text-blue-700 bg-blue-50 dark:text-blue-200 dark:bg-blue-950/60"],
    [totalCustomers, t.kpi.customers, Building2, "text-emerald-700 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/60"],
    [totalUsers, t.kpi.users, Users, "text-violet-700 bg-violet-50 dark:text-violet-200 dark:bg-violet-950/60"],
    [totalEquipment, t.kpi.equipment, Boxes, "text-orange-700 bg-orange-50 dark:text-orange-200 dark:bg-orange-950/60"],
  ] as const;
  const dashboardNavItems = navKeys.filter(([key]) => {
    if (key === "qrCode") return qrCodeEnabled;
    if (key === "systemAdmin") return systemAdminEnabled;
    return true;
  });

  return (
    <main className="animate-page min-h-screen bg-[#f3f6fb] pb-24 text-slate-950 dark:bg-slate-950 dark:text-slate-100 md:pb-0">
      <div className="grid md:grid-cols-[220px_1fr]">
        <aside className="animate-panel sticky top-0 hidden h-screen self-start overflow-y-auto bg-[#071e49] text-white dark:bg-black md:block">
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
            <BrandLogo size={36} priority />
            <span className="text-sm font-bold uppercase tracking-wide">
              {t.logo}
            </span>
          </div>

          <nav className="space-y-1 px-3 py-4">
            {dashboardNavItems.map(([key, href, Icon]) => (
              <Link
                key={`${key}-${href}`}
                href={withLocale(href, locale)}
                className={`interactive-button flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                  href === "/dashboard"
                    ? "bg-[#0d6efd] text-white shadow-sm"
                    : "text-blue-100 hover:bg-white/10"
                }`}
              >
                <Icon size={16} />
                {t.nav[key]}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="animate-panel relative z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <BrandLogo size={36} priority />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitcher locale={locale} pathname="/dashboard" />
              <ThemeToggle />
              <NotificationBell locale={locale} notifications={notifications} />
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
            <section className="animate-panel overflow-hidden rounded-2xl border border-blue-100 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900">
                    <Sparkles size={14} />
                    {t.logo}
                  </div>
                  <h1 className="mt-4 text-2xl font-bold tracking-normal sm:text-3xl">
                    {t.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                    {t.subtitle}
                  </p>
                </div>
                <Link
                  href={withLocale("/reports/create", locale)}
                  className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-500"
                >
                  <Wrench size={16} />
                  {t.newJob}
                </Link>
              </div>
            </section>

            <section className="animate-panel rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <form className="grid gap-5 xl:grid-cols-[minmax(190px,0.55fr)_minmax(0,2fr)] xl:items-end">
                <input type="hidden" name="lang" value={locale} />
                <div className="self-center">
                  <p className="text-sm font-bold">
                    {locale === "th" ? "ตัวกรอง Total Job" : "Total Job filter"}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                    {selectedRangeLabel}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(110px,0.75fr)_minmax(150px,1fr)_minmax(110px,0.75fr)_minmax(150px,1fr)_auto] lg:items-end">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">
                      {locale === "th" ? "ปีเริ่ม" : "From year"}
                    </span>
                    <select
                      name="fromYear"
                      defaultValue={selectedFromYear}
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950 dark:focus:ring-blue-950"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">
                      {locale === "th" ? "เดือนเริ่ม" : "From month"}
                    </span>
                    <select
                      name="fromMonth"
                      defaultValue={selectedFromMonth}
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950 dark:focus:ring-blue-950"
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                        <option key={month} value={month}>
                          {new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
                            month: "long",
                          }).format(new Date(selectedFromYear, month - 1, 1))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">
                      {locale === "th" ? "ปีสิ้นสุด" : "To year"}
                    </span>
                    <select
                      name="toYear"
                      defaultValue={selectedToYear}
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950 dark:focus:ring-blue-950"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500">
                      {locale === "th" ? "เดือนสิ้นสุด" : "To month"}
                    </span>
                    <select
                      name="toMonth"
                      defaultValue={selectedToMonth}
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-950 dark:focus:ring-blue-950"
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                        <option key={month} value={month}>
                          {new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
                            month: "long",
                          }).format(new Date(selectedToYear, month - 1, 1))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="interactive-button inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(29,78,216,0.22)] transition hover:bg-blue-800 sm:col-span-2 lg:col-span-1"
                  >
                    {locale === "th" ? "ใช้ตัวกรอง" : "Apply"}
                  </button>
                </div>
              </form>
            </section>

            <section className="stagger-list grid auto-rows-[minmax(116px,auto)] gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {kpis.map(([value, label, Icon, tone], index) => (
                <div
                  key={label}
                  className={`interactive-card rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_10px_28px_rgba(0,0,0,0.2)] ${
                    index === 0
                      ? "sm:col-span-2 xl:col-span-2 xl:p-6"
                      : ""
                  }`}
                >
                  <div
                    className={`flex h-full gap-4 ${
                      index === 0
                        ? "items-center justify-between"
                        : "items-center"
                    }`}
                  >
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.06] ${tone} ${
                        index === 0 ? "h-13 w-13" : "h-12 w-12"
                      }`}
                    >
                      <Icon size={index === 0 ? 25 : 22} strokeWidth={1.8} />
                    </div>
                    <div className={index === 0 ? "text-right" : "min-w-0"}>
                      <p
                        className={`font-bold tabular-nums text-slate-950 dark:text-white ${
                          index === 0 ? "text-3xl" : "text-2xl"
                        }`}
                      >
                        {value}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {label}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="grid items-start gap-5 2xl:grid-cols-[1fr_360px]">
              <DashboardAnalytics
                monthlyCounts={monthlyCounts}
                statusData={statusData.map(([label, value, color]) => ({
                  label,
                  value,
                  color,
                }))}
                donePercent={donePercent}
                labels={{
                  jobsByMonth: t.charts.jobsByMonth,
                  statusMix: t.charts.statusMix,
                  pipeline:
                    locale === "th" ? "คิวงานตามสถานะ" : "Work pipeline",
                  completedRate:
                    locale === "th" ? "อัตรางานสำเร็จ" : "Completed rate",
                }}
              />

              <NotificationInbox
                compact
                locale={locale}
                notifications={notifications}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <h2 className="text-sm font-bold">{t.recent.title}</h2>
                  <Link
                    href={withLocale("/reports", locale)}
                    className="interactive-button text-xs font-bold text-[#0d6efd] dark:text-blue-300"
                  >
                    {t.recent.viewAll}
                  </Link>
                </div>

                <div className="stagger-list divide-y divide-slate-100 dark:divide-slate-800">
                  {recentReports.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      {t.recent.empty}
                    </div>
                  ) : (
                    recentReports.map((report) => (
                      <Link
                        key={report.report_id}
                        href={withLocale(`/reports/${report.report_id}`, locale)}
                        className="table-row-motion flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">
                            {report.job_number}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {report.customers.company_name}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ring-1 ${statusTone(
                            report.status,
                          )}`}
                        >
                          {statusText(report.status, t.status)}
                        </span>
                        <ChevronRight size={15} className="text-slate-400" />
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <h2 className="text-sm font-bold">{t.recent.latest}</h2>
                  <LifeBuoy size={17} className="text-[#0d6efd] dark:text-blue-300" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-5 py-3">{t.recent.jobNo}</th>
                        <th className="px-5 py-3">{t.recent.customer}</th>
                        <th className="px-5 py-3">{t.recent.owner}</th>
                        <th className="px-5 py-3">{t.recent.date}</th>
                        <th className="px-5 py-3">{t.recent.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recentReports.map((report) => {
                        const ownerName =
                          [report.engineers.first_name, report.engineers.last_name]
                            .filter(Boolean)
                            .join(" ") ||
                          report.engineers.employee_id ||
                          t.recent.unassigned;

                        return (
                          <tr key={report.report_id} className="table-row-motion text-sm">
                            <td className="px-5 py-4 font-bold">
                              {report.job_number}
                            </td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                              {report.customers.company_name}
                            </td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                              {ownerName}
                            </td>
                            <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                              {formatShortDate(report.created_at, locale)}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(
                                  report.status,
                                )}`}
                              >
                                {statusText(report.status, t.status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
      <MobileBottomNav
        locale={locale}
        active="dashboard"
        showQr={qrCodeEnabled}
      />
    </main>
  );
}
