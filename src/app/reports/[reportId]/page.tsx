import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileSignature,
  FileText,
  PenLine,
  Printer,
  RotateCcw,
  UserPlus,
  UserRound,
  Wrench,
} from "lucide-react";
import LanguageSwitcher from "@/components/language-switcher";
import ThemeToggle from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { normalizeUploadUrl } from "@/lib/upload-urls";
import { assignServiceReportAction } from "./actions";

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
    backReports: "Service Reports",
    title: "Service Job Detail",
    subtitle: "One place to view status, continue work, review, and print the service form.",
    controls: "Language and display",
    nextStep: "Recommended next step",
    quickActions: "Quick actions",
    customerInfo: "Customer",
    jobInfo: "Job information",
    workSummary: "Work summary",
    evidence: "Evidence",
    timeline: "Status history",
    changedBy: "Changed by",
    jobNo: "Job No.",
    projectNo: "Project No.",
    serviceType: "Service type",
    priority: "Priority",
    status: "Status",
    scheduledDate: "Scheduled date",
    issuedDate: "Issued date",
    submittedDate: "Submitted date",
    reviewedDate: "Reviewed date",
    customer: "Customer",
    site: "Site",
    address: "Address",
    contact: "Contact",
    phone: "Phone",
    engineer: "Engineer",
    problem: "Problem / request",
    serviceDetail: "Service detail",
    rootProblem: "Root problem",
    resolution: "Resolution",
    recommendation: "Recommendation",
    photos: "Photos",
    signatures: "Signatures",
    locations: "Locations",
    items: "Service items",
    noData: "-",
    openWork: "Fill service work",
    openServiceForm: "Open service form",
    printPdf: "Print / Save PDF",
    backToList: "Back to list",
    backHome: "Back to home",
    review: "Review service form",
    needsWorkTitle: "Technician should complete the service work.",
    needsWorkDetail: "Fill work details, capture location, and collect customer signature.",
    reviewTitle: "Admin should review the submitted service form.",
    reviewDetail: "Check the A4 service form, then approve, request revision, or close the job.",
    revisionTitle: "Technician needs to revise this work.",
    revisionDetail: "Open the work form, update the details, and submit again.",
    completedTitle: "This job is ready for PDF or archive.",
    completedDetail: "Open the service form and save it as PDF if needed.",
    cancelledTitle: "This job has been cancelled.",
    cancelledDetail: "No next action is required unless an admin reopens the job later.",
    statusLabels: {
      Draft: "Draft",
      Open: "Open",
      Assigned: "Assigned",
      In_Progress: "In Progress",
      On_Site: "On Site",
      Pending_Customer: "Pending Customer",
      Submitted: "Waiting review",
      Need_Revision: "Need revision",
      Completed: "Completed",
      Approved: "Approved",
      Closed: "Closed",
      Cancelled: "Cancelled",
      Unknown: "Unknown",
    },
  },
  th: {
    backReports: "ใบเซอร์วิซ",
    title: "รายละเอียดใบงาน",
    subtitle: "ดูสถานะ ทำงานต่อ ตรวจสอบ และเปิดใบ Service ได้ในหน้าเดียว",
    controls: "ภาษาและการแสดงผล",
    nextStep: "ขั้นตอนที่ควรทำต่อ",
    quickActions: "ปุ่มทำงานหลัก",
    customerInfo: "ข้อมูลลูกค้า",
    jobInfo: "ข้อมูลงาน",
    workSummary: "สรุปงาน",
    evidence: "หลักฐาน",
    timeline: "ประวัติสถานะ",
    changedBy: "ผู้ดำเนินการ",
    jobNo: "เลขที่งาน",
    projectNo: "เลขโปรเจกต์",
    serviceType: "ประเภทงาน",
    priority: "ความสำคัญ",
    status: "สถานะ",
    scheduledDate: "วันที่นัดหมาย",
    issuedDate: "วันที่เปิดงาน",
    submittedDate: "วันที่ส่งงาน",
    reviewedDate: "วันที่ตรวจสอบ",
    customer: "ลูกค้า",
    site: "สถานที่",
    address: "ที่อยู่",
    contact: "ผู้ติดต่อ",
    phone: "เบอร์โทร",
    engineer: "ช่าง",
    problem: "ปัญหา / งานที่ต้องการ",
    serviceDetail: "รายละเอียดการให้บริการ",
    rootProblem: "สาเหตุของปัญหา",
    resolution: "วิธีแก้ไข",
    recommendation: "ข้อเสนอแนะ",
    photos: "รูปถ่าย",
    signatures: "ลายเซ็น",
    locations: "ตำแหน่ง",
    items: "รายการบริการ",
    noData: "-",
    openWork: "กรอก/แก้ไขงาน",
    openServiceForm: "เปิดใบ Service",
    printPdf: "พิมพ์ / บันทึก PDF",
    backToList: "กลับรายการ",
    backHome: "กลับสู่หน้าหลัก",
    review: "ตรวจสอบใบ Service",
    needsWorkTitle: "ช่างควรกรอกและส่งงาน",
    needsWorkDetail: "กรอกรายละเอียดงาน เก็บตำแหน่ง และให้ลูกค้าเซ็นรับงาน",
    reviewTitle: "แอดมินควรตรวจสอบใบ Service",
    reviewDetail: "ตรวจใบ A4 แล้วเลือกอนุมัติ ส่งกลับแก้ไข หรือปิดงาน",
    revisionTitle: "งานนี้ต้องให้ช่างแก้ไข",
    revisionDetail: "เปิดฟอร์มงาน แก้รายละเอียด แล้วส่งงานอีกครั้ง",
    completedTitle: "งานนี้พร้อมพิมพ์ PDF หรือจัดเก็บ",
    completedDetail: "เปิดใบ Service แล้วบันทึกเป็น PDF ได้ทันที",
    cancelledTitle: "งานนี้ถูกยกเลิก",
    cancelledDetail: "ยังไม่ต้องดำเนินการต่อ เว้นแต่แอดมินจะเปิดงานใหม่ภายหลัง",
    statusLabels: {
      Draft: "แบบร่าง",
      Open: "แก้ไขใบเซอร์วิซ",
      Assigned: "มอบหมายแล้ว",
      In_Progress: "กำลังดำเนินการ",
      On_Site: "ถึงหน้างาน",
      Pending_Customer: "รอลูกค้า",
      Submitted: "รอตรวจสอบ",
      Need_Revision: "ต้องแก้ไข",
      Completed: "เสร็จสิ้น",
      Approved: "อนุมัติแล้ว",
      Closed: "ปิดงาน",
      Cancelled: "ยกเลิก",
      Unknown: "ไม่ทราบสถานะ",
    },
  },
} satisfies Record<Locale, object>;

