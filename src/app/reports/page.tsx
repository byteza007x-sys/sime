import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound,
  Wrench,
} from "lucide-react";
import DeleteReportButton from "@/components/delete-report-button";
import LanguageSwitcher from "@/components/language-switcher";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import ThemeToggle from "@/components/theme-toggle";
import type { service_report_priority, service_reports_status } from "@/generated/prisma/enums";
import type * as Prisma from "@/generated/prisma/internal/prismaNamespace";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { deleteServiceReportAction } from "./actions";

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

type StatusFilter = "All" | "Active" | "Submitted" | "Approved";
type RoleName = "admin" | "support" | "user" | string;

const statusFilters: StatusFilter[] = [
  "All",
  "Active",
  "Submitted",
  "Approved",
];
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
const approvedStatuses = [
  "Approved",
  "Completed",
  "Closed",
] satisfies ServiceReportStatus[];
const supportHiddenStatuses = [
  "Completed",
  "Approved",
  "Closed",
  "Cancelled",
] satisfies ServiceReportStatus[];
const statusesByFilter: Record<Exclude<StatusFilter, "All">, readonly ServiceReportStatus[]> = {
  Active: actionStatuses,
  Submitted: reviewStatuses,
  Approved: approvedStatuses,
};
const filtersByRole = (roleName: RoleName): readonly StatusFilter[] => {
  if (roleName === "admin") return statusFilters;
  if (roleName === "support") return ["All", "Active", "Submitted"];

  return ["Active", "Submitted"];
};

