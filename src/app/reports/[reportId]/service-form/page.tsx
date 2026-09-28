/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, FileText, PenLine } from "lucide-react";
import PrintButton from "@/components/print-button";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { normalizeUploadUrl } from "@/lib/upload-urls";
import { reviewServiceReportAction } from "./actions";

export const dynamic = "force-dynamic";

const copy = {
  en: {
    backReports: "Jobs",
    editWork: "Back to edit",
    print: "Print / Save PDF",
    snapshot: "Open snapshot",
    reviewTitle: "Review service report",
    reviewNote: "Review note",
    reviewPlaceholder: "Optional note for technician or admin records...",
    approve: "Approve",
    needRevision: "Need revision",
    closeJob: "Close job",
    reviewOnly: "Admin and manager accounts can review this service report.",
    currentStatus: "Current status",
    historyTitle: "Work history",
    changedBy: "Changed by",
    reviewedSuccess: "Review status saved.",
    title: "Customer Service Order Form",
    subtitle: "Service original / customer original",
    companyName: "SIAM E BUSINESS LTD., PART",
    companyAddress:
      "602/109 Moo 6, Khlong Kum, Bueng Kum, Bangkok 10230",
    customer: "Customer",
    address: "Address",
    contact: "Contact",
    tel: "Tel.",
    jobNo: "Job No.",
    projectNo: "Project No.",
    dateIssue: "Date issue",
    started: "Started",
    finished: "Finished",
    serviceCall: "Work topics",
    detailsTitle: "Details of service / Root problem / Resolution",
    no: "No.",
    detail: "Details of service",
    amount: "Amount",
    rootProblem: "Root problem",
    resolution: "Resolution",
    problemResolution: "Root problem / Resolution",
    installedTitle: "Installed / Delivered Equipment",
    returnedTitle: "Returned / Collected Equipment",
    equipment: "Equipment (Brand / Model)",
    serialInstall: "Installation point & Serial Number",
    serialReturn: "Serial Number & reason for return",
    remark: "Remark",
    freeService: "Free Service",
    charged: "Service Charge",
    other: "Other",
    satisfaction: "Service Satisfaction Survey",
    responsiveness: "Responsiveness / Timeliness",
    knowledge: "Staff Competence & Professionalism",
    communication: "Courtesy & Communication",
    solution: "Problem Resolution & Quality",
    overall: "Overall Satisfaction",
    comment: "Comment",
    engineerSignature: "On site service by",
    customerSignature: "Customer",
    printName: "Print name",
    position: "Position",
    noData: "-",
    photosTitle: "On-site photos",
  },
  th: {
    backReports: "ใบเซอร์วิซ",
    editWork: "กลับไปแก้ไข",
    print: "พิมพ์ / บันทึก PDF",
    snapshot: "เปิด snapshot",
    reviewTitle: "ตรวจสอบใบเซอร์วิซ",
    reviewNote: "หมายเหตุการตรวจสอบ",
    reviewPlaceholder: "หมายเหตุถึงช่างหรือบันทึกสำหรับแอดมิน ถ้ามี...",
    approve: "อนุมัติ",
    needRevision: "ส่งกลับแก้ไข",
    closeJob: "ปิดงาน",
    reviewOnly: "บัญชีแอดมินและผู้จัดการสามารถตรวจสอบใบเซอร์วิซนี้ได้",
    currentStatus: "สถานะปัจจุบัน",
    historyTitle: "ประวัติการทำงาน",
    changedBy: "ผู้ดำเนินการ",
    reviewedSuccess: "บันทึกผลการตรวจสอบแล้ว",
    title: "ใบบันทึกการให้บริการ",
    subtitle: "ต้นฉบับลูกค้า / Customer Original",
    companyName: "ห้างหุ้นส่วนจำกัด สยามอีบิซิเนส",
    companyAddress:
      "602/109 หมู่ 6 แขวงคลองกุ่ม เขตบึงกุ่ม กรุงเทพฯ 10230",
    customer: "ลูกค้า",
    address: "ที่อยู่",
    contact: "ผู้ติดต่อ",
    tel: "โทรศัพท์",
    jobNo: "เลขที่งาน",
    projectNo: "เลขโปรเจกต์",
    dateIssue: "วันที่ออกใบงาน",
    started: "เริ่มงาน",
    finished: "เสร็จงาน",
    serviceCall: "หัวข้องาน",
    detailsTitle: "รายละเอียดการให้บริการ / สาเหตุของปัญหา / วิธีแก้ไข",
    no: "ลำดับ",
    detail: "รายละเอียดการให้บริการ",
    amount: "จำนวน",
    rootProblem: "สาเหตุของปัญหา",
    resolution: "วิธีแก้ไข",
    problemResolution: "สาเหตุของปัญหา / วิธีแก้ไข",
    installedTitle: "รายการอุปกรณ์ที่ติดตั้ง / ส่งมอบ",
    returnedTitle: "รายการอุปกรณ์ที่เก็บกลับ",
    equipment: "รายการอุปกรณ์ (ยี่ห้อ / รุ่น)",
    serialInstall: "จุดติดตั้ง และหมายเลขเครื่อง",
    serialReturn: "หมายเลขเครื่อง และเหตุผลที่นำกลับ",
    remark: "หมายเหตุ",
    freeService: "ไม่มีค่าบริการ",
    charged: "มีค่าบริการ",
    other: "อื่นๆ",
    satisfaction: "ประเมินความพึงพอใจในการให้บริการ",
    responsiveness: "ความรวดเร็ว / ตรงต่อเวลาในการให้บริการ",
    knowledge: "ความรู้ความเชี่ยวชาญของเจ้าหน้าที่",
    communication: "ความสุภาพ มารยาท และการสื่อสาร",
    solution: "ผลการแก้ไขปัญหา / คุณภาพงาน",
    overall: "ความพึงพอใจโดยรวมต่อการบริการ",
    comment: "ข้อเสนอแนะ",
    engineerSignature: "ผู้ให้บริการ",
    customerSignature: "ลูกค้า",
    printName: "ชื่อตัวบรรจง",
    position: "ตำแหน่ง",
    noData: "-",
    photosTitle: "รูปถ่ายหน้างาน",
  },
} satisfies Record<Locale, object>;