const assignmentCopy = {
  en: {
    title: "Assign / hand off job",
    description:
      "Admin or the job creator can assign this service report to another active user.",
    current: "Current responsible person",
    selectUser: "Select user",
    note: "Note",
    notePlaceholder: "Optional note for the next person...",
    submit: "Assign job",
    success: "Job assignment updated.",
    permission: "Only admin or the job creator can assign this job.",
    locked: "Closed, approved, or cancelled jobs cannot be reassigned.",
    error: "Could not assign this job. Please check the selected user.",
    history: "Assignment history",
    noHistory: "No assignment history yet.",
    assignedBy: "Assigned by",
  },
  th: {
    title: "มอบหมาย / ส่งต่องาน",
    description:
      "แอดมินหรือผู้เปิดใบงานสามารถส่งงานนี้ให้ผู้ใช้งานคนอื่นรับต่อได้",
    current: "ผู้รับผิดชอบปัจจุบัน",
    selectUser: "เลือกผู้รับงาน",
    note: "หมายเหตุ",
    notePlaceholder: "ใส่หมายเหตุให้คนรับงานถ้ามี...",
    submit: "มอบหมายงาน",
    success: "อัปเดตผู้รับงานเรียบร้อยแล้ว",
    permission: "เฉพาะแอดมินหรือผู้เปิดใบงานเท่านั้นที่มอบหมายงานได้",
    locked: "งานที่อนุมัติ ปิดงาน หรือยกเลิกแล้ว ไม่สามารถส่งต่อได้",
    error: "มอบหมายงานไม่สำเร็จ กรุณาตรวจสอบผู้รับงาน",
    history: "ประวัติการมอบหมาย",
    noHistory: "ยังไม่มีประวัติการมอบหมาย",
    assignedBy: "มอบหมายโดย",
  },
} satisfies Record<Locale, Record<string, string>>;

