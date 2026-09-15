import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileSignature,
  Images,
  MapPin,
  Save,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import LanguageSwitcher from "@/components/language-switcher";
import LocationCapture from "@/components/location-capture";
import ReportCustomerPicker from "@/components/report-customer-picker";
import ReportPhotoFieldList from "@/components/report-photo-field-list";
import ServiceAssetFieldList from "@/components/service-asset-field-list";
import ServiceWorkItemList from "@/components/service-work-item-list";
import SignaturePad from "@/components/signature-pad";
import StarRatingField from "@/components/star-rating-field";
import ThemeToggle from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { isFeatureEnabled, requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { submitServiceWorkAction } from "./actions";

export const dynamic = "force-dynamic";

const copy = {
  en: {
    backReports: "Service Reports",
    backTechnicianJobs: "My jobs",
    title: "Complete Service Work",
    subtitle: "Fill service details, capture location, and collect customer signature.",
    controls: "Language and display",
    customerInfo: "Customer information",
    workInfo: "Work details",
    verification: "On-site verification",
    photosTitle: "On-site photos",
    photosHelp: "Choose the photo type, then attach one or more job site images.",
    photoType: "Photo type",
    photoFiles: "Photos",
    photoFilesHint: "You can select multiple images or use the mobile camera.",
    signatures: "Signatures",
    customer: "Customer",
    site: "Site",
    contact: "Contact",
    phone: "Phone",
    jobNo: "Job No.",
    serviceType: "Service type",
    priority: "Priority",
    currentStatus: "Current status",
    serviceDetail: "Details of service",
    amount: "Amount",
    rootProblem: "Root problem",
    resolution: "Resolution",
    recommendation: "Recommendation / next action",
    customerName: "Customer signer name",
    customerPosition: "Customer position",
    engineerName: "Engineer signer name",
    engineerPosition: "Engineer position",
    submit: "Submit completed work",
    required: "Required",
    optional: "Optional",
    captureLocation: "Capture current location",
    locationReady: "Location captured",
    locationDenied: "Cannot get location",
    customerSignature: "Customer signature",
    engineerSignature: "Engineer signature",
    clearSignature: "Clear",
    noSite: "No site",
    noContact: "No contact",
    noPhone: "No phone",
    lockedTitle: "This account cannot edit this job",
    lockedDetail:
      "Only admins, managers, or the assigned engineer can submit this service work.",
    error: {
      required: "Please fill service detail, root problem, and resolution.",
      customerSignature: "Please enter customer name and customer signature.",
      gpsInvalid: "Please capture or enter valid GPS coordinates.",
      gpsRange: "The captured location is more than 10 km from the site.",
      assetSerial:
        "Please enter every serial number or select No serial number for that equipment.",
      assetDuplicateSerial: "A serial number is duplicated in this service report.",
      photoSize: "Each photo must be 5 MB or smaller after optimization.",
      photoType: "Please upload image files only.",
      default: "Cannot submit this service work. Please check the form.",
    },
    status: {
      DraftSaved: "Draft saved. You can continue editing before submitting.",
    },
    checklistTitle: "Before submitting",
    checklist: [
      "Confirm service detail and resolution are complete",
      "Capture location when the technician is on site",
      "Let the customer review and sign on screen",
      "Submit only after the job is ready for admin review",
    ],
    placeholders: {
      serviceDetail: "Describe the service performed...",
      rootProblem: "What caused the issue?",
      resolution: "How was the issue resolved?",
      recommendation: "Optional follow-up note...",
    },
  },
  th: {
    backReports: "ใบเซอร์วิซ",
    backTechnicianJobs: "งานของฉัน",
    title: "แก้ไขใบเซอร์วิซ",
    subtitle: "กรอกรายละเอียดงาน เก็บตำแหน่ง และให้ลูกค้าเซ็นรับงาน",
    controls: "ภาษาและการแสดงผล",
    customerInfo: "ข้อมูลลูกค้า",
    workInfo: "รายละเอียดงาน",
    verification: "ยืนยันหน้างาน",
    photosTitle: "รูปถ่ายหน้างาน",
    photosHelp: "เลือกประเภทรูป แล้วแนบรูปหน้างานได้หลายรูป",
    photoType: "ประเภทรูป",
    photoFiles: "เลือกรูปถ่าย",
    photoFilesHint: "เลือกได้หลายรูป และรองรับกล้องมือถือ",
    signatures: "ลายเซ็น",
    customer: "ลูกค้า",
    site: "สถานที่",
    contact: "ผู้ติดต่อ",
    phone: "เบอร์โทร",
    jobNo: "เลขที่งาน",
    serviceType: "ประเภทงาน",
    priority: "ความสำคัญ",
    currentStatus: "สถานะปัจจุบัน",
    serviceDetail: "รายละเอียดการให้บริการ",
    amount: "จำนวน",
    rootProblem: "สาเหตุของปัญหา",
    resolution: "วิธีแก้ไข",
    recommendation: "ข้อเสนอแนะ / งานต่อเนื่อง",
    customerName: "ชื่อผู้เซ็นฝั่งลูกค้า",
    customerPosition: "ตำแหน่งลูกค้า",
    engineerName: "ชื่อช่างผู้ให้บริการ",
    engineerPosition: "ตำแหน่งช่าง",
    submit: "ส่งงานให้ตรวจสอบ",
    required: "จำเป็น",
    optional: "ไม่บังคับ",
    captureLocation: "เก็บตำแหน่งปัจจุบัน",
    locationReady: "เก็บตำแหน่งแล้ว",
    locationDenied: "ไม่สามารถเก็บตำแหน่งได้",
    customerSignature: "ลายเซ็นลูกค้า",
    engineerSignature: "ลายเซ็นช่าง",
    clearSignature: "ล้าง",
    noSite: "ยังไม่ระบุสถานที่",
    noContact: "ยังไม่ระบุผู้ติดต่อ",
    noPhone: "ยังไม่ระบุเบอร์โทร",
    lockedTitle: "บัญชีนี้แก้ไขงานนี้ไม่ได้",
    lockedDetail:
      "เฉพาะแอดมิน ผู้จัดการ หรือช่างที่ถูกมอบหมายเท่านั้นที่ส่งงานนี้ได้",
    error: {
      required: "กรุณากรอกรายละเอียดงาน สาเหตุ และวิธีแก้ไข",
      customerSignature: "กรุณากรอกชื่อลูกค้าและให้ลูกค้าเซ็น",
      gpsInvalid: "กรุณาเก็บหรือกรอกพิกัด GPS ให้ถูกต้อง",
      gpsRange: "ตำแหน่งที่เก็บอยู่ห่างจากไซต์เกิน 10 กม. กรุณาเก็บตำแหน่งใหม่ที่หน้างาน",
      assetSerial: "กรุณากรอก Serial ให้ครบ หรือเลือก ไม่มี Serial ในรายการนั้น",
      assetDuplicateSerial: "มี Serial ซ้ำในใบเซอร์วิซนี้ กรุณาตรวจสอบอีกครั้ง",
      photoSize: "รูปแต่ละไฟล์ต้องไม่เกิน 5MB หลังลดขนาดแล้ว",
      photoType: "กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น",
      default: "ส่งงานไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง",
    },
    status: {
      DraftSaved: "บันทึกร่างแล้ว สามารถกลับมาแก้ต่อก่อนส่งตรวจได้",
    },
    checklistTitle: "ก่อนส่งงาน",
    checklist: [
      "ตรวจรายละเอียดงานและวิธีแก้ไขให้ครบ",
      "เก็บตำแหน่งเมื่ออยู่หน้างานจริง",
      "ให้ลูกค้าตรวจสอบและเซ็นบนหน้าจอ",
      "ส่งงานเมื่อพร้อมให้แอดมินตรวจสอบ",
    ],
    placeholders: {
      serviceDetail: "อธิบายงานที่ให้บริการ...",
      rootProblem: "สาเหตุของปัญหาคืออะไร?",
      resolution: "แก้ไขอย่างไร?",
      recommendation: "หมายเหตุหรืองานต่อเนื่อง ถ้ามี...",
    },
  },
} satisfies Record<Locale, object>;

const statusTone = (status: string | null) => {
  switch (status) {
    case "Submitted":
    case "Completed":
    case "Approved":
    case "Closed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900";
    case "Need_Revision":
    case "Cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-900";
    default:
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900";
  }
};

const serviceTypeOptions = [
  ["PM", "ส่งมอบอุปกรณ์", "Delivered equipment"],
  ["Maintenance", "บริการหลังการขาย", "After-sales service"],
  ["Installation", "ติดตั้งอุปกรณ์", "Equipment installation"],
  ["Repair", "ตรวจสอบอุปกรณ์", "Equipment inspection"],
  ["Emergency", "อื่นๆ", "Other"],
] as const;

const scoreFields = [
  ["responsivenessScore", "ความรวดเร็ว / ตรงต่อเวลา", "Responsiveness / timeliness"],
  ["staffKnowledgeScore", "ความรู้และความเป็นมืออาชีพ", "Staff competence"],
  ["serviceQualityScore", "มารยาทและการสื่อสาร", "Courtesy and communication"],
  ["problemSolutionScore", "การแก้ไขปัญหา / คุณภาพงาน", "Problem resolution"],
  ["overallScore", "ความพึงพอใจโดยรวม", "Overall satisfaction"],
] as const;

const lockedForUserStatuses = new Set([
  "Submitted",
  "Completed",
  "Approved",
  "Closed",
  "Cancelled",
]);

const formatDateTimeInput = (date: Date | null) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface WorkPageProps {
  params: Promise<{
    reportId: string;
  }>;
  searchParams: RouteSearchParams;
}

export default async function WorkPage({ params, searchParams }: WorkPageProps) {
  const [{ reportId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const locale = getLocale(rawSearchParams.lang);
  const currentUser = await requireUser(locale);
  await requireFeature({ key: "service_reports", user: currentUser, locale });
  const mapsEnabled = await isFeatureEnabled("maps");
  const t = copy[locale];
  const errorKey = Array.isArray(rawSearchParams.error)
    ? rawSearchParams.error[0]
    : rawSearchParams.error;
  const statusKey = Array.isArray(rawSearchParams.status)
    ? rawSearchParams.status[0]
    : rawSearchParams.status;
  const errorMessage =
    errorKey && Object.prototype.hasOwnProperty.call(t.error, errorKey)
      ? t.error[errorKey as keyof typeof t.error]
      : errorKey
        ? t.error.default
        : null;
  const statusMessage =
    statusKey && Object.prototype.hasOwnProperty.call(t.status, statusKey)
      ? t.status[statusKey as keyof typeof t.status]
      : null;

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
      service_report_assets: {
        orderBy: {
          line_no: "asc",
        },
      },
      service_report_topics: {
        orderBy: {
          topic_id: "asc",
        },
      },
      service_report_assignments: {
        select: {
          engineer_id: true,
          status: true,
        },
      },
      satisfaction: true,
    },
  });

  if (!report) redirect(withLocale("/reports/create", locale));

  const [inventorySuggestions, customerOptions, siteOptions] = await Promise.all([
    prisma.inventory.findMany({
    where: {
      sap_is_active: {
        not: false,
      },
    },
    select: {
      inventory_id: true,
      serial_number: true,
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
        updated_at: "desc",
      },
      {
        serial_number: "asc",
      },
    ],
    take: 40,
    }),
    prisma.customers.findMany({
      select: {
        customer_id: true,
        sap_bp_code: true,
        company_name: true,
        phone: true,
        address: true,
        province: true,
      },
      orderBy: {
        company_name: "asc",
      },
      take: 500,
    }),
    prisma.customer_sites.findMany({
      select: {
        site_id: true,
        customer_id: true,
        site_name: true,
        address: true,
        province: true,
      },
      orderBy: [
        {
          site_name: "asc",
        },
        {
          site_id: "asc",
        },
      ],
      take: 1000,
    }),
  ]);

  const roleName = currentUser.roles.role_name;
  const isAdminLike = roleName === "admin";
  const isCreator = report.created_by === currentUser.user_id;
  const isAssignedEngineer = currentUser.engineers.some(
    (engineer) => engineer.engineer_id === report.engineer_id,
  );
  const isAssignedByHandoff = report.service_report_assignments.some(
    (assignment) =>
      currentUser.engineers.some(
        (engineer) => engineer.engineer_id === assignment.engineer_id,
      ) && ["Assigned", "Accepted"].includes(String(assignment.status)),
  );
  const isLockedForUser =
    report.status !== null && lockedForUserStatuses.has(report.status);
  const canSubmit =
    isAdminLike ||
    ((isAssignedEngineer || isAssignedByHandoff || isCreator) && !isLockedForUser);
  const backHref =
    roleName === "admin"
      ? withLocale("/reports", locale)
      : withLocale("/technician/jobs", locale);
  const initialServiceRows =
    report.service_report_items.length > 0
      ? report.service_report_items.map((item) => ({
          id: String(item.item_id),
          serviceType: item.service_type || report.service_type,
          serviceDetail: item.service_detail || "",
          amount: item.amount || 1,
          rootProblem: item.root_problem || "",
          resolution: item.resolution || "",
        }))
      : [
          {
            id: "initial",
            serviceType: report.service_type,
            serviceDetail: report.problem_description || "",
            amount: 1,
            rootProblem: report.root_cause || "",
            resolution: report.resolution || "",
          },
        ];
  const engineerName =
    [report.engineers.first_name, report.engineers.last_name]
      .filter(Boolean)
      .join(" ") ||
    report.engineers.users.full_name ||
    report.engineers.employee_id ||
    report.engineers.users.email;
  const customerSigner =
    report.customer_contacts?.full_name || report.customers.contact_person || "";
  const scoreDefault = (name: (typeof scoreFields)[number][0]) => {
    switch (name) {
      case "responsivenessScore":
        return report.satisfaction?.responsiveness_score ?? null;
      case "staffKnowledgeScore":
        return report.satisfaction?.staff_knowledge_score ?? null;
      case "serviceQualityScore":
        return report.satisfaction?.service_quality_score ?? null;
      case "problemSolutionScore":
        return report.satisfaction?.problem_solution_score ?? null;
      case "overallScore":
        return report.satisfaction?.overall_score ?? null;
      default:
        return null;
    }
  };
  const assetSuggestions = inventorySuggestions.map((item) => {
    const itemNo = item.equipment_master.sap_item_no || item.equipment_master.model || "";
    const description = item.equipment_master.description || "";
    const model = [itemNo, description].filter(Boolean).join(" - ");
    const label = [item.equipment_master.sap_item_no, item.serial_number]
      .filter(Boolean)
      .join(" / ");

    return {
      key: String(item.inventory_id),
      inventoryId: item.inventory_id,
      label,
      model: model || itemNo,
      serialNumber: item.serial_number,
    };
  });
  const serviceWorkOptions = serviceTypeOptions.map(([value, thLabel, enLabel]) => ({
    value,
    label: locale === "th" ? thLabel : enLabel,
  }));
  const pickerCustomers = customerOptions.some(
    (customer) => customer.customer_id === report.customer_id,
  )
    ? customerOptions
    : [
        {
          customer_id: report.customers.customer_id,
          sap_bp_code: report.customers.sap_bp_code,
          company_name: report.customers.company_name,
          phone: report.customers.phone,
          address: report.customers.address,
          province: report.customers.province,
        },
        ...customerOptions,
      ];
  const pickerSites =
    report.customer_sites &&
    !siteOptions.some((site) => site.site_id === report.customer_sites?.site_id)
      ? [
          {
            site_id: report.customer_sites.site_id,
            customer_id: report.customer_sites.customer_id,
            site_name: report.customer_sites.site_name,
            address: report.customer_sites.address,
            province: report.customer_sites.province,
          },
          ...siteOptions,
        ]
      : siteOptions;
  const initialAssetRows = report.service_report_assets.map((asset) => ({
    id: String(asset.asset_id),
    actionType: asset.action_type,
    model: [asset.brand, asset.model].filter(Boolean).join(" ").trim(),
    serialNumber: asset.serial_number || "",
    noSerial: !asset.serial_number,
    inventoryId: null,
    amount: asset.amount || 1,
    installationPoint: asset.installation_point || "",
  }));
  const siteLat =
    report.customer_sites?.gps_lat === null || report.customer_sites?.gps_lat === undefined
      ? null
      : Number(report.customer_sites.gps_lat);
  const siteLong =
    report.customer_sites?.gps_long === null || report.customer_sites?.gps_long === undefined
      ? null
      : Number(report.customer_sites.gps_long);
  const assetHelp =
    locale === "th"
      ? "พิมพ์ชื่อ model หรือ serial แล้วเลือกจากรายการในระบบได้ หรือกรอกเองได้ถ้าไม่มีในคลัง SAP"
      : "Type a model or serial number and select an existing inventory suggestion, or enter it manually when it is not in SAP.";
  const assetLabels = {
    help: assetHelp,
    actionType: locale === "th" ? "ประเภท" : "Type",
    model: locale === "th" ? "ชื่อ / Model อุปกรณ์" : "Equipment model",
    serialNumber: locale === "th" ? "Serial number" : "Serial number",
    noSerial: locale === "th" ? "ไม่มี Serial" : "No serial number",
    amount: locale === "th" ? "จำนวน" : "Qty",
    installationPoint:
      locale === "th" ? "จุดติดตั้ง / หมายเหตุ" : "Install point / note",
    returnReason:
      locale === "th" ? "เหตุผลที่เก็บกลับ / หมายเหตุ" : "Return reason / note",
    add: locale === "th" ? "เพิ่มอุปกรณ์" : "Add equipment",
    remove: locale === "th" ? "ลบอุปกรณ์" : "Remove equipment",
    installed: locale === "th" ? "ติดตั้ง" : "Installed",
    delivered: locale === "th" ? "ส่งมอบ" : "Delivered",
    returned: locale === "th" ? "เก็บกลับ" : "Returned",
    searchPlaceholder:
      locale === "th" ? "ค้นหา model หรือ serial..." : "Search model or serial...",
    suggestions: locale === "th" ? "รายการที่พบ" : "Suggestions",
    viewMore: locale === "th" ? "ดูเพิ่มเติม" : "View more",
    choose: locale === "th" ? "เลือกอุปกรณ์นี้" : "Choose this item",
    noResults: locale === "th" ? "ไม่พบข้อมูลอุปกรณ์" : "No equipment found",
    selected: locale === "th" ? "เลือกจากคลังแล้ว" : "Inventory linked",
    close: locale === "th" ? "ปิด" : "Close",
  };

  return (
    <main className="animate-page min-h-screen bg-[#f3f6fb] px-4 py-5 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="animate-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href={backHref}
                className="interactive-button mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300"
              >
                <ArrowLeft size={16} />
                {t.backReports}
              </Link>

              <div className="flex items-center gap-3">
                <div className="animate-pop flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <ClipboardCheck size={24} />
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

            <div className="flex flex-wrap items-center gap-3" aria-label={t.controls}>
              <LanguageSwitcher locale={locale} pathname={`/reports/${reportId}/work`} />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {errorMessage ? (
          <section className="animate-panel rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
            {errorMessage}
          </section>
        ) : null}

        {statusMessage ? (
          <section className="animate-panel rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            {statusMessage}
          </section>
        ) : null}

        {!canSubmit ? (
          <section className="animate-panel rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <h2 className="font-bold">{t.lockedTitle}</h2>
            <p className="mt-1 text-sm">{t.lockedDetail}</p>
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <form action={submitServiceWorkAction} className="animate-panel space-y-5">
            <input type="hidden" name="lang" value={locale} />
            <input type="hidden" name="reportId" value={report.report_id} />

            <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center gap-2">
                <Building2 className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">{t.customerInfo}</h2>
              </div>

              <ReportCustomerPicker
                customers={pickerCustomers}
                sites={pickerSites}
                locale={locale}
                searchUrl="/api/customers/search"
                initialCustomerId={report.customer_id}
                initialSiteId={report.site_id}
                initialContactName={
                  report.customer_contacts?.full_name ||
                  report.customers.contact_person ||
                  ""
                }
                initialContactPhone={
                  report.customer_contacts?.phone ||
                  report.customer_sites?.phone ||
                  report.customers.phone ||
                  ""
                }
              />

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <InfoBox label={t.jobNo} value={report.job_number} />
                <InfoBox
                  label={t.currentStatus}
                  value={
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(
                        report.status,
                      )}`}
                    >
                      {report.status || "-"}
                    </span>
                  }
                />
              </div>
            </section>

            <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center gap-2">
                <CalendarDays className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">
                  {locale === "th" ? "วันเวลาใบเซอร์วิซ" : "Service date and time"}
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold">
                    {locale === "th" ? "วันที่นัดหมาย" : "Scheduled date"}
                  </span>
                  <input
                    name="adminScheduledDate"
                    type="datetime-local"
                    defaultValue={formatDateTimeInput(report.scheduled_date)}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold">
                    {locale === "th" ? "วันที่งานเสร็จสิ้น" : "Completion date / time"}
                  </span>
                  <input
                    name="adminDueAt"
                    type="datetime-local"
                    defaultValue={formatDateTimeInput(report.due_at)}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              </div>
            </section>

            <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center gap-2">
                <Wrench className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">{t.workInfo}</h2>
              </div>

              <ServiceWorkItemList
                initialRows={initialServiceRows}
                serviceOptions={serviceWorkOptions}
                labels={{
                  serviceType: locale === "th" ? "หัวข้องาน" : "Work topic",
                  serviceDetail: t.serviceDetail,
                  rootProblem: t.rootProblem,
                  resolution: t.resolution,
                  add:
                    locale === "th"
                      ? "เพิ่มรายละเอียดงาน"
                      : "Add work detail",
                  remove: locale === "th" ? "ลบรายการ" : "Remove item",
                  required: t.required,
                  placeholders: t.placeholders,
                }}
              />

              <label className="mt-4 block">
                <span className="flex items-center justify-between text-sm font-bold">
                  {t.recommendation}
                  <span className="text-xs text-slate-400">{t.optional}</span>
                </span>
                <textarea
                  name="recommendation"
                  rows={3}
                  defaultValue={report.recommendation || ""}
                  className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                  placeholder={t.placeholders.recommendation}
                />
              </label>
            </section>

            <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <ServiceAssetFieldList
                suggestions={assetSuggestions}
                initialRows={initialAssetRows}
                searchUrl="/api/inventory/search"
                actionOptions={["Delivered", "Installed", "Returned"]}
                labels={{
                  ...assetLabels,
                  title:
                    locale === "th"
                      ? "รายการอุปกรณ์ติดตั้ง / ส่งมอบ / เก็บกลับ"
                      : "Equipment installed / delivered / returned",
                  help:
                    locale === "th"
                      ? "เลือกประเภทของแต่ละรายการ แล้วกรอกข้อมูลอุปกรณ์ให้ตรงกับงานนั้น"
                      : "Choose the type for each item, then fill the equipment details for that action.",
                  add: locale === "th" ? "เพิ่มรายการอุปกรณ์" : "Add equipment item",
                }}
              />
            </section>

            <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center gap-2">
                <ClipboardCheck className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">
                  {locale === "th" ? "หมายเหตุและประเมินบริการ" : "Remark and service rating"}
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  ["Free_Service", locale === "th" ? "ไม่มีค่าบริการ" : "Free service"],
                  ["Charged", locale === "th" ? "มีค่าบริการ" : "Service charge"],
                  ["Other", locale === "th" ? "อื่นๆ" : "Other"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"
                  >
                    <input
                      type="radio"
                      name="chargeType"
                      value={value}
                      defaultChecked={(report.charge_type || "Free_Service") === value}
                      className="h-4 w-4"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold">
                    {locale === "th" ? "ค่าบริการ" : "Service fee"}
                  </span>
                  <input
                    name="serviceFee"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={report.service_fee?.toString() || ""}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold">
                    {locale === "th" ? "หมายเหตุค่าบริการ / อื่นๆ" : "Charge note / other"}
                  </span>
                  <input
                    name="otherChargeNote"
                    defaultValue={report.other_charge_note || ""}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {scoreFields.map(([name, thLabel, enLabel]) => (
                  <StarRatingField
                    key={name}
                    name={name}
                    label={locale === "th" ? thLabel : enLabel}
                    defaultValue={scoreDefault(name)}
                    emptyLabel={locale === "th" ? "ล้างคะแนน" : "Clear"}
                  />
                ))}
                <label className="block">
                  <span className="text-sm font-bold">
                    {locale === "th" ? "คะแนนแนะนำบริการ" : "NPS score"}
                  </span>
                  <input
                    name="npsScore"
                    type="number"
                    min={0}
                    max={10}
                    defaultValue={report.satisfaction?.nps_score || ""}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-sm font-bold">
                  {locale === "th" ? "ข้อเสนอแนะจากลูกค้า" : "Customer suggestion"}
                </span>
                <textarea
                  name="customerComment"
                  rows={3}
                  defaultValue={report.satisfaction?.customer_comment || ""}
                  className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </section>

            <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center gap-2">
                <MapPin className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">{t.verification}</h2>
              </div>
              {mapsEnabled ? (
                <LocationCapture
                buttonLabel={t.captureLocation}
                readyLabel={t.locationReady}
                deniedLabel={t.locationDenied}
                siteLat={siteLat}
                siteLong={siteLong}
                maxDistanceKm={10}
                siteLabel={locale === "th" ? "ตำแหน่งไซต์" : "Site location"}
                currentLabel={locale === "th" ? "ตำแหน่งปัจจุบัน" : "Current location"}
                distanceLabel={locale === "th" ? "ระยะห่างจากไซต์" : "Distance from site"}
                withinRangeLabel={locale === "th" ? "อยู่ในระยะ 10 กม." : "Within 10 km"}
                outsideRangeLabel={
                  locale === "th"
                    ? "เกินระยะ 10 กม. ไม่ควรส่งงานจากจุดนี้"
                    : "More than 10 km from site"
                }
                noSiteLocationLabel={
                  locale === "th"
                    ? "ไซต์นี้ยังไม่มีพิกัด จึงแสดงแผนที่และเช็คระยะจากตำแหน่งปัจจุบันเท่านั้น"
                    : "This site has no GPS coordinates, so only the captured location can be shown."
                }
                mapTitle={locale === "th" ? "แผนที่ตำแหน่งงาน" : "Service location map"}
                accuracyLabel={locale === "th" ? "ความแม่นยำ" : "Accuracy"}
                openMapLabel={locale === "th" ? "เปิดแผนที่" : "Open map"}
                manualButtonLabel={locale === "th" ? "แก้ไข GPS" : "Edit GPS"}
                manualTitleLabel={locale === "th" ? "แก้ไขพิกัด GPS" : "Edit GPS location"}
                latitudeLabel={locale === "th" ? "ละติจูด" : "Latitude"}
                longitudeLabel={locale === "th" ? "ลองจิจูด" : "Longitude"}
                saveManualLabel={locale === "th" ? "บันทึกพิกัด" : "Save GPS"}
                invalidCoordinateLabel={
                  locale === "th" ? "พิกัด GPS ไม่ถูกต้อง" : "Invalid GPS coordinates"
                }
                secureContextLabel={
                  locale === "th"
                    ? "ถ้าเปิดผ่าน IP แบบ http บางเครื่องจะจับ GPS ไม่ได้ ให้ใช้ HTTPS หรือกรอกพิกัดเอง"
                    : "GPS may require HTTPS on mobile browsers. You can enter coordinates manually."
                }
                />
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  {locale === "th"
                    ? "ระบบแผนที่/GPS ถูกปิดโดยผู้ดูแลระบบสูงสุด"
                    : "Maps/GPS has been disabled by the system owner."}
                </div>
              )}
            </section>

            <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center gap-2">
                <Images className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">{t.photosTitle}</h2>
              </div>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                {locale === "th"
                  ? "เพิ่มรูปทีละรายการ แต่ละรูปใส่คำอธิบายของตัวเองได้ และกดปุ่มเพิ่มรูปได้เรื่อยๆ"
                  : "Add one photo per row. Each image has its own caption, and you can add more rows as needed."}
              </p>
              <ReportPhotoFieldList
                addLabel={locale === "th" ? "เพิ่มรูป" : "Add photo"}
                captionLabel={locale === "th" ? "คำอธิบายรูป" : "Caption"}
                captionPlaceholder={
                  locale === "th"
                    ? "เช่น รูปเครื่องก่อนซ่อม, ป้าย serial, จุดติดตั้ง"
                    : "Example: before repair, serial label, installation point"
                }
                compressingLabel={locale === "th" ? "กำลังลดขนาดรูป..." : "Optimizing image..."}
                compressionFailedLabel={
                  locale === "th"
                    ? "ลดขนาดรูปไม่ได้ ระบบจะใช้ไฟล์เดิม"
                    : "Could not optimize. Original image will be used."
                }
                fileHint={
                  locale === "th"
                    ? "เลือกรูปจากเครื่องหรือเปิดกล้องมือถือได้"
                    : "Choose an image file or use the mobile camera."
                }
                fileLabel={t.photoFiles}
                optimizedLabel={locale === "th" ? "ลดขนาดแล้ว" : "Optimized"}
                originalLabel={locale === "th" ? "ใช้ไฟล์เดิม" : "Original image"}
                removeLabel={locale === "th" ? "ลบรูป" : "Remove photo"}
                tooLargeLabel={
                  locale === "th"
                    ? "รูปนี้ใหญ่เกิน 5MB กรุณาเลือกรูปใหม่หรือถ่ายใหม่"
                    : "This image is larger than 5 MB. Please choose or capture a smaller image."
                }
              />
            </section>

            <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center gap-2">
                <FileSignature className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">{t.signatures}</h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <label className="block">
                    <span className="flex items-center justify-between text-sm font-bold">
                      {t.customerName}
                      <span className="text-xs text-rose-500">{t.required}</span>
                    </span>
                    <input
                      name="customerName"
                      required
                      defaultValue={customerSigner}
                      className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold">{t.customerPosition}</span>
                    <input
                      name="customerPosition"
                      defaultValue={report.customer_contacts?.position || ""}
                      className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <SignaturePad
                    name="customerSignature"
                    label={t.customerSignature}
                    clearLabel={t.clearSignature}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-bold">{t.engineerName}</span>
                    <input
                      name="engineerName"
                      defaultValue={engineerName}
                      className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold">{t.engineerPosition}</span>
                    <input
                      name="engineerPosition"
                      defaultValue={report.engineers.position || ""}
                      className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                  <SignaturePad
                    name="engineerSignature"
                    label={t.engineerSignature}
                    clearLabel={t.clearSignature}
                  />
                </div>
              </div>
            </section>

            <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-[#f3f6fb]/90 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:mx-0 sm:rounded-xl sm:border sm:shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  name="submitIntent"
                  value="Draft"
                  formNoValidate
                  disabled={!canSubmit}
                  className="interactive-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
                >
                  <Save size={17} />
                  {locale === "th" ? "บันทึกร่าง" : "Save draft"}
                </button>
              <button
                type="submit"
                  name="submitIntent"
                  value="Submit"
                disabled={!canSubmit}
                className="interactive-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Save size={17} />
                {t.submit}
              </button>
              </div>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">{t.checklistTitle}</h2>
              </div>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {t.checklist.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <UserRound className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">{engineerName}</h2>
              </div>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p>
                  {t.serviceType}: {report.service_type}
                </p>
                <p>
                  {t.priority}: {report.priority || "Normal"}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </div>
    </div>
  );
}
