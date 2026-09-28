import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  FilePlus2,
  HardHat,
  Info,
  MapPin,
  Save,
  UserRound,
} from "lucide-react";
import DateTime24Field from "@/components/date-time-24-field";
import LanguageSwitcher from "@/components/language-switcher";
import ReportCustomerPicker from "@/components/report-customer-picker";
import ReportReferenceFields from "@/components/report-reference-fields";
import ThemeToggle from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { isFeatureEnabled, requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { createServiceReportAction } from "./actions";

export const dynamic = "force-dynamic";

const copy = {
  en: {
    backReports: "Service Jobs",
    title: "Create Job",
    subtitle: "Create the job header first. The technician can fill work details, photos, GPS, and signatures after opening the job.",
    controls: "Language and display",
    customerSection: "Customer information",
    jobSection: "Job details",
    engineerSection: "Job transfer / responsible user",
    customer: "Customer",
    site: "Site",
    contact: "Contact person",
    selectEngineer: "Select responsible user",
    serviceType: "Service type",
    priority: "Priority",
    projectNumber: "Project number",
    scheduledDate: "Scheduled date",
    dueDate: "Due date",
    dueDateTime: "Due date / time",
    engineer: "Responsible user",
    submit: "Create Job",
    required: "Required",
    optional: "Optional",
    unavailableTitle: "Master data is not ready",
    unavailableDetail:
      "Please add at least one customer and one active engineer before creating a report.",
    guideTitle: "How this works",
    guide: [
      "The system generates a job number automatically.",
      "Users open the job to fill service details and collect customer signature.",
      "Submitted jobs wait for admin approval.",
      "Status history and audit log are recorded automatically.",
    ],
    error: {
      required: "Please choose a customer and responsible user.",
      serviceType: "Service type is invalid.",
      priority: "Priority is invalid.",
      site: "Selected site does not belong to the selected customer.",
      contact: "Selected contact does not belong to the selected customer.",
      engineerProfile:
        "Your user account is not linked to an active engineer profile. Please contact an admin.",
      default: "Cannot create report. Please check the form and try again.",
    },
    priorities: {
      Low: "Low",
      Normal: "Normal",
      High: "High",
      Urgent: "Urgent",
    },
    placeholders: {
      projectNumber: "Optional project number",
    },
  },
  th: {
    backReports: "ใบงาน",
    title: "สร้างงาน",
    subtitle:
      "สร้างหัวใบงานก่อน จากนั้นผู้ใช้หรือช่างค่อยเข้าไปกรอกรายละเอียดงาน รูปภาพ พิกัด และลายเซ็นลูกค้า",
    controls: "ภาษาและการแสดงผล",
    customerSection: "ข้อมูลลูกค้า",
    jobSection: "ข้อมูลงาน",
    engineerSection: "ส่งต่องาน / ผู้รับผิดชอบ",
    customer: "ลูกค้า",
    site: "สถานที่",
    contact: "ผู้ติดต่อ",
    selectEngineer: "เลือกผู้รับผิดชอบ",
    serviceType: "ประเภทงาน",
    priority: "ความสำคัญ",
    projectNumber: "เลขที่โปรเจกต์",
    scheduledDate: "วันที่เริ่ม",
    dueDate: "กำหนดส่ง",
    dueDateTime: "กำหนดวันเวลา",
    engineer: "ผู้รับผิดชอบ",
    submit: "สร้างงาน",
    required: "จำเป็น",
    optional: "ไม่บังคับ",
    unavailableTitle: "ข้อมูลพื้นฐานยังไม่พร้อม",
    unavailableDetail:
      "กรุณาเพิ่มข้อมูลลูกค้าและช่างที่ใช้งานได้อย่างน้อยอย่างละ 1 รายการก่อนสร้างใบงาน",
    guideTitle: "ขั้นตอนหลังสร้าง",
    guide: [
      "ระบบจะออกเลขใบงานให้อัตโนมัติ",
      "ผู้ใช้เปิดใบงานเพื่อกรอกรายละเอียดและให้ลูกค้าเซ็นได้ทันที",
      "งานที่ส่งแล้วจะรอ admin อนุมัติ",
      "ระบบบันทึกประวัติสถานะและ audit log ให้อัตโนมัติ",
    ],
    error: {
      required: "กรุณาเลือกลูกค้าและผู้รับผิดชอบ",
      serviceType: "ประเภทงานไม่ถูกต้อง",
      priority: "ความสำคัญไม่ถูกต้อง",
      site: "สถานที่ที่เลือกไม่ได้อยู่ภายใต้ลูกค้าที่เลือก",
      contact: "ผู้ติดต่อที่เลือกไม่ได้อยู่ภายใต้ลูกค้าที่เลือก",
      default: "สร้างใบงานไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่",
    },
    priorities: {
      Low: "ต่ำ",
      Normal: "ปกติ",
      High: "สูง",
      Urgent: "เร่งด่วน",
    },
    placeholders: {
      projectNumber: "เลขที่โปรเจกต์ ถ้ามี",
    },
  },
} satisfies Record<Locale, object>;

const serviceTypes = ["PM", "Maintenance", "Installation", "Repair", "Emergency"] as const;
const priorities = ["Low", "Normal", "High", "Urgent"] as const;
const serviceTypeOptions = [
  ["PM", "ส่งมอบอุปกรณ์", "Delivered equipment"],
  ["Maintenance", "บริการหลังการขาย", "After-sales service"],
  ["Installation", "ติดตั้งอุปกรณ์", "Equipment installation"],
  ["Repair", "ตรวจสอบอุปกรณ์", "Equipment inspection"],
  ["Emergency", "อื่นๆ", "Other"],
] as const;

void serviceTypes;
void priorities;
void serviceTypeOptions;

const formatDateTimeInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
    
interface CreateReportPageProps {
  searchParams: RouteSearchParams;
}

export default async function CreateReportPage({
  searchParams,
}: CreateReportPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const currentUser = await requireUser(locale);
  await requireFeature({ key: "service_reports", user: currentUser, locale });
  const engineerAssignmentEnabled = await isFeatureEnabled("engineer_assignment");
  const t = copy[locale];
  const isAdmin = currentUser.roles.role_name === "admin";
  const errorKey = Array.isArray(params.error) ? params.error[0] : params.error;
  const errorMessage =
    errorKey && Object.prototype.hasOwnProperty.call(t.error, errorKey)
      ? t.error[errorKey as keyof typeof t.error]
      : errorKey
        ? t.error.default
        : null;

  const [customers, sites, engineers] = await Promise.all([
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
      take: 60,
    }),
    prisma.customer_sites.findMany({
      where: {
        is_active: true,
      },
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
      take: 80,
    }),
    prisma.engineers.findMany({
      where: {
        status: "Active",
      },
      select: {
        engineer_id: true,
        employee_id: true,
        first_name: true,
        last_name: true,
        users: {
          select: {
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        employee_id: "asc",
      },
    }),
  ]);

  const defaultEngineerId = isAdmin
    ? engineers[0]?.engineer_id ?? null
    : currentUser.engineers[0]?.engineer_id ?? engineers[0]?.engineer_id ?? null;
  const canCreate = customers.length > 0;
  const today = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
  }).format(new Date());
  const currentDateTime = formatDateTimeInput(new Date());

  return (
    <main className="animate-page min-h-screen bg-[#f3f6fb] px-4 py-5 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="animate-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href={withLocale("/reports", locale)}
                className="interactive-button mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300"
              >
                <ArrowLeft size={16} />
                {t.backReports}
              </Link>

              <div className="flex items-start gap-3">
                <div className="animate-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <FilePlus2 size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">
                    {t.title}
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3" aria-label={t.controls}>
              <LanguageSwitcher locale={locale} pathname="/reports/create" />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {errorMessage ? (
          <section className="animate-panel rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 shrink-0" size={17} />
              {errorMessage}
            </div>
          </section>
        ) : null}

        {!canCreate ? (
          <section className="animate-panel rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 shrink-0" size={20} />
              <div>
                <h2 className="font-bold">{t.unavailableTitle}</h2>
                <p className="mt-1 text-sm">{t.unavailableDetail}</p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <form action={createServiceReportAction} className="animate-panel space-y-5">
            <input type="hidden" name="lang" value={locale} />

            <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SectionHeader icon={<Building2 size={20} />} title={t.customerSection} />
              <ReportCustomerPicker
                customers={customers}
                sites={sites}
                locale={locale}
                searchUrl="/api/customers/search"
              />
            </section>

            <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SectionHeader icon={<ClipboardList size={20} />} title={t.jobSection} />

              <div className="grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="serviceType" value="Maintenance" />

                <ReportReferenceFields
                  locale={locale}
                  referenceTypeLabel={
                    locale === "th" ? "เลขอ้างอิงงาน" : "Job Reference"
                  }
                  quotationLabel={
                    locale === "th" ? "เลขที่ใบเสนอราคา" : "Quotation number"
                  }
                  projectLabel={locale === "th" ? "เลขที่โปรเจกต์" : "Project number"}
                  serviceCallLabel={locale === "th" ? "เลข Service call" : "Service call number"}
                  requiredLabel={t.required}
                  quotationOption={locale === "th" ? "ใบเสนอราคา" : "Quotation"}
                  projectOption={locale === "th" ? "เลขที่โปรเจกต์" : "Project"}
                  serviceCallOption={locale === "th" ? "เลข Service call" : "Service call number"}
                  quotationProjectOption={
                    locale === "th" ? "ใบเสนอราคา / เลขที่โปรเจกต์" : "Quotation / Project"
                  }
                  quotationServiceCallOption={
                    locale === "th" ? "ใบเสนอราคา / เลข Service call" : "Quotation / Service call"
                  }
                  projectServiceCallOption={
                    locale === "th" ? "เลขที่โปรเจกต์ / เลข Service call" : "Project / Service call"
                  }
                  quotationPlaceholder={
                    locale === "th" ? "เลขที่ใบเสนอราคา" : "Quotation number"
                  }
                  projectPlaceholder={locale === "th" ? "กรอกเลขที่โปรเจกต์" : "Enter project number"}
                  serviceCallPlaceholder={locale === "th" ? "กรอกเลข Service call" : "Enter service call number"}
                />

                <label className="block lg:col-span-2">
                  <span className="flex items-center justify-between text-sm font-bold">
                    {t.priority}
                    <span className="text-xs text-slate-400">{t.optional}</span>
                  </span>
                  <select
                    name="priority"
                    defaultValue="Normal"
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {t.priorities[priority]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2">
                  <DateTime24Field
                    name="scheduledDate"
                    label={t.scheduledDate}
                    defaultValue={currentDateTime}
                    locale={locale}
                  />

                  <DateTime24Field
                    name="dueDate"
                  label={locale === "th" ? "วันที่งานเสร็จสิ้น" : "Completion date / time"}
                    defaultValue={currentDateTime}
                    locale={locale}
                  />
                </div>
              </div>
            </section>

            {isAdmin && engineerAssignmentEnabled ? (
              <section className="interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <SectionHeader icon={<HardHat size={20} />} title={t.engineerSection} />

                <label className="block">
                  <span className="flex items-center justify-between text-sm font-bold">
                    {t.engineer}
                    <span className="text-xs text-slate-400">{t.optional}</span>
                  </span>
                  <select
                    name="engineerId"
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="">{t.selectEngineer}</option>
                    {engineers.map((engineer) => {
                      const engineerName =
                        [engineer.first_name, engineer.last_name].filter(Boolean).join(" ") ||
                        engineer.users.full_name ||
                        engineer.employee_id ||
                        engineer.users.email;

                      return (
                        <option key={engineer.engineer_id} value={engineer.engineer_id}>
                          {engineerName}
                          {engineer.employee_id ? ` (${engineer.employee_id})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </section>
            ) : defaultEngineerId ? (
              <input type="hidden" name="engineerId" value={defaultEngineerId} />
            ) : null}

            <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-[#f3f6fb]/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:mx-0 sm:rounded-xl sm:border sm:shadow-sm">
              <button
                type="submit"
                disabled={!canCreate}
                className="interactive-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Save size={17} />
                {t.submit}
              </button>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SectionHeader icon={<Info size={20} />} title={t.guideTitle} />
              <ul className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t.guide.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <UserRound className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">{currentUser.full_name || currentUser.email}</h2>
              </div>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <CalendarDays size={15} />
                  {today}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin size={15} />
                  e service system
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <span className="text-blue-700 dark:text-blue-300">{icon}</span>
      <h2 className="font-bold">{title}</h2>
    </div>
  );
}