const activeAssignmentStatuses = new Set(["Assigned", "Accepted"]);
const closedAssignmentStatuses = new Set(["Approved", "Closed", "Cancelled"]);

interface ReportDetailPageProps {
  params: Promise<{
    reportId: string;
  }>;
  searchParams: RouteSearchParams;
}

const formatDateTime = (date: Date | null, locale: Locale, fallback: string) => {
  if (!date) return fallback;

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
};

const statusLabel = (
  status: ServiceReportStatus | null,
  labels: (typeof copy)[Locale]["statusLabels"],
) => (status ? labels[status] : labels.Unknown);

const statusTone = (status: ServiceReportStatus | null) => {
  switch (status) {
    case "Approved":
    case "Closed":
    case "Completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900";
    case "Submitted":
      return "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-900";
    case "Need_Revision":
    case "Cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-900";
    case "Open":
    case "Assigned":
    case "In_Progress":
    case "On_Site":
    case "Pending_Customer":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  }
};

const serviceTypeOptions = [
  ["PM", "ส่งมอบอุปกรณ์", "Delivered equipment"],
  ["Maintenance", "บริการหลังการขาย", "After-sales service"],
  ["Installation", "ติดตั้งอุปกรณ์", "Equipment installation"],
  ["Repair", "ตรวจสอบอุปกรณ์", "Equipment inspection"],
  ["Emergency", "อื่นๆ", "Other"],
] as const;

const serviceTypeLabel = (
  serviceType: string | null | undefined,
  locale: Locale,
  fallback: string,
) => {
  const option = serviceTypeOptions.find(([value]) => value === serviceType);

  if (!option) return fallback;

  return locale === "th" ? option[1] : option[2];
};

const getNextStep = (
  status: ServiceReportStatus | null,
  t: (typeof copy)[Locale],
) => {
  switch (status) {
    case "Submitted":
      return {
        title: t.reviewTitle,
        detail: t.reviewDetail,
        hrefType: "service-form" as const,
        label: t.review,
        Icon: ClipboardCheck,
      };
    case "Need_Revision":
      return {
        title: t.revisionTitle,
        detail: t.revisionDetail,
        hrefType: "work" as const,
        label: t.openWork,
        Icon: RotateCcw,
      };
    case "Approved":
    case "Closed":
    case "Completed":
      return {
        title: t.completedTitle,
        detail: t.completedDetail,
        hrefType: "service-form" as const,
        label: t.printPdf,
        Icon: Printer,
      };
    case "Cancelled":
      return {
        title: t.cancelledTitle,
        detail: t.cancelledDetail,
        hrefType: "reports" as const,
        label: t.backToList,
        Icon: ClipboardList,
      };
    default:
      return {
        title: t.needsWorkTitle,
        detail: t.needsWorkDetail,
        hrefType: "work" as const,
        label: t.openWork,
        Icon: PenLine,
      };
  }
};

