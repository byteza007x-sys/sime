import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FilePlus2,
  FileText,
  LogOut,
  MapPin,
  PenLine,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import BrandLogo from "@/components/brand-logo";
import LanguageSwitcher from "@/components/language-switcher";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import NotificationInbox from "@/components/notification-inbox";
import ThemeToggle from "@/components/theme-toggle";
import { logoutAction } from "@/app/login/actions";
import type { service_reports_status } from "@/generated/prisma/enums";
import type * as Prisma from "@/generated/prisma/internal/prismaNamespace";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { assignServiceReportAction } from "@/app/reports/[reportId]/actions";
import { updateTechnicianReportPriorityAction } from "./actions";

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

type StatusFilter = "Action" | "Review" | "Done" | "All";
type RoleName = "admin" | "support" | "user" | string;

const actionStatuses = [
  "Draft",
  "Open",
  "Assigned",
  "In_Progress",
  "On_Site",
  "Pending_Customer",
  "Need_Revision",
] satisfies ServiceReportStatus[];
const reviewStatuses = ["Submitted"] satisfies ServiceReportStatus[];
const doneStatuses = [
  "Completed",
  "Approved",
  "Closed",
  "Cancelled",
] satisfies ServiceReportStatus[];
const supportHiddenStatuses = [
  "Completed",
  "Approved",
  "Closed",
  "Cancelled",
] satisfies ServiceReportStatus[];
const lockedForUserStatuses = new Set<ServiceReportStatus>([
  "Submitted",
  "Completed",
  "Approved",
  "Closed",
  "Cancelled",
]);
const actionStatusSet = new Set<ServiceReportStatus>(actionStatuses);
const doneStatusSet = new Set<ServiceReportStatus>(doneStatuses);
const roleFilters = (roleName: RoleName) => {
  if (roleName === "admin") return ["All", "Action", "Review", "Done"] as const;
  if (roleName === "support") return ["All", "Action", "Review"] as const;

  return ["Action", "Review"] as const;
};