const copy = {
  en: {
    backDashboard: "Dashboard",
    backHome: "Back to home",
    title: "Service Jobs",
    subtitle: "Track service jobs, approval status, and field progress.",
    newReport: "Create Job",
    comingSoon: "Coming soon",
    search: "Search job no., customer, project, engineer...",
    searchButton: "Search",
    clear: "Clear",
    total: "Total Job",
    active: "In Progress Jobs",
    waitingReview: "Submitted",
    completed: "Complete Job",
    filters: "Status filters",
    all: "All",
    tableTitle: "Summary list",
    tableHint: "Showing jobs from newest to oldest",
    dateFrom: "From",
    dateTo: "To",
    transferHistory: "Transfer history",
    emptyTitle: "No service reports found",
    emptyDetail: "Try clearing the search or choosing another status.",
    jobNo: "Job No.",
    customer: "Customer / Site",
    engineer: "Technician",
    date: "Date",
    priority: "Priority",
    evidence: "Records",
    status: "Status",
    action: "Action",
    detail: "Detail",
    openWork: "Open work",
    previewForm: "Service form",
    delete: "Delete",
    confirmDelete: "Delete this service report?",
    items: "items",
    photos: "photos",
    signatures: "signatures",
    unassigned: "Unassigned",
    noSite: "No site",
    noDate: "No date",
    serviceType: "Service type",
    source: "Source",
    statusLabels: {
      Draft: "Active",
      Open: "Active",
      Assigned: "Active",
      In_Progress: "Active",
      On_Site: "Active",
      Pending_Customer: "Active",
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
    backDashboard: "แดชบอร์ด",
    backHome: "กลับสู่หน้าหลัก",
    title: "ใบเซอร์วิซ",
    subtitle: "ติดตามใบงาน หลักฐานหน้างาน สถานะอนุมัติ และความคืบหน้าของช่าง",
    newReport: "สร้างใบงาน",
    comingSoon: "เร็วๆ นี้",
    search: "ค้นหาเลขที่งาน ลูกค้า โปรเจกต์ หรือชื่อช่าง...",
    searchButton: "ค้นหา",
    clear: "ล้าง",
    total: "ใบงานทั้งหมด",
    active: "งานที่กำลังดำเนินการ",
    waitingReview: "รอตรวจสอบ",
    completed: "เสร็จสิ้น",
    filters: "กรองตามสถานะ",
    all: "ทั้งหมด",
    tableTitle: "Summary list",
    tableHint: "แสดงใบงานจากล่าสุดไปเก่าสุด",
    dateFrom: "จากวันที่",
    dateTo: "ถึงวันที่",
    transferHistory: "ประวัติส่งต่อ",
    emptyTitle: "ไม่พบใบเซอร์วิซ",
    emptyDetail: "ลองล้างคำค้นหาหรือเลือกสถานะอื่น",
    jobNo: "เลขที่งาน",
    customer: "ลูกค้า / สถานที่",
    engineer: "ช่าง",
    date: "วันที่",
    priority: "ความสำคัญ",
    evidence: "หลักฐาน",
    status: "สถานะ",
    action: "จัดการ",
    detail: "รายละเอียด",
    openWork: "เปิดงาน",
    previewForm: "ใบ Service",
    delete: "ลบ",
    confirmDelete: "ยืนยันที่จะลบใบเซอร์วิสนี้ไหม?",
    items: "รายการ",
    photos: "รูป",
    signatures: "ลายเซ็น",
    unassigned: "ยังไม่ระบุ",
    noSite: "ยังไม่ระบุสถานที่",
    noDate: "ยังไม่ระบุวันที่",
    serviceType: "ประเภทงาน",
    source: "แหล่งที่มา",
    statusLabels: {
      Draft: "แบบร่าง",
      Open: "เปิดงาน",
      Assigned: "มอบหมายแล้ว",
      In_Progress: "กำลังดำเนินการ",
      On_Site: "ถึงหน้างาน",
      Pending_Customer: "รอลูกค้า",
      Submitted: "Submitted",
      Need_Revision: "Active",
      Completed: "Approved",
      Approved: "Approved",
      Closed: "Approved",
      Cancelled: "ยกเลิก",
      Unknown: "ไม่ทราบสถานะ",
    },
  },
} satisfies Record<Locale, object>;

const thaiCopy = {
  ...copy.en,
  backDashboard: "แดชบอร์ด",
  backHome: "กลับสู่หน้าหลัก",
  title: "ใบเซอร์วิซ",
  subtitle: "ติดตามใบงาน หลักฐานหน้างาน สถานะตรวจ และความคืบหน้าของช่าง",
  newReport: "สร้างใบเซอร์วิซ",
  comingSoon: "เร็วๆ นี้",
  search: "ค้นหาเลขงาน ลูกค้า โปรเจกต์ หรือชื่อช่าง...",
  searchButton: "ค้นหา",
  clear: "ล้าง",
  total: "ใบงานทั้งหมด",
  active: "งานที่กำลังทำ",
  waitingReview: "รอตรวจสอบ",
  completed: "เสร็จสิ้น",
  filters: "กรองตามสถานะ",
  all: "ทั้งหมด",
  tableTitle: "Summary list",
  tableHint: "แสดงใบงานจากล่าสุดไปเก่าสุด",
  dateFrom: "จากวันที่",
  dateTo: "ถึงวันที่",
  transferHistory: "ประวัติส่งต่อ",
  emptyTitle: "ไม่พบใบเซอร์วิซ",
  emptyDetail: "ลองล้างคำค้นหาหรือเลือกสถานะอื่น",
  jobNo: "เลขงาน",
  customer: "ลูกค้า / สถานที่",
  engineer: "ช่าง",
  date: "วันที่",
  priority: "ความสำคัญ",
  evidence: "หลักฐาน",
  status: "สถานะ",
  action: "จัดการ",
  detail: "รายละเอียด",
  openWork: "แก้ไข",
  previewForm: "ใบ Service",
  delete: "ลบ",
  confirmDelete: "ยืนยันที่จะลบใบเซอร์วิซนี้ไหม?",
  items: "รายการ",
  photos: "รูป",
  signatures: "ลายเซ็น",
  unassigned: "ยังไม่ระบุ",
  noSite: "ยังไม่ระบุสถานที่",
  noDate: "ยังไม่ระบุวันที่",
  serviceType: "ประเภทงาน",
  source: "แหล่งที่มา",
  statusLabels: {
    Draft: "แบบร่าง",
    Open: "เปิดงาน",
    Assigned: "มอบหมายแล้ว",
    In_Progress: "กำลังดำเนินการ",
    On_Site: "ถึงหน้างาน",
    Pending_Customer: "รอลูกค้า",
    Submitted: "Submitted",
    Need_Revision: "Active",
    Completed: "Approved",
    Approved: "Approved",
    Closed: "Approved",
    Cancelled: "ยกเลิก",
    Unknown: "ไม่ทราบสถานะ",
  },
} satisfies typeof copy.en;

const isStatusFilter = (value: string | undefined): value is StatusFilter =>
  Boolean(value && statusFilters.includes(value as StatusFilter));

const normalize = (value: string | null | undefined) =>
  String(value ?? "").trim().toLowerCase();

const priorityValues = new Set(["Low", "Normal", "High", "Urgent"]);

const formatDate = (date: Date | null, locale: Locale, fallback: string) => {
  if (!date) return fallback;

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const statusTone = (status: ServiceReportStatus | null) => {
  switch (status) {
    case "Completed":
    case "Approved":
    case "Closed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900";
    case "Submitted":
      return "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-900";
    case "Assigned":
    case "On_Site":
    case "In_Progress":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900";
    case "Pending_Customer":
    case "Open":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900";
    case "Need_Revision":
    case "Cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-900";
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

const statusLabel = (
  status: ServiceReportStatus | null,
  labels: (typeof copy)[Locale]["statusLabels"],
) => (status ? labels[status] : labels.Unknown);

const statusFilterLabel = (
  status: StatusFilter,
  t: (typeof copy)[Locale],
) => {
  switch (status) {
    case "All":
      return t.all;
    case "Active":
      return t.active;
    case "Submitted":
      return t.waitingReview;
    case "Approved":
      return t.statusLabels.Approved;
  }
};

interface ReportsPageProps {
  searchParams: RouteSearchParams;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const currentUser = await requireUser(locale);
  await requireFeature({ key: "service_reports", user: currentUser, locale });

  const t = locale === "th" ? thaiCopy : copy.en;
  const queryText = String(
    Array.isArray(params.q) ? params.q[0] : params.q ?? "",
  ).trim();
  const query = normalize(queryText);
  const jobNoText = String(Array.isArray(params.jobNo) ? params.jobNo[0] : params.jobNo ?? "").trim();
  const customerText = String(Array.isArray(params.customer) ? params.customer[0] : params.customer ?? "").trim();
  const siteText = String(Array.isArray(params.site) ? params.site[0] : params.site ?? "").trim();
  const priorityText = String(Array.isArray(params.priority) ? params.priority[0] : params.priority ?? "").trim();
  const createdByText = String(Array.isArray(params.createdBy) ? params.createdBy[0] : params.createdBy ?? "").trim();
  const requestedFromText = String(Array.isArray(params.from) ? params.from[0] : params.from ?? "").trim();
  const requestedToText = String(Array.isArray(params.to) ? params.to[0] : params.to ?? "").trim();
  const engineerIds = currentUser.engineers.map((engineer) => engineer.engineer_id);
  const roleName = currentUser.roles.role_name.trim().toLowerCase();
  const isAdmin = roleName === "admin";
  const isSupport = roleName === "support";
  const shouldUseDashboardHome = isAdmin || isOwnerUser(currentUser);
  const homeHref = shouldUseDashboardHome ? "/dashboard" : "/technician/jobs";
  const homeLabel = t.backHome;
  const availableStatusFilters = filtersByRole(currentUser.roles.role_name);
  const requestedStatus = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const selectedStatus: StatusFilter =
    requestedStatus && isStatusFilter(requestedStatus)
      ? (availableStatusFilters as readonly StatusFilter[]).includes(requestedStatus)
        ? requestedStatus
        : availableStatusFilters[0]
      : availableStatusFilters[0];
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
            created_by: currentUser.user_id,
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
  const firstReport = await prisma.service_reports.findFirst({
    where: visibilityWhere,
    select: {
      created_at: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });
  const today = new Date();
  const defaultFrom = firstReport?.created_at ?? new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = today;
  const dateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };
  const fromText = requestedFromText || dateInputValue(defaultFrom);
  const toText = requestedToText || dateInputValue(defaultTo);
  const fromDate = new Date(`${fromText}T00:00:00`);
  const toDate = new Date(`${toText}T23:59:59.999`);
  const hasValidDateRange =
    !Number.isNaN(fromDate.getTime()) &&
    !Number.isNaN(toDate.getTime()) &&
    fromDate <= toDate;
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
            customer_sites: {
              address: {
                contains: queryText,
              },
            },
          },
          {
            engineers: {
              first_name: {
                contains: queryText,
              },
            },
          },
          {
            engineers: {
              last_name: {
                contains: queryText,
              },
            },
          },
          {
            engineers: {
              employee_id: {
                contains: queryText,
              },
            },
          },
        ],
      }
    : {};
  const advancedSearchWhere: Prisma.service_reportsWhereInput = {
    AND: [
      jobNoText ? { job_number: { contains: jobNoText } } : {},
      customerText
        ? {
            customers: {
              company_name: {
                contains: customerText,
              },
            },
          }
        : {},
      siteText
        ? {
            OR: [
              {
                customer_sites: {
                  site_name: {
                    contains: siteText,
                  },
                },
              },
              {
                customer_sites: {
                  address: {
                    contains: siteText,
                  },
                },
              },
            ],
          }
        : {},
      priorityText && priorityValues.has(priorityText)
        ? { priority: { equals: priorityText as service_report_priority } }
        : {},
      createdByText
        ? {
            created_by_user: {
              OR: [
                {
                  full_name: {
                    contains: createdByText,
                  },
                },
                {
                  username: {
                    contains: createdByText,
                  },
                },
                {
                  email: {
                    contains: createdByText,
                  },
                },
              ],
            },
          }
        : {},
      hasValidDateRange
        ? {
            created_at: {
              gte: fromDate,
              lte: toDate,
            },
          }
        : {},
    ],
  };
  const statusWhere: Prisma.service_reportsWhereInput =
    selectedStatus === "All"
      ? {}
      : {
          status: {
            in: statusesByFilter[selectedStatus] as service_reports_status[],
          },
        };
  const reportWhere: Prisma.service_reportsWhereInput = {
    AND: [visibilityWhere, statusWhere, searchWhere, advancedSearchWhere],
  };

  const [reports, totalReports, activeReports, waitingReview, completedReports] =
    await Promise.all([
      prisma.service_reports.findMany({
        where: reportWhere,
        select: {
          report_id: true,
          job_number: true,
          project_number: true,
          service_type: true,
          priority: true,
          status: true,
          scheduled_date: true,
          date_issued: true,
          created_at: true,
          created_by: true,
          created_by_user: {
            select: {
              username: true,
              full_name: true,
              email: true,
            },
          },
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
          engineers: {
            select: {
              first_name: true,
              last_name: true,
              employee_id: true,
            },
          },
          service_report_assignments: {
            select: {
              assignment_id: true,
              assigned_at: true,
              assignment_role: true,
              status: true,
              note: true,
              engineers: {
                select: {
                  first_name: true,
                  last_name: true,
                  employee_id: true,
                  users: {
                    select: {
                      full_name: true,
                      username: true,
                      email: true,
                    },
                  },
                },
              },
              users: {
                select: {
                  full_name: true,
                  username: true,
                  email: true,
                },
              },
            },
            orderBy: {
              assigned_at: "desc",
            },
            take: 3,
          },
          _count: {
            select: {
              service_report_items: true,
              service_report_photos: true,
              service_report_signs: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
        take: 100,
      }),
      prisma.service_reports.count({
        where: visibilityWhere,
      }),
      prisma.service_reports.count({
        where: {
          AND: [
            visibilityWhere,
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
            visibilityWhere,
            {
              status: {
                in: reviewStatuses as service_reports_status[],
              },
            },
          ],
        },
      }),
      prisma.service_reports.count({
        where: {
          AND: [
            visibilityWhere,
            {
              status: {
                in: approvedStatuses as service_reports_status[],
              },
            },
          ],
        },
      }),
    ]);

  const buildReportsHref = (status: StatusFilter) => {
    const nextParams = new URLSearchParams({ lang: locale });
    if (query) nextParams.set("q", query);
    if (jobNoText) nextParams.set("jobNo", jobNoText);
    if (customerText) nextParams.set("customer", customerText);
    if (siteText) nextParams.set("site", siteText);
    if (priorityText) nextParams.set("priority", priorityText);
    if (createdByText) nextParams.set("createdBy", createdByText);
    if (fromText) nextParams.set("from", fromText);
    if (toText) nextParams.set("to", toText);
    if (status !== "All") nextParams.set("status", status);

    return `/reports?${nextParams.toString()}`;
  };

  const stats = [
    [t.total, totalReports, ClipboardList, "text-blue-700 bg-blue-50 dark:text-blue-200 dark:bg-blue-950/60"],
    [t.active, activeReports, Clock3, "text-amber-700 bg-amber-50 dark:text-amber-200 dark:bg-amber-950/60"],
    [t.waitingReview, waitingReview, AlertCircle, "text-violet-700 bg-violet-50 dark:text-violet-200 dark:bg-violet-950/60"],
    [t.completed, completedReports, CheckCircle2, "text-emerald-700 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/60"],
  ] as const;

  return (
    <main className="animate-page min-h-screen bg-[#f3f6fb] px-4 py-5 pb-24 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6 md:pb-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="animate-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href={withLocale(homeHref, locale)}
                className="interactive-button mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300"
              >
                <ArrowLeft size={16} />
                {homeLabel}
              </Link>

              <div className="flex items-center gap-3">
                <div className="animate-pop flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <FileText size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">
                    {t.title}
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                    {t.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <LanguageSwitcher locale={locale} pathname="/reports" />
              <ThemeToggle />
              <Link
                href={withLocale("/reports/create", locale)}
                className="interactive-button inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
              >
                <Plus size={16} />
                {t.newReport}
              </Link>
            </div>
          </div>
        </header>

        <section className="stagger-list grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([label, value, Icon, tone], index) => (
            <div
              key={label}
              className={`interactive-card rounded-xl border border-slate-200/80 border-l-4 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 ${
                index === 0
                  ? "border-l-blue-500"
                  : index === 1
                    ? "border-l-amber-500"
                    : index === 2
                      ? "border-l-violet-500"
                      : "border-l-emerald-500"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.06] ${tone}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {label}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="animate-panel rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
          <form action="/reports" className="grid gap-3">
            <input type="hidden" name="lang" value={locale} />
            {selectedStatus !== "All" ? (
              <input type="hidden" name="status" value={selectedStatus} />
            ) : null}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="relative block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />
                <input
                  name="q"
                  defaultValue={queryText}
                  placeholder={t.search}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900 dark:focus:ring-blue-950"
                />
              </label>
              <div className="flex gap-2">
              <button
                type="submit"
                className="interactive-button inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 lg:flex-none"
              >
                <Search size={16} />
                {t.searchButton}
              </button>
              <Link
                href={withLocale("/reports", locale)}
                className="interactive-button inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t.clear}
              </Link>
              </div>
            </div>
            <details
              open={Boolean(
                jobNoText ||
                  customerText ||
                  siteText ||
                  priorityText ||
                  createdByText ||
                  fromText ||
                  toText,
              )}
              className="group rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-blue-700 dark:text-blue-300" />
                  {locale === "th" ? "ตัวกรองขั้นสูง" : "Advanced filters"}
                </span>
                <span className="text-xs font-semibold text-slate-400 transition group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <div className="grid gap-3 border-t border-slate-200 p-3 md:grid-cols-2 xl:grid-cols-5 dark:border-slate-800">
              <input
                name="jobNo"
                defaultValue={jobNoText}
                placeholder={locale === "th" ? "เลขงาน" : "Job No"}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/60 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
              />
              <input
                name="customer"
                defaultValue={customerText}
                placeholder={locale === "th" ? "ลูกค้า" : "Customer"}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/60 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
              />
              <input
                name="site"
                defaultValue={siteText}
                placeholder={locale === "th" ? "สถานที่" : "Site"}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/60 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
              />
              <select
                name="priority"
                defaultValue={priorityText}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/60 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
              >
                <option value="">{locale === "th" ? "ทุกความสำคัญ" : "Any priority"}</option>
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
              <input
                name="createdBy"
                defaultValue={createdByText}
                placeholder={locale === "th" ? "ผู้เขียน" : "Created by"}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/60 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
              />
              <label className="block">
                <span className="sr-only">{t.dateFrom}</span>
                <input
                  name="from"
                  type="date"
                  defaultValue={fromText}
                  aria-label={t.dateFrom}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/60 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
                />
              </label>
              <label className="block">
                <span className="sr-only">{t.dateTo}</span>
                <input
                  name="to"
                  type="date"
                  defaultValue={toText}
                  aria-label={t.dateTo}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/60 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
                />
              </label>
              </div>
            </details>
          </form>

          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase text-slate-400">
              {t.filters}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {availableStatusFilters.map((status) => {
                const active = selectedStatus === status;

                return (
                  <Link
                    key={status}
                    href={buildReportsHref(status)}
                    className={`interactive-button shrink-0 rounded-full px-3 py-2 text-xs font-bold ring-1 ${
                      active
                        ? "bg-blue-700 text-white ring-blue-700"
                        : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
                    }`}
                  >
                    {statusFilterLabel(status, t)}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="animate-panel interactive-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold">{t.tableTitle}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.tableHint}
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {reports.length} / {totalReports}
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <Wrench size={22} />
              </div>
              <h3 className="font-bold">{t.emptyTitle}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.emptyDetail}
              </p>
            </div>
          ) : (
            <>
            <div className="grid gap-3 p-4 md:hidden">
              {reports.map((report) => {
                const engineerName =
                  [report.engineers.first_name, report.engineers.last_name]
                    .filter(Boolean)
                    .join(" ") ||
                  report.engineers.employee_id ||
                  t.unassigned;
                const creatorName =
                  report.created_by_user?.full_name ||
                  report.created_by_user?.username ||
                  report.created_by_user?.email ||
                  t.unassigned;
                const serviceDate =
                  report.scheduled_date ?? report.date_issued ?? report.created_at;
                const latestAssignment = report.service_report_assignments[0] ?? null;
                const latestAssignee = latestAssignment
                  ? [
                      latestAssignment.engineers.first_name,
                      latestAssignment.engineers.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    latestAssignment.engineers.users.full_name ||
                    latestAssignment.engineers.users.username ||
                    latestAssignment.engineers.employee_id ||
                    latestAssignment.engineers.users.email
                  : null;
                const latestAssignedBy = latestAssignment
                  ? latestAssignment.users?.full_name ||
                    latestAssignment.users?.username ||
                    latestAssignment.users?.email ||
                    t.unassigned
                  : null;
                const isLockedForUser =
                  !isAdmin &&
                  ["Submitted", "Completed", "Approved", "Closed", "Cancelled"].includes(
                    String(report.status),
                  );
                const canDelete =
                  isAdmin ||
                  (report.created_by === currentUser.user_id && !isLockedForUser);

                return (
                  <article
                    key={report.report_id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={withLocale(`/reports/${report.report_id}`, locale)}
                          className="font-bold text-blue-700 dark:text-blue-300"
                        >
                          {report.job_number}
                        </Link>
                        <h3 className="mt-1 line-clamp-2 font-bold">
                          {report.customers.company_name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin size={13} />
                          {report.customer_sites?.site_name || t.noSite}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(
                          report.status,
                        )}`}
                      >
                        {statusLabel(report.status, t.statusLabels)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <p className="flex items-center gap-2">
                        <UserRound size={15} />
                        {engineerName}
                      </p>
                      <p className="flex items-center gap-2">
                        <FileText size={15} />
                        {locale === "th" ? "ผู้เขียน" : "Created by"}: {creatorName}
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarDays size={15} />
                        {formatDate(serviceDate, locale, t.noDate)}
                      </p>
                      {latestAssignment ? (
                        <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                          {t.transferHistory}: {latestAssignee} / {latestAssignedBy}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityTone(
                          report.priority,
                        )}`}
                      >
                        {report.priority || "Normal"}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        {report._count.service_report_photos} {t.photos}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        {report._count.service_report_signs} {t.signatures}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {isLockedForUser ? (
                        <Link
                          href={withLocale(
                            `/reports/${report.report_id}/service-form`,
                            locale,
                          )}
                          className="interactive-button inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800 sm:col-span-2"
                        >
                          {t.previewForm}
                        </Link>
                      ) : (
                        <Link
                          href={withLocale(`/reports/${report.report_id}/work`, locale)}
                          className="interactive-button inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {t.openWork}
                        </Link>
                      )}
                      {!isLockedForUser ? (
                        <Link
                          href={withLocale(
                            `/reports/${report.report_id}/service-form`,
                            locale,
                          )}
                          className="interactive-button inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800"
                        >
                          {t.previewForm}
                        </Link>
                      ) : null}
                      {canDelete ? (
                        <div className="sm:col-span-2">
                          <DeleteReportButton
                            action={deleteServiceReportAction}
                            reportId={report.report_id}
                            locale={locale}
                            label={t.delete}
                            confirmMessage={t.confirmDelete}
                          />
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1080px]">
                <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3">{t.jobNo}</th>
                    <th className="px-5 py-3">{t.customer}</th>
                    <th className="px-5 py-3">{t.engineer}</th>
                    <th className="px-5 py-3">{locale === "th" ? "ผู้เขียน" : "Created by"}</th>
                    <th className="px-5 py-3">{t.date}</th>
                    <th className="px-5 py-3">{t.priority}</th>
                    <th className="px-5 py-3">{t.evidence}</th>
                    <th className="px-5 py-3">{t.status}</th>
                    <th className="px-5 py-3">{t.action}</th>
                  </tr>
                </thead>
                <tbody className="stagger-list divide-y divide-slate-100 dark:divide-slate-800">
                  {reports.map((report) => {
                    const engineerName =
                      [report.engineers.first_name, report.engineers.last_name]
                        .filter(Boolean)
                        .join(" ") ||
                      report.engineers.employee_id ||
                      t.unassigned;
                    const creatorName =
                      report.created_by_user?.full_name ||
                      report.created_by_user?.username ||
                      report.created_by_user?.email ||
                      t.unassigned;
                    const serviceDate =
                      report.scheduled_date ?? report.date_issued ?? report.created_at;
                    const latestAssignment = report.service_report_assignments[0] ?? null;
                    const latestAssignee = latestAssignment
                      ? [
                          latestAssignment.engineers.first_name,
                          latestAssignment.engineers.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ") ||
                        latestAssignment.engineers.users.full_name ||
                        latestAssignment.engineers.users.username ||
                        latestAssignment.engineers.employee_id ||
                        latestAssignment.engineers.users.email
                      : null;
                    const latestAssignedBy = latestAssignment
                      ? latestAssignment.users?.full_name ||
                        latestAssignment.users?.username ||
                        latestAssignment.users?.email ||
                        t.unassigned
                      : null;
                    const isLockedForUser =
                      !isAdmin &&
                      ["Submitted", "Completed", "Approved", "Closed", "Cancelled"].includes(
                        String(report.status),
                      );
                    const canDelete =
                      isAdmin ||
                      (report.created_by === currentUser.user_id && !isLockedForUser);

                    return (
                      <tr
                        key={report.report_id}
                        className="table-row-motion text-sm hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      >
                        <td className="px-5 py-4 align-top">
                          <Link
                            href={withLocale(`/reports/${report.report_id}`, locale)}
                            className="interactive-button font-bold text-slate-950 hover:text-blue-700 dark:text-white dark:hover:text-blue-300"
                          >
                            {report.job_number}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {t.serviceType}: {report.service_type}
                          </p>
                          {report.project_number ? (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {report.project_number}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {report.customers.company_name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin size={13} />
                            {report.customer_sites?.site_name || t.noSite}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <UserRound size={14} />
                            {engineerName}
                          </span>
                          {latestAssignment ? (
                            <p className="mt-2 max-w-[220px] rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                              {t.transferHistory}: {latestAssignee}
                              <br />
                              {latestAssignedBy}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 align-top text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <FileText size={14} />
                            {creatorName}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={14} />
                            {formatDate(serviceDate, locale, t.noDate)}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${priorityTone(
                              report.priority,
                            )}`}
                          >
                            {report.priority || "Normal"}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <div className="space-y-1">
                            <p>{report._count.service_report_items} {t.items}</p>
                            <p>{report._count.service_report_photos} {t.photos}</p>
                            <p>{report._count.service_report_signs} {t.signatures}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(
                              report.status,
                            )}`}
                          >
                            {statusLabel(report.status, t.statusLabels)}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            {isLockedForUser ? (
                              <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500">
                                {statusLabel(report.status, t.statusLabels)}
                              </span>
                            ) : (
                              <Link
                                href={withLocale(
                                  `/reports/${report.report_id}/work`,
                                  locale,
                                )}
                                className="interactive-button inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                {t.openWork}
                              </Link>
                            )}
                            <Link
                              href={withLocale(
                                `/reports/${report.report_id}/service-form`,
                                locale,
                              )}
                              className="interactive-button inline-flex h-9 items-center justify-center rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800"
                            >
                              {t.previewForm}
                            </Link>
                            {canDelete ? (
                              <DeleteReportButton
                                action={deleteServiceReportAction}
                                reportId={report.report_id}
                                locale={locale}
                                label={t.delete}
                                confirmMessage={t.confirmDelete}
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </div>
      <MobileBottomNav
        locale={locale}
        active="reports"
        homeHref={homeHref}
        showQr={shouldUseDashboardHome}
      />
    </main>
  );
}