export default async function ReportDetailPage({
  params,
  searchParams,
}: ReportDetailPageProps) {
  const [{ reportId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const locale = getLocale(rawSearchParams.lang);
  const currentUser = await requireUser(locale);
  await requireFeature({ key: "service_reports", user: currentUser, locale });
  const t = copy[locale];

  const report = await prisma.service_reports.findUnique({
    where: {
      report_id: reportId,
    },
    include: {
      customers: true,
      customer_sites: true,
      customer_contacts: true,
      engineers: {
        include: {
          users: true,
        },
      },
      service_report_items: {
        orderBy: {
          line_no: "asc",
        },
      },
      service_report_photos: {
        include: {
          uploaded_files: true,
        },
        orderBy: {
          created_at: "desc",
        },
      },
      service_report_topics: {
        orderBy: {
          topic_id: "asc",
        },
      },
      service_report_places: {
        orderBy: {
          captured_at: "desc",
        },
      },
      service_report_signs: {
        orderBy: {
          signed_at: "desc",
        },
      },
      service_report_status_history: {
        include: {
          users: true,
        },
        orderBy: {
          created_at: "desc",
        },
      },
      service_report_assignments: {
        include: {
          engineers: {
            include: {
              users: true,
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
      },
    },
  });

  if (!report) redirect(withLocale("/reports/create", locale));
  const assigneeUsers = await prisma.users.findMany({
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
  });
  const serviceTopicValues =
    report.service_report_topics.length > 0
      ? report.service_report_topics.map((topic) => topic.service_type)
      : [report.service_type];

  const currentEngineerIds = currentUser.engineers.map(
    (engineer) => engineer.engineer_id,
  );
  const isAdminLike = currentUser.roles.role_name === "admin";
  const userHomeHref = isAdminLike ? "/dashboard" : "/technician/jobs";
  const userHomeLabel = isAdminLike ? t.backReports : t.backHome;
  const isAssignedEngineer = currentEngineerIds.includes(report.engineer_id);
  const isAssignedByAssignment = report.service_report_assignments.some(
    (assignment) =>
      currentEngineerIds.includes(assignment.engineer_id) &&
      activeAssignmentStatuses.has(String(assignment.status)),
  );
  const isCreator = report.created_by === currentUser.user_id;
  const canAssignReport = isAdminLike || isCreator;
  const assignmentT = assignmentCopy[locale];
  const assignResult = Array.isArray(rawSearchParams.assigned)
    ? rawSearchParams.assigned[0]
    : rawSearchParams.assigned;
  const assignError = Array.isArray(rawSearchParams.assign_error)
    ? rawSearchParams.assign_error[0]
    : rawSearchParams.assign_error;
  const isAssignmentLocked = closedAssignmentStatuses.has(String(report.status));
  const canSubmitAssignment = canAssignReport && !isAssignmentLocked;
  const assignmentMessage =
    assignError === "permission"
      ? assignmentT.permission
      : assignError === "locked"
        ? assignmentT.locked
        : assignError
          ? assignmentT.error
          : assignResult
            ? assignmentT.success
            : null;

  if (!isAdminLike && !isCreator) {
    const readOnlyStatuses = new Set([
      "Submitted",
      "Completed",
      "Approved",
      "Closed",
      "Cancelled",
    ]);

    redirect(
      isAssignedEngineer || isAssignedByAssignment
        ? readOnlyStatuses.has(String(report.status))
          ? withLocale(`/reports/${report.report_id}/service-form`, locale)
          : withLocale(`/reports/${report.report_id}/work`, locale)
        : withLocale("/reports/create", locale),
    );
  }

  const nextStep = getNextStep(report.status, t);
  const nextHref =
    nextStep.hrefType === "work"
      ? withLocale(`/reports/${report.report_id}/work`, locale)
      : nextStep.hrefType === "service-form"
        ? withLocale(`/reports/${report.report_id}/service-form`, locale)
        : withLocale("/dashboard", locale);
  const engineerName =
    [report.engineers.first_name, report.engineers.last_name]
      .filter(Boolean)
      .join(" ") ||
    report.engineers.users.full_name ||
    report.engineers.employee_id ||
    report.engineers.users.email;
  const serviceItems =
    report.service_report_items.length > 0
      ? report.service_report_items
      : [
          {
            item_id: 0,
            service_type: report.service_type,
            service_detail: report.problem_description,
            amount: 1,
            root_problem: report.root_cause,
            resolution: report.resolution,
          },
        ];
  const customerPhone =
    report.customer_contacts?.phone ||
    report.customer_sites?.phone ||
    report.customers.phone ||
    t.noData;
  const customerAddress =
    report.customer_sites?.address || report.customers.address || t.noData;
  const NextIcon = nextStep.Icon;

  return (
    <main className="animate-page min-h-screen bg-[#f3f6fb] px-4 py-5 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="animate-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href={withLocale(userHomeHref, locale)}
                className="interactive-button mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300"
              >
                <ArrowLeft size={16} />
                {userHomeLabel}
              </Link>

              <div className="flex items-center gap-3">
                <div className="animate-pop flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">
                      {report.job_number}
                    </h1>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone(
                        report.status,
                      )}`}
                    >
                      {statusLabel(report.status, t.statusLabels)}
                    </span>
                  </div>
                  <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                    {t.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3" aria-label={t.controls}>
              <LanguageSwitcher locale={locale} pathname={`/reports/${reportId}`} />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <section className="animate-panel rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
                <NextIcon size={22} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-300">
                  {t.nextStep}
                </p>
                <h2 className="mt-1 text-lg font-bold">{nextStep.title}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {nextStep.detail}
                </p>
              </div>
            </div>
            <Link
              href={nextHref}
              className="interactive-button inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
            >
              <NextIcon size={17} />
              {nextStep.label}
            </Link>
          </div>
        </section>

        <section className="stagger-list grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            href={withLocale(`/reports/${report.report_id}/work`, locale)}
            icon={<PenLine size={20} />}
            label={t.openWork}
          />
          <ActionCard
            href={withLocale(`/reports/${report.report_id}/service-form`, locale)}
            icon={<FileSignature size={20} />}
            label={t.openServiceForm}
          />
          <ActionCard
            href={withLocale(`/reports/${report.report_id}/service-form`, locale)}
            icon={<Printer size={20} />}
            label={t.printPdf}
          />
          <ActionCard
            href={withLocale(userHomeHref, locale)}
            icon={<ClipboardList size={20} />}
            label={userHomeLabel}
          />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SectionTitle icon={<Building2 size={20} />} title={t.customerInfo} />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InfoBox label={t.customer} value={report.customers.company_name} />
                <InfoBox
                  label={t.site}
                  value={report.customer_sites?.site_name || t.noData}
                />
                <InfoBox label={t.address} value={customerAddress} wide />
                <InfoBox
                  label={t.contact}
                  value={report.customer_contacts?.full_name || report.customers.contact_person || t.noData}
                />
                <InfoBox label={t.phone} value={customerPhone} />
              </div>
            </section>

            <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SectionTitle icon={<ClipboardCheck size={20} />} title={t.jobInfo} />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InfoBox label={t.projectNo} value={report.project_number || t.noData} />
                <InfoBox
                  label={locale === "th" ? "เลขที่ใบเสนอราคา" : "Quotation No."}
                  value={report.quotation_number || t.noData}
                />
                <InfoBox
                  label={locale === "th" ? "เลข Service call" : "Service call"}
                  value={report.service_call_number || t.noData}
                />
                <InfoBox label={t.serviceType} value={serviceTopicValues.join(", ")} />
                <InfoBox label={t.priority} value={report.priority || t.noData} />
                <InfoBox
                  label={t.engineer}
                  value={
                    <span className="inline-flex items-center gap-2">
                      <UserRound size={15} />
                      {engineerName}
                    </span>
                  }
                />
                <InfoBox
                  label={t.issuedDate}
                  value={formatDateTime(report.date_issued, locale, t.noData)}
                />
                <InfoBox
                  label={t.scheduledDate}
                  value={formatDateTime(report.scheduled_date, locale, t.noData)}
                />
                <InfoBox
                  label={t.submittedDate}
                  value={formatDateTime(report.submitted_at, locale, t.noData)}
                />
                <InfoBox
                  label={t.reviewedDate}
                  value={formatDateTime(report.reviewed_at, locale, t.noData)}
                />
              </div>
            </section>

            <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SectionTitle icon={<Wrench size={20} />} title={t.workSummary} />
              <div className="mt-4 space-y-4">
                <TextBlock label={t.problem} value={report.problem_description} />
                <div className="space-y-3">
                  {serviceItems.map((item, index) => (
                    <div
                      key={item.item_id || index}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {index + 1}. {serviceTypeLabel(item.service_type, locale, t.noData)}
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <TextBlock label={t.serviceDetail} value={item.service_detail} />
                        <TextBlock label={t.rootProblem} value={item.root_problem} />
                        <TextBlock label={t.resolution} value={item.resolution} />
                      </div>
                    </div>
                  ))}
                </div>
                <TextBlock label={t.recommendation} value={report.recommendation} />
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SectionTitle icon={<CheckCircle2 size={20} />} title={t.evidence} />
              <div className="mt-4 grid gap-3">
                <EvidenceRow label={t.items} value={report.service_report_items.length} />
                <EvidenceRow label={t.photos} value={report.service_report_photos.length} />
                <EvidenceRow label={t.signatures} value={report.service_report_signs.length} />
                <EvidenceRow label={t.locations} value={report.service_report_places.length} />
              </div>
              {report.service_report_photos.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {report.service_report_photos.slice(0, 4).map((photo) => {
                    const photoUrl = normalizeUploadUrl(
                      photo.file_url || photo.uploaded_files?.file_url,
                    );

                    return (
                    <div key={photo.photo_id} className="space-y-1">
                      <div className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
                        {photoUrl ? (
                          <Image
                            src={photoUrl}
                            alt={photo.caption || `${photo.photo_type} photo`}
                            fill
                            sizes="120px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                        <span className="absolute inset-x-1 bottom-1 truncate rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {photo.caption || photo.photo_type.replace("_", " ")}
                        </span>
                      </div>
                      {photo.caption ? (
                        <p className="line-clamp-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {photo.caption}
                        </p>
                      ) : null}
                    </div>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SectionTitle icon={<UserPlus size={20} />} title={assignmentT.title} />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {assignmentT.description}
              </p>
              {assignmentMessage ? (
                <div
                  className={`mt-4 rounded-lg border px-3 py-2 text-sm font-bold ${
                    assignError || isAssignmentLocked
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                  }`}
                >
                  {assignmentMessage}
                </div>
              ) : null}
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-300">
                  {assignmentT.current}
                </p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {engineerName}
                </p>
              </div>
              {canAssignReport ? (
                <form action={assignServiceReportAction} className="mt-4 space-y-3">
                  <input type="hidden" name="lang" value={locale} />
                  <input type="hidden" name="reportId" value={report.report_id} />
                  <label className="block">
                    <span className="text-sm font-bold">{assignmentT.selectUser}</span>
                    <select
                      name="assigneeUserId"
                      defaultValue={report.engineers.user_id || ""}
                      disabled={!canSubmitAssignment}
                      className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">{assignmentT.selectUser}</option>
                      {assigneeUsers.map((assigneeUser) => {
                        const assigneeLabel =
                          assigneeUser.full_name ||
                          assigneeUser.username ||
                          assigneeUser.email;

                        return (
                          <option key={assigneeUser.user_id} value={assigneeUser.user_id}>
                            {assigneeLabel} ({assigneeUser.roles.role_name})
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold">{assignmentT.note}</span>
                    <textarea
                      name="assignmentNote"
                      rows={3}
                      placeholder={assignmentT.notePlaceholder}
                      disabled={!canSubmitAssignment}
                      className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={!canSubmitAssignment}
                    className="interactive-button inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800"
                  >
                    <UserPlus size={16} />
                    {assignmentT.submit}
                  </button>
                </form>
              ) : (
                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  {assignmentT.permission}
                </p>
              )}
              <div className="mt-5">
                <h3 className="text-sm font-black">{assignmentT.history}</h3>
                <div className="mt-3 space-y-3">
                  {report.service_report_assignments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {assignmentT.noHistory}
                    </p>
                  ) : (
                    report.service_report_assignments.map((assignment) => {
                      const assignedEngineer =
                        [
                          assignment.engineers.first_name,
                          assignment.engineers.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ") ||
                        assignment.engineers.users.full_name ||
                        assignment.engineers.employee_id ||
                        assignment.engineers.users.email;
                      const assignedBy =
                        assignment.users?.full_name ||
                        assignment.users?.username ||
                        assignment.users?.email ||
                        t.noData;

                      return (
                        <div
                          key={assignment.assignment_id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black">{assignedEngineer}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {assignment.assignment_role || "-"} /{" "}
                                {assignment.status || "-"}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                              {formatDateTime(assignment.assigned_at, locale, t.noData)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {assignmentT.assignedBy}: {assignedBy}
                          </p>
                          {assignment.note ? (
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                              {assignment.note}
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SectionTitle icon={<CalendarDays size={20} />} title={t.timeline} />
              <div className="mt-4 space-y-4">
                {report.service_report_status_history.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.noData}
                  </p>
                ) : (
                  report.service_report_status_history.map((history) => {
                    const actor =
                      history.users?.full_name ||
                      history.users?.username ||
                      history.users?.email ||
                      t.noData;

                    return (
                      <div
                        key={history.history_id}
                        className="border-l-2 border-blue-200 pl-3"
                      >
                        <p className="text-sm font-bold">
                          {statusLabel(history.to_status, t.statusLabels)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(history.created_at, locale, t.noData)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {t.changedBy}: {actor}
                        </p>
                        {history.note ? (
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {history.note}
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-blue-700 dark:text-blue-300">{icon}</span>
      <h2 className="font-bold">{title}</h2>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="interactive-card interactive-button rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
          {icon}
        </div>
        <span className="text-sm font-bold">{label}</span>
      </div>
    </Link>
  );
}

function InfoBox({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </div>
    </div>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
        {value || "-"}
      </p>
    </div>
  );
}

function EvidenceRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
      <span className="font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