interface ServiceFormPageProps {
  params: Promise<{
    reportId: string;
  }>;
  searchParams: RouteSearchParams;
}

const formatDateTime = (date: Date | null, locale: Locale, fallback: string) => {
  if (!date) return fallback;

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
};

const formatDate = (date: Date | null, locale: Locale, fallback: string) => {
  if (!date) return fallback;

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const scoreStars = (score: number | null | undefined) =>
  Array.from({ length: 5 }, (_, index) => (score && score > index ? "★" : "☆")).join(" ");

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

type ReportAssetRow = {
  item_line_no: number | null;
  action_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  installation_point: string | null;
  return_reason: string | null;
};

const summarizeAssetsForItem = (
  assets: ReportAssetRow[],
  itemLineNo: number,
  fallback: string,
) => {
  const matchingAssets = assets.filter((asset) => asset.item_line_no === itemLineNo);
  const rows = matchingAssets.length > 0 ? matchingAssets : [];
  const grouped = new Map<
    string,
    {
      actionType: string;
      equipment: string;
      installationPoint: string | null;
      returnReason: string | null;
      serialNumbers: string[];
    }
  >();

  for (const asset of rows) {
    const equipment = [asset.brand, asset.model].filter(Boolean).join(" / ") || fallback;
    const key = [
      asset.action_type,
      equipment,
      asset.installation_point || "",
      asset.return_reason || "",
    ].join("\u001f");
    const current =
      grouped.get(key) ??
      {
        actionType: asset.action_type,
        equipment,
        installationPoint: asset.installation_point || null,
        returnReason: asset.return_reason || null,
        serialNumbers: [],
      };

    if (asset.serial_number) current.serialNumbers.push(asset.serial_number);
    grouped.set(key, current);
  }

  const summary = Array.from(grouped.values()).map((group) =>
    [
      group.actionType,
      group.equipment,
      group.installationPoint,
      group.serialNumbers.length > 0 ? `S/N: ${group.serialNumbers.join(", ")}` : null,
      group.returnReason,
    ]
      .filter(Boolean)
      .join(" / "),
  );

  return summary.length > 0 ? summary.join("\n") : fallback;
};

const statusTone = (status: string | null) => {
  switch (status) {
    case "Approved":
    case "Closed":
    case "Completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Submitted":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "Need_Revision":
    case "Cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-blue-50 text-blue-700 ring-blue-200";
  }
};

export default async function ServiceFormPage({
  params,
  searchParams,
}: ServiceFormPageProps) {
  const [{ reportId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const locale = getLocale(rawSearchParams.lang);
  const currentUser = await requireUser(locale);
  await requireFeature({ key: "service_reports", user: currentUser, locale });
  const t = copy[locale];
  const reviewResult = Array.isArray(rawSearchParams.review)
    ? rawSearchParams.review[0]
    : rawSearchParams.review;

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
      service_report_signs: {
        include: {
          uploaded_files: true,
        },
        orderBy: {
          signed_at: "desc",
        },
      },
      service_report_photos: {
        include: {
          uploaded_files: true,
        },
        orderBy: {
          created_at: "asc",
        },
      },
      service_report_attachments: {
        include: {
          uploaded_files: true,
        },
        orderBy: {
          created_at: "desc",
        },
      },
      service_report_topics: {
        orderBy: {
          id: "asc",
        },
      },
      service_report_status_history: {
        include: {
          users: {
            select: {
              full_name: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
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

  const roleName = currentUser.roles.role_name;
  const canReview = roleName === "admin";
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

  if (!canReview && !isCreator && !isAssignedEngineer && !isAssignedByHandoff) {
    redirect(withLocale("/reports/create", locale));
  }

  const engineerName =
    [report.engineers.first_name, report.engineers.last_name]
      .filter(Boolean)
      .join(" ") ||
    report.engineers.users.full_name ||
    report.engineers.employee_id ||
    report.engineers.users.email;
  const customerAddress =
    report.customer_sites?.address || report.customers.address || t.noData;
  const customerPhone =
    report.customer_contacts?.phone ||
    report.customer_sites?.phone ||
    report.customers.phone ||
    t.noData;
  const customerContact =
    report.customer_contacts?.full_name || report.customers.contact_person || t.noData;
  const customerSignature =
    report.service_report_signs.find((sign) => sign.signer_type === "Customer") ??
    null;
  const engineerSignature =
    report.service_report_signs.find((sign) => sign.signer_type === "Engineer") ??
    null;
  const serviceItems = report.service_report_items;
  const latestSnapshot = report.service_report_attachments.find((attachment) =>
    attachment.uploaded_files?.file_url.includes("/service-snapshots/"),
  );

  return (
    <main className="service-print-bg min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6">
      <div className="print-hidden mx-auto mb-5 max-w-5xl space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={withLocale(roleName === "admin" ? "/reports" : "/technician/jobs", locale)}
            className="interactive-button inline-flex items-center gap-2 text-sm font-bold text-blue-700"
          >
            <ArrowLeft size={16} />
            {t.backReports}
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row">
            {latestSnapshot?.uploaded_files?.file_url ? (
              <Link
                href={latestSnapshot.uploaded_files.file_url}
                className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
              >
                <FileText size={16} />
                {t.snapshot}
              </Link>
            ) : null}
            <Link
              href={withLocale(`/reports/${report.report_id}/work`, locale)}
              className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 text-sm font-bold text-blue-700 hover:bg-blue-50"
            >
              <PenLine size={16} />
              {t.editWork}
            </Link>
            <PrintButton label={t.print} />
          </div>
        </div>

        {reviewResult ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {t.reviewedSuccess}
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold">{t.reviewTitle}</h2>
              <p className="mt-1 text-xs text-slate-500">{t.reviewOnly}</p>
            </div>
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone(
                report.status,
              )}`}
            >
              {t.currentStatus}: {report.status || "-"}
            </span>
          </div>

          <form action={reviewServiceReportAction} className="space-y-3">
            <input type="hidden" name="lang" value={locale} />
            <input type="hidden" name="reportId" value={report.report_id} />
            <label className="block">
              <span className="text-sm font-bold">{t.reviewNote}</span>
              <textarea
                name="reviewNote"
                rows={2}
                defaultValue={report.review_note || ""}
                placeholder={t.reviewPlaceholder}
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400"
                disabled={!canReview}
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                name="reviewAction"
                value="Approved"
                disabled={!canReview}
                className="interactive-button inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {t.approve}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 size={17} className="text-blue-700" />
            <h2 className="font-bold">{t.historyTitle}</h2>
          </div>
          <div className="space-y-3">
            {report.service_report_status_history.length === 0 ? (
              <p className="text-sm text-slate-500">{t.noData}</p>
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
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-bold">
                        {`${history.from_status || "-"} -> ${history.to_status}`}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {formatDateTime(history.created_at, locale, t.noData)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {t.changedBy}: {actor}
                    </p>
                    {history.note ? (
                      <p className="mt-2 text-xs text-slate-500">{history.note}</p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="overflow-x-auto pb-4 print:overflow-visible print:pb-0">
      <section className="service-sheet mx-auto min-h-[297mm] w-full min-w-[760px] max-w-5xl bg-white p-6 text-[11px] leading-tight shadow-xl ring-1 ring-slate-200 sm:p-8 print:p-0 print:text-[9px]">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-300">
              <img
                src="/logo.png"
                alt="e service logo"
                className="h-[34px] w-[34px] object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">FM-SC02-01</p>
              <h1 className="mt-1 text-lg font-bold">{t.companyName}</h1>
              <p className="font-semibold uppercase text-slate-600">
                SIAM E BUSINESS LTD., PART
              </p>
              <p className="mt-1 max-w-md text-slate-500">{t.companyAddress}</p>
            </div>
          </div>

          <div className="w-56 rounded-lg border border-slate-500 p-3 text-center">
            <FileText className="mx-auto mb-1" size={18} />
            <p className="text-sm font-bold">{t.title}</p>
            <p className="text-[10px] text-slate-500">{t.subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 border border-slate-500">
          <div className="space-y-0 border-r border-slate-500">
            <Line label={t.customer} value={report.customers.company_name} />
            <Line label={t.address} value={customerAddress} />
            <Line label={t.contact} value={customerContact} />
            <Line label={t.tel} value={customerPhone} />
          </div>
          <div>
            <Line label={t.jobNo} value={report.job_number} strong />
            <Line
              label={locale === "th" ? "ใบเสนอราคา" : "Quotation"}
              value={report.quotation_number || t.noData}
            />
            <Line label={t.projectNo} value={report.project_number || t.noData} />
            <Line
              label={locale === "th" ? "เลข Service call" : "Service call"}
              value={report.service_call_number || t.noData}
            />
            <Line
              label={t.dateIssue}
              value={formatDate(report.date_issued, locale, t.noData)}
            />
            <Line
              label={t.started}
              value={formatDateTime(report.start_time, locale, t.noData)}
            />
            <Line
              label={t.finished}
              value={formatDateTime(report.finish_time, locale, t.noData)}
            />
          </div>
        </div>

        <TableBlock
          title={locale === "th" ? "รายละเอียดงานและอุปกรณ์" : "Work details and equipment"}
          headers={[
            t.no,
            locale === "th" ? "หัวข้องาน" : "Work topic",
            locale === "th" ? "ไปทำอะไร" : "Work detail",
            locale === "th" ? "ซ่อมอะไร" : "Repair detail",
            locale === "th" ? "เอาอะไรไป/กลับ" : "Equipment delivered/returned",
          ]}
          rows={serviceItems.map((item, index) => [
            String(index + 1),
            serviceTypeLabel(item.service_type, locale, t.noData),
            item.service_detail || t.noData,
            [item.root_problem, item.resolution].filter(Boolean).join(" / ") ||
              t.noData,
            summarizeAssetsForItem(
              report.service_report_assets,
              item.line_no,
              t.noData,
            ),
          ])}
          minRows={0}
        />

        <div className="mt-3 border border-slate-500 p-3 print:mt-1.5 print:p-1.5">
          <p className="mb-2 text-sm font-bold">{t.remark}</p>
          <div className="flex flex-wrap gap-5">
            <CheckBox checked={report.charge_type === "Free_Service"} label={t.freeService} />
            <CheckBox checked={report.charge_type === "Charged"} label={t.charged} />
            <CheckBox checked={report.charge_type === "Other"} label={t.other} />
          </div>
          {report.recommendation ? (
            <p className="mt-2 text-slate-600">{report.recommendation}</p>
          ) : null}
          {report.service_fee || report.other_charge_note ? (
            <p className="mt-2 text-slate-600">
              {[report.service_fee ? `${report.service_fee.toString()} THB` : null, report.other_charge_note]
                .filter(Boolean)
                .join(" / ")}
            </p>
          ) : null}
        </div>

        {report.service_report_photos.length > 0 ? (
          <div className="service-photo-section mt-3 border border-slate-500">
            <div className="bg-slate-800 px-3 py-2 text-sm font-bold text-white print:px-2 print:py-1 print:text-[10px]">
              {t.photosTitle}
            </div>
            <div className="service-photo-grid grid grid-cols-4 gap-2 p-3">
              {report.service_report_photos.slice(0, 4).map((photo) => {
                const photoUrl = normalizeUploadUrl(
                  photo.file_url || photo.uploaded_files?.file_url,
                );

                return (
                <div key={photo.photo_id}>
                  <div className="service-photo-frame relative h-24 border border-slate-300 bg-white">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={`${photo.photo_type} photo`}
                        className="h-full w-full object-contain"
                      />
                    ) : null}
                  </div>
                  <p className="mt-1 text-center text-[10px] font-bold">
                    {photo.photo_type.replace("_", " ")}
                  </p>
                </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="service-signature-grid mt-5 grid grid-cols-2 gap-5">
          <SignatureBox
            title={t.engineerSignature}
            imageUrl={
              engineerSignature?.signature_url ||
              engineerSignature?.uploaded_files?.file_url ||
              report.engineer_signature_url
            }
            name={engineerSignature?.signer_name || engineerName}
            position={engineerSignature?.signer_position || report.engineers.position}
            printNameLabel={t.printName}
            positionLabel={t.position}
          />
          <SignatureBox
            title={t.customerSignature}
            imageUrl={
              customerSignature?.signature_url ||
              customerSignature?.uploaded_files?.file_url ||
              report.customer_signature_url
            }
            name={customerSignature?.signer_name || customerContact}
            position={customerSignature?.signer_position || report.customer_contacts?.position}
            printNameLabel={t.printName}
            positionLabel={t.position}
          />
        </div>

        <div className="service-rating-section mt-3 border border-slate-500">
          <div className="bg-slate-800 px-3 py-2 text-sm font-bold text-white print:px-2 print:py-1 print:text-[10px]">
            {t.satisfaction}
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-0">
            {[
              [
                locale === "th"
                  ? "การตรงต่อเวลา มารยาท ความสะอาด"
                  : "Punctuality, courtesy, cleanliness",
                report.satisfaction?.responsiveness_score,
              ],
              [
                locale === "th"
                  ? "การแก้ไขปัญหาอย่างถูกต้อง"
                  : "Correct problem resolution",
                report.satisfaction?.problem_solution_score,
              ],
            ].map(([label, score]) => (
              <div key={String(label)} className="contents">
                <div className="border-b border-slate-300 px-3 py-2">{label}</div>
                <div className="border-b border-slate-300 px-3 py-2 text-right text-slate-500">
                  {scoreStars(Number(score || 0))}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[150px_1fr]">
            <div className="px-3 py-2 font-bold">{t.comment}</div>
            <div className="px-3 py-2">
              {report.satisfaction?.customer_comment || t.noData}
            </div>
          </div>
        </div>

        <div className="service-footer mt-5 bg-slate-800 px-4 py-2 text-center text-xs font-semibold text-white">
          e service • e-mail : service@example.com
        </div>
      </section>
      </div>
    </main>
  );
}

function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="service-line grid grid-cols-[95px_1fr] border-b border-slate-300 last:border-b-0">
      <div className="service-line-label bg-slate-50 px-2 py-2 font-bold">{label}</div>
      <div className={`service-line-value px-2 py-2 ${strong ? "font-bold" : ""}`}>{value}</div>
    </div>
  );
}

const columnClass = (columnCount: number, index: number) => {
  if (columnCount === 6) {
    if (index === 0) return "w-10";
    if (index === 1) return "w-28";
    if (index === 5) return "w-14";

    return "";
  }

  if (columnCount === 5) {
    if (index === 0) return "w-12";
    if (index === 1) return "w-32";
    if (index === 2) return "w-16";

    return "";
  }

  if (index === 0) return "w-12";
  if (index === 2) return "w-20";

  return "";
};

function TableBlock({
  title,
  headers,
  rows,
  minRows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  minRows: number;
}) {
  const visibleRows =
    rows.length >= minRows
      ? rows
      : [
          ...rows,
          ...Array.from({ length: minRows - rows.length }, (_, index) => [
            String(rows.length + index + 1),
            ...Array.from({ length: Math.max(headers.length - 1, 0) }, () => ""),
          ]),
        ];

  return (
    <div className="service-table-block mt-3 border border-slate-500">
      <div className="bg-slate-800 px-3 py-2 text-sm font-bold text-white print:px-2 print:py-1 print:text-[10px]">
        {title}
      </div>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="bg-slate-100">
            {headers.map((header, index) => (
              <th
                key={header}
                className={`border border-slate-400 px-2 py-2 text-center font-bold ${columnClass(headers.length, index)}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`}>
              {row.map((cell, index) => (
                <td
                  key={`${cell}-${index}`}
                  className={`service-table-cell h-12 whitespace-pre-line border border-slate-400 px-2 py-2 align-top ${
                    index === 0 || index === row.length - 1 ? "text-center" : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckBox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-4 w-4 items-center justify-center border border-slate-600 text-[10px]">
        {checked ? "\u2713" : ""}
      </span>
      {label}
    </span>
  );
}

function SignatureBox({
  title,
  imageUrl,
  name,
  position,
  printNameLabel,
  positionLabel,
}: {
  title: string;
  imageUrl?: string | null;
  name?: string | null;
  position?: string | null;
  printNameLabel: string;
  positionLabel: string;
}) {
  const normalizedImageUrl = normalizeUploadUrl(imageUrl);

  return (
    <div className="text-center">
      <div className="service-signature-image relative mb-2 h-24 rounded-lg border border-slate-300">
        {normalizedImageUrl ? (
          <img
            src={normalizedImageUrl}
            alt={`${title} signature`}
            className="h-full w-full object-contain p-2"
          />
        ) : null}
      </div>
      <p className="font-bold">{title}</p>
      <div className="mt-3 border-b border-slate-500 pb-1">
        {name || ""}
      </div>
      <p className="mt-1 text-[10px] text-slate-500">{printNameLabel}</p>
      <div className="mt-3 border-b border-slate-500 pb-1">
        {position || ""}
      </div>
      <p className="mt-1 text-[10px] text-slate-500">{positionLabel}</p>
    </div>
  );
}