const copy = {
  en: {
    title: "My Service Work",
    subtitle: "Create service reports, continue field forms, and follow admin review.",
    backDashboard: "Dashboard",
    create: "Create service report",
    allReports: "All reports",
    controls: "Language and display",
    signedIn: "Signed in",
    username: "Username",
    role: "Role",
    online: "Online",
    logout: "Logout",
    search: "Search job, customer, site, serial...",
    searchButton: "Search",
    clear: "Clear",
    today: "Today",
    needAction: "Backlog",
    waitingReview: "Submitted",
    completed: "Approved",
    total: "My reports",
    queuePriority: "Queue priority",
    savePriority: "Save priority",
    transferTitle: "Transfer job",
    transferUser: "Send to",
    transferNote: "Note",
    transferNotePlaceholder: "Why is this job being transferred?",
    transferSubmit: "Send job",
    transferLocked: "Submitted or approved jobs cannot be transferred.",
    nextTitle: "Next job to handle",
    nextEmpty: "No urgent work right now.",
    nextEmptyDetail: "Create a new service report or wait for admin review feedback.",
    filters: {
      Action: "Need action",
      Review: "Submitted",
      Done: "Approved",
      All: "All",
    },
    sectionTitle: "Work queue",
    sectionHint: "Sorted by jobs that need action first, then newest updates.",
    jobNo: "Job No.",
    customer: "Customer",
    site: "Site",
    date: "Date",
    status: "Status",
    serviceType: "Service type",
    priority: "Priority",
    evidence: "Records",
    photos: "photos",
    signatures: "signatures",
    locations: "locations",
    openWork: "Write service form",
    viewForm: "View service form",
    detail: "Detail",
    noSite: "No site",
    noDate: "No date",
    noReports: "No service work found",
    noReportsDetail: "Try clearing search filters or create a new service report.",
    adminMode: "Admin mode",
    userMode: "User mode",
    statusLabels: {
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
  },
  th: {
    title: "งานเซอร์วิสของฉัน",
    subtitle: "สร้างใบเซอร์วิส เขียนฟอร์มหน้างาน และติดตามสถานะตรวจงานในหน้าเดียว",
    backDashboard: "แดชบอร์ด",
    create: "สร้างใบเซอร์วิส",
    allReports: "ใบเซอร์วิสทั้งหมด",
    controls: "ภาษาและการแสดงผล",
    search: "ค้นหาเลขงาน ลูกค้า ไซต์ หรือ serial...",
    searchButton: "ค้นหา",
    clear: "ล้าง",
    today: "วันนี้",
    needAction: "ต้องทำต่อ",
    waitingReview: "Submitted",
    completed: "Approved",
    total: "ใบงานของฉัน",
    nextTitle: "งานถัดไปที่ควรทำ",
    nextEmpty: "ตอนนี้ยังไม่มีงานเร่งด่วน",
    nextEmptyDetail: "สร้างใบเซอร์วิสใหม่ หรือรอผลตรวจจากแอดมินได้เลย",
    filters: {
      Action: "ต้องทำต่อ",
      Review: "Submitted",
      Done: "Approved",
      All: "ทั้งหมด",
    },
    sectionTitle: "คิวงาน",
    sectionHint: "เรียงงานที่ต้องทำก่อน แล้วตามด้วยงานที่อัปเดตล่าสุด",
    jobNo: "เลขที่งาน",
    customer: "ลูกค้า",
    site: "ไซต์",
    date: "วันที่",
    status: "สถานะ",
    serviceType: "ประเภทงาน",
    priority: "ความสำคัญ",
    evidence: "รายการบันทึก",
    photos: "รูป",
    signatures: "ลายเซ็น",
    locations: "ตำแหน่ง",
    openWork: "เขียนใบเซอร์วิส",
    viewForm: "ดูใบเซอร์วิส",
    detail: "รายละเอียด",
    noSite: "ยังไม่ระบุไซต์",
    noDate: "ยังไม่ระบุวันที่",
    noReports: "ยังไม่มีงานเซอร์วิส",
    noReportsDetail: "ลองล้างตัวกรอง หรือกดสร้างใบเซอร์วิสใหม่ได้เลย",
    adminMode: "โหมดแอดมิน",
    userMode: "โหมดผู้ใช้",
    statusLabels: {
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
      Unknown: "ไม่ทราบสถานะ",
    },
  },
} satisfies Record<Locale, object>;

const technicianThaiCopy = {
  ...copy.en,
  title: "งานเซอร์วิซของฉัน",
  subtitle: "สร้างใบเซอร์วิซ เขียนงานหน้างาน และติดตามงานที่ส่งตรวจในหน้าเดียว",
  backDashboard: "แดชบอร์ด",
  create: "สร้างใบเซอร์วิซ",
  allReports: "ดูทั้งหมด",
  controls: "ภาษาและการแสดงผล",
  search: "ค้นหาเลขงาน ลูกค้า ไซต์ หรือ serial...",
  searchButton: "ค้นหา",
  clear: "ล้าง",
  needAction: "งานค้าง",
  waitingReview: "Submitted",
  completed: "Approved",
  total: "ทั้งหมด",
  queuePriority: "จัดความสำคัญคิว",
  savePriority: "บันทึก",
  transferTitle: "ส่งต่องาน",
  transferUser: "ส่งให้",
  transferNote: "หมายเหตุ",
  transferNotePlaceholder: "ระบุเหตุผลหรือรายละเอียดงานที่ส่งต่อ",
  transferSubmit: "ส่งต่องาน",
  transferLocked: "งานที่ส่งตรวจหรืออนุมัติแล้วส่งต่อไม่ได้",
  nextTitle: "งานที่ควรทำต่อ",
  nextEmpty: "ตอนนี้ยังไม่มีงานค้าง",
  nextEmptyDetail: "สร้างใบเซอร์วิซใหม่ หรือรอผลตรวจจากแอดมินได้เลย",
  filters: {
    Action: "งานค้าง",
    Review: "Submitted",
    Done: "Approved",
    All: "ทั้งหมด",
  },
  sectionTitle: "คิวงานของฉัน",
  sectionHint: "เรียงงานค้างก่อน และจัดความสำคัญคิวได้จากการ์ดงานแต่ละใบ",
  jobNo: "เลขงาน",
  customer: "ลูกค้า",
  site: "ไซต์",
  date: "วันที่",
  status: "สถานะ",
  serviceType: "ประเภทงาน",
  priority: "ความสำคัญ",
  evidence: "รายการบันทึก",
  photos: "รูป",
  signatures: "ลายเซ็น",
  locations: "ตำแหน่ง",
  openWork: "เขียนใบเซอร์วิซ",
  viewForm: "ดูใบเซอร์วิซ",
  detail: "ดูรายละเอียด",
  noSite: "ยังไม่ระบุไซต์",
  noDate: "ยังไม่ระบุวันที่",
  noReports: "ยังไม่มีงานเซอร์วิซ",
  noReportsDetail: "ลองล้างตัวกรอง หรือกดสร้างใบเซอร์วิซใหม่ได้เลย",
  adminMode: "โหมดแอดมิน",
  userMode: "โหมดผู้ใช้",
  statusLabels: {
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
    Unknown: "ไม่ทราบสถานะ",
  },
} satisfies typeof copy.en;

const profileCopy = {
  en: {
    signedIn: "Signed in",
    username: "Username",
    role: "Role",
    online: "Online",
    logout: "Logout",
    admin: "Admin",
    support: "Support",
    user: "User",
  },
  th: {
    signedIn: "เข้าสู่ระบบแล้ว",
    username: "ชื่อผู้ใช้",
    role: "สิทธิ์",
    online: "พร้อมใช้งาน",
    logout: "ออกจากระบบ",
    admin: "แอดมิน",
    support: "Support",
    user: "ผู้ใช้",
  },
} satisfies Record<Locale, Record<string, string>>;

const technicianThaiProfileCopy = {
  signedIn: "เข้าสู่ระบบแล้ว",
  username: "ผู้ใช้",
  role: "สิทธิ์",
  online: "พร้อมใช้งาน",
  logout: "ออกจากระบบ",
  admin: "แอดมิน",
  support: "Support",
  user: "ผู้ใช้",
} satisfies typeof profileCopy.en;

interface TechnicianJobsPageProps {
  searchParams: RouteSearchParams;
}

const formatDate = (date: Date | null, locale: Locale, fallback: string) => {
  if (!date) return fallback;

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const statusLabel = (
  status: ServiceReportStatus | null,
  labels: (typeof copy)[Locale]["statusLabels"],
) => (status ? labels[status] : labels.Unknown);

const statusTone = (status: ServiceReportStatus | null) => {
  switch (status) {
    case "Completed":
    case "Approved":
    case "Closed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900";
    case "Submitted":
      return "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-900";
    case "Need_Revision":
    case "Cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-900";
    case "Assigned":
    case "On_Site":
    case "In_Progress":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900";
    case "Open":
    case "Pending_Customer":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  }
};

const priorityTone = (priority: string | null) => {
  switch (priority) {
    case "Urgent":
      return "bg-rose-600 text-white";
    case "High":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200";
    case "Low":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200";
  }
};

const getFilter = (value: string | string[] | undefined): StatusFilter => {
  const filter = Array.isArray(value) ? value[0] : value;

  return filter === "Review" || filter === "Done" || filter === "All"
    ? filter
    : "Action";
};

const filterHref = (filter: StatusFilter, locale: Locale, query: string) => {
  const params = new URLSearchParams({
    lang: locale,
    filter,
  });

  if (query) params.set("q", query);

  return `/technician/jobs?${params.toString()}`;
};

const getPrimaryHref = (
  reportId: string,
  status: ServiceReportStatus | null,
  locale: Locale,
) =>
  status && lockedForUserStatuses.has(status)
    ? withLocale(`/reports/${reportId}/service-form`, locale)
    : withLocale(`/reports/${reportId}/work`, locale);

const getPrimaryLabel = (
  status: ServiceReportStatus | null,
  t: (typeof copy)[Locale],
) => (status && lockedForUserStatuses.has(status) ? t.viewForm : t.openWork);

const statusOrder = (status: ServiceReportStatus | null) => {
  if (status === "Need_Revision") return 0;
  if (status && actionStatusSet.has(status)) return 1;
  if (status === "Submitted") return 2;
  if (status && doneStatusSet.has(status)) return 3;

  return 4;
};

const priorityOrder = (priority: string | null) => {
  switch (priority) {
    case "Urgent":
      return 0;
    case "High":
      return 1;
    case "Normal":
      return 2;
    case "Low":
      return 3;
    default:
      return 2;
  }
};

export default async function TechnicianJobsPage({
  searchParams,
}: TechnicianJobsPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const user = await requireUser(locale);
  await requireFeature({ key: "technician_jobs", user, locale });
  const t = locale === "th" ? technicianThaiCopy : copy.en;
  const queryText = String(
    Array.isArray(params.q) ? params.q[0] : params.q ?? "",
  ).trim();
  const engineerIds = user.engineers.map((engineer) => engineer.engineer_id);
  const isAdmin = user.roles.role_name === "admin";
  const isSupport = user.roles.role_name === "support";
  const isFieldUser = !isAdmin && !isSupport;
  const visibleFilters = roleFilters(user.roles.role_name);
  const requestedFilter = getFilter(params.filter);
  const selectedFilter: StatusFilter = (visibleFilters as readonly StatusFilter[]).includes(
    requestedFilter,
  )
    ? requestedFilter
    : visibleFilters[0];
  const visibilityWhere: Prisma.service_reportsWhereInput = isAdmin
    ? {}
    : isSupport
      ? {
          status: {
            notIn: supportHiddenStatuses as service_reports_status[],
          },
        }
      : {
        OR: [
          {
            created_by: user.user_id,
          },
          {
            engineer_id: {
              in: engineerIds.length > 0 ? engineerIds : [-1],
            },
          },
          {
            service_report_assignments: {
              some: {
                engineer_id: {
                  in: engineerIds.length > 0 ? engineerIds : [-1],
                },
                status: {
                  in: ["Assigned", "Accepted"],
                },
              },
            },
          },
        ],
      };
  const filterStatuses =
    selectedFilter === "Action"
      ? actionStatuses
      : selectedFilter === "Review"
        ? reviewStatuses
        : selectedFilter === "Done"
          ? doneStatuses
          : null;
  const statusWhere: Prisma.service_reportsWhereInput = filterStatuses
    ? {
        status: {
          in: filterStatuses as service_reports_status[],
        },
      }
    : {};
  const searchWhere: Prisma.service_reportsWhereInput = queryText
    ? {
        OR: [
          {
            job_number: {
              contains: queryText,
            },
          },
          {
            project_number: {
              contains: queryText,
            },
          },
          {
            customers: {
              company_name: {
                contains: queryText,
              },
            },
          },
          {
            customer_sites: {
              site_name: {
                contains: queryText,
              },
            },
          },
          {
            service_report_assets: {
              some: {
                serial_number: {
                  contains: queryText,
                },
              },
            },
          },
        ],
      }
    : {};
  const baseWhere: Prisma.service_reportsWhereInput = {
    AND: [visibilityWhere],
  };
  const reportWhere: Prisma.service_reportsWhereInput = {
    AND: [visibilityWhere, statusWhere, searchWhere],
  };

  const [
    reports,
    actionCount,
    reviewCount,
    totalCount,
    notifications,
    assigneeUsers,
  ] = await Promise.all([
      prisma.service_reports.findMany({
        where: reportWhere,
        select: {
          report_id: true,
          job_number: true,
          created_by: true,
          engineer_id: true,
          status: true,
          updated_at: true,
          created_at: true,
          scheduled_date: true,
          date_issued: true,
          service_type: true,
          priority: true,
          source: true,
          customers: {
            select: {
              company_name: true,
            },
          },
          customer_sites: {
            select: {
              site_name: true,
            },
          },
          _count: {
            select: {
              service_report_photos: true,
              service_report_places: true,
              service_report_signs: true,
            },
          },
          service_report_assignments: {
            where: {
              status: {
                in: ["Assigned", "Accepted"],
              },
            },
            select: {
              engineer_id: true,
            },
          },
        },
        orderBy: [
          {
            updated_at: "desc",
          },
          {
            created_at: "desc",
          },
        ],
        take: 80,
      }),
      prisma.service_reports.count({
        where: {
          AND: [
            baseWhere,
            {
              status: {
                in: actionStatuses as service_reports_status[],
              },
            },
          ],
        },
      }),
      prisma.service_reports.count({
        where: {
          AND: [
            baseWhere,
            {
              status: {
                in: reviewStatuses as service_reports_status[],
              },
            },
          ],
        },
      }),
      prisma.service_reports.count({
        where: baseWhere,
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
      prisma.users.findMany({
        where: {
          is_active: true,
          roles: {
            role_name: {
              in: ["admin", "support", "user"],
            },
          },
        },
        select: {
          user_id: true,
          username: true,
          full_name: true,
          email: true,
          roles: {
            select: {
              role_name: true,
            },
          },
        },
        orderBy: [
          {
            full_name: "asc",
          },
          {
            username: "asc",
          },
        ],
      }),
    ]);

  const sortedReports = [...reports].sort((a, b) => {
    const priorityDiff =
      statusOrder(a.status) - statusOrder(b.status);

    if (priorityDiff !== 0) return priorityDiff;

    const queueDiff = priorityOrder(a.priority) - priorityOrder(b.priority);

    if (queueDiff !== 0) return queueDiff;

    return b.updated_at.getTime() - a.updated_at.getTime();
  });
  const nextJob =
    sortedReports.find(
      (report) =>
        report.status !== null &&
        (report.status === "Need_Revision" || actionStatusSet.has(report.status)),
    ) ?? null;
  const modeLabel = isAdmin
    ? t.adminMode
    : isSupport
      ? "Support mode"
      : t.userMode;
  const profile = locale === "th" ? technicianThaiProfileCopy : profileCopy.en;
  const primaryEngineer = user.engineers[0] ?? null;
  const engineerName = primaryEngineer
    ? [primaryEngineer.first_name, primaryEngineer.last_name]
        .filter(Boolean)
        .join(" ")
    : "";
  const displayName =
    user.full_name ||
    engineerName ||
    user.username ||
    user.email ||
    (isAdmin ? profile.admin : isSupport ? profile.support : profile.user);
  const userHandle = user.username || user.email;
  const roleLabel = isAdmin ? profile.admin : isSupport ? profile.support : profile.user;

  return (
    <main className="animate-page min-h-screen bg-[#f3f6fb] px-3 py-3 pb-24 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-5 md:pb-5">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
        <header className="animate-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
                {isAdmin ? (
                  <Link
                    href={withLocale("/dashboard", locale)}
                    className="interactive-button inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300"
                  >
                    <ArrowRight size={16} className="rotate-180" />
                    {t.backDashboard}
                  </Link>
                ) : null}
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900">
                  {modeLabel}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <BrandLogo size={isFieldUser ? 40 : 48} priority />
                <div>
                  <h1 className="text-xl font-bold tracking-normal sm:text-3xl">
                    {isFieldUser && locale === "th" ? (
                      <>
                        <span className="sm:hidden">หน้าหลักช่าง</span>
                        <span className="hidden sm:inline">{t.title}</span>
                      </>
                    ) : (
                      t.title
                    )}
                  </h1>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                    {t.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[360px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm sm:h-11 sm:w-11">
                    <UserRound size={isFieldUser ? 20 : 22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold">{displayName}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {profile.online}
                      </span>
                    </div>
                    <p className={`${isFieldUser ? "hidden sm:block" : ""} mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400`}>
                      {profile.username}: {userHandle}
                    </p>
                    <p className={`${isFieldUser ? "hidden sm:inline-flex" : "inline-flex"} mt-1 items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400`}>
                      <ShieldCheck size={13} />
                      {profile.role}: {roleLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="flex flex-wrap items-center justify-end gap-3"
                aria-label={t.controls}
              >
                <LanguageSwitcher locale={locale} pathname="/technician/jobs" />
                <ThemeToggle />
                <Link
                  href={withLocale("/reports/create", locale)}
                  className="interactive-button inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-800 sm:flex-none"
                >
                  <FilePlus2 size={16} />
                  {t.create}
                </Link>
                <form action={logoutAction}>
                  <input type="hidden" name="lang" value={locale} />
                  <button
                    type="submit"
                    className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
                  >
                    <LogOut size={16} />
                    {profile.logout}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="grid border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 sm:grid-cols-3">
            <MetricCard label={t.needAction} value={actionCount} icon={<PenLine size={18} />} />
            <MetricCard label={t.waitingReview} value={reviewCount} icon={<ClipboardCheck size={18} />} />
            <MetricCard label={t.total} value={totalCount} icon={<ClipboardList size={18} />} />
          </div>
        </header>

        <section className="animate-panel grid gap-4 xl:grid-cols-[420px_1fr] xl:gap-5">
          <div className="interactive-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="text-blue-700 dark:text-blue-300" size={20} />
              <h2 className="font-bold">{t.nextTitle}</h2>
            </div>

            {nextJob ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/35">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
                      {nextJob.job_number}
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      {nextJob.customers.company_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {nextJob.customer_sites?.site_name || t.noSite}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(
                      nextJob.status,
                    )}`}
                  >
                    {statusLabel(nextJob.status, t.statusLabels)}
                  </span>
                </div>

                <Link
                  href={getPrimaryHref(nextJob.report_id, nextJob.status, locale)}
                  className="interactive-button mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800"
                >
                  {getPrimaryLabel(nextJob.status, t)}
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                <CheckCircle2 className="mx-auto text-emerald-600" size={30} />
                <p className="mt-3 font-bold">{t.nextEmpty}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t.nextEmptyDetail}
                </p>
              </div>
            )}
          </div>

          <div className={isFieldUser ? "hidden sm:block" : ""}>
            <NotificationInbox
              compact
              locale={locale}
              notifications={notifications}
            />
          </div>
        </section>

        <section className="animate-panel">
          <div className="interactive-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <form action="/technician/jobs" className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <input type="hidden" name="lang" value={locale} />
              <input type="hidden" name="filter" value={selectedFilter} />
              <label className="relative block">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  name="q"
                  defaultValue={queryText}
                  placeholder={t.search}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:items-center">
                <button
                  type="submit"
                  className="interactive-button inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800 sm:min-w-28"
                >
                  <Search size={17} />
                  {t.searchButton}
                </button>
                <Link
                  href={withLocale("/technician/jobs", locale)}
                  className="interactive-button inline-flex h-12 min-w-16 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {t.clear}
                </Link>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {visibleFilters.map((filter) => (
                <Link
                  key={filter}
                  href={filterHref(filter, locale, queryText)}
                  className={`interactive-button inline-flex h-11 min-w-24 items-center justify-center rounded-full px-4 text-center text-sm font-bold ring-1 ${
                    selectedFilter === filter
                      ? "bg-blue-700 text-white ring-blue-700"
                      : "bg-slate-50 text-slate-600 ring-slate-200 hover:bg-white dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700"
                  }`}
                >
                  {t.filters[filter]}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="animate-panel rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="font-bold">{t.sectionTitle}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.sectionHint}
              </p>
            </div>
            <div className={isFieldUser ? "hidden sm:block" : ""}>
              <Link
                href={withLocale("/reports", locale)}
                className="interactive-button inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FileText size={16} />
                {t.allReports}
              </Link>
            </div>
          </div>

          {sortedReports.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList className="mx-auto text-slate-400" size={36} />
              <p className="mt-3 font-bold">{t.noReports}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.noReportsDetail}
              </p>
              <Link
                href={withLocale("/reports/create", locale)}
                className="interactive-button mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
              >
                <FilePlus2 size={16} />
                {t.create}
              </Link>
            </div>
          ) : (
            <div className="stagger-list grid gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedReports.map((report) => {
                const isCurrentAssignee =
                  engineerIds.includes(report.engineer_id) ||
                  report.service_report_assignments.some((assignment) =>
                    engineerIds.includes(assignment.engineer_id),
                  );
                const canTransferReport =
                  isAdmin || report.created_by === user.user_id || isCurrentAssignee;
                const transferLocked =
                  report.status !== null && lockedForUserStatuses.has(report.status);

                return (
                <article
                  key={report.report_id}
                  className={`interactive-card flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950 ${isFieldUser ? "min-h-0" : "min-h-[300px]"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-blue-700 dark:text-blue-300">
                        {report.job_number}
                      </p>
                      <h3 className="mt-1 line-clamp-2 font-bold">
                        {report.customers.company_name}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(
                        report.status,
                      )}`}
                    >
                      {statusLabel(report.status, t.statusLabels)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <InfoLine
                      icon={<MapPin size={15} />}
                      label={t.site}
                      value={report.customer_sites?.site_name || t.noSite}
                    />
                    <InfoLine
                      icon={<CalendarDays size={15} />}
                      label={t.date}
                      value={formatDate(
                        report.scheduled_date || report.date_issued,
                        locale,
                        t.noDate,
                      )}
                    />
                    <div className={isFieldUser ? "hidden sm:block" : ""}>
                      <InfoLine
                        icon={<UserRound size={15} />}
                        label={t.serviceType}
                        value={report.service_type}
                      />
                    </div>
                  </div>

                  <div className={`${isFieldUser ? "hidden sm:flex" : "flex"} mt-4 flex-wrap gap-2`}>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityTone(report.priority)}`}>
                      {t.priority}: {report.priority || "Normal"}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                      {report.source || "Technician"}
                    </span>
                  </div>

                  <form
                    action={updateTechnicianReportPriorityAction}
                    className={`${isFieldUser ? "hidden sm:block" : ""} mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900`}
                  >
                    <input type="hidden" name="lang" value={locale} />
                    <input type="hidden" name="reportId" value={report.report_id} />
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                      {t.queuePriority}
                    </label>
                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                      <select
                        name="priority"
                        defaultValue={report.priority || "Normal"}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="Urgent">
                          {locale === "th" ? "เร่งด่วน" : "Urgent"}
                        </option>
                        <option value="High">
                          {locale === "th" ? "สูง" : "High"}
                        </option>
                        <option value="Normal">
                          {locale === "th" ? "ปกติ" : "Normal"}
                        </option>
                        <option value="Low">
                          {locale === "th" ? "ต่ำ" : "Low"}
                        </option>
                      </select>
                      <button
                        type="submit"
                        className="interactive-button h-10 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                      >
                        {t.savePriority}
                      </button>
                    </div>
                  </form>

                  <div className={`${isFieldUser ? "hidden sm:grid" : "grid"} mt-4 grid-cols-3 gap-2 text-center text-xs`}>
                    <EvidenceCount label={t.photos} value={report._count.service_report_photos} />
                    <EvidenceCount label={t.signatures} value={report._count.service_report_signs} />
                    <EvidenceCount label={t.locations} value={report._count.service_report_places} />
                  </div>

                  {canTransferReport ? (
                    <form
                      action={assignServiceReportAction}
                      className="mt-4 rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-900 dark:bg-slate-900"
                    >
                      <input type="hidden" name="lang" value={locale} />
                      <input type="hidden" name="reportId" value={report.report_id} />
                      <input type="hidden" name="returnTo" value="technician_jobs" />
                      <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                        <UserPlus size={16} className="text-blue-700 dark:text-blue-300" />
                        {t.transferTitle}
                      </div>
                      {transferLocked ? (
                        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                          {t.transferLocked}
                        </p>
                      ) : (
                        <div className="grid gap-2">
                          <label className="block">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              {t.transferUser}
                            </span>
                            <select
                              name="assigneeUserId"
                              required
                              defaultValue=""
                              className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                            >
                              <option value="">{t.transferUser}</option>
                              {assigneeUsers.map((assigneeUser) => {
                                const assigneeLabel =
                                  assigneeUser.full_name ||
                                  assigneeUser.username ||
                                  assigneeUser.email;

                                return (
                                  <option
                                    key={assigneeUser.user_id}
                                    value={assigneeUser.user_id}
                                  >
                                    {assigneeLabel} ({assigneeUser.roles.role_name})
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              {t.transferNote}
                            </span>
                            <input
                              name="assignmentNote"
                              placeholder={t.transferNotePlaceholder}
                              className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                            />
                          </label>
                          <button
                            type="submit"
                            className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-800"
                          >
                            <UserPlus size={16} />
                            {t.transferSubmit}
                          </button>
                        </div>
                      )}
                    </form>
                  ) : null}

                  <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-[1fr_auto]">
                    <Link
                      href={getPrimaryHref(report.report_id, report.status, locale)}
                      className="interactive-button inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 sm:h-10 sm:rounded-lg"
                    >
                      {getPrimaryLabel(report.status, t)}
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <MobileBottomNav
        locale={locale}
        active="dashboard"
        homeHref="/technician/jobs"
        showQr={isAdmin}
      />
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:border-r lg:border-b-0">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="shrink-0 text-xs font-bold text-slate-400">{label}</span>
      <span className="min-w-0 truncate font-semibold">{value}</span>
    </div>
  );
}

function EvidenceCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900">
      <p className="font-bold">{value.toLocaleString()}</p>
      <p className="mt-0.5 truncate text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
