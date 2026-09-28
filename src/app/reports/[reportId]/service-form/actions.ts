"use server";

import { spawn } from "child_process";
import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

type ReviewStatus = "Approved";

const reviewStatuses: ReviewStatus[] = ["Approved"];

const readText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatSnapshotDate = (value: Date | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "-";

const renderRows = (
  rows: Array<{ line_no: number; service_type: string | null; service_detail: string | null; root_problem: string | null; resolution: string | null }>,
) =>
  rows.length
    ? rows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.line_no)}</td>
              <td>${escapeHtml(row.service_type || "-")}</td>
              <td>${escapeHtml(row.service_detail || "-")}</td>
              <td>${escapeHtml(row.root_problem || "-")}</td>
              <td>${escapeHtml(row.resolution || "-")}</td>
            </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" class="muted">No service details</td></tr>`;

const renderAssetRows = (
  rows: Array<{ line_no: number; brand: string | null; model: string | null; serial_number: string | null; installation_point: string | null; return_reason: string | null }>,
) =>
  rows.length
    ? rows
        .map((row) => {
          const name = [row.brand, row.model].filter(Boolean).join(" ") || "-";
          const serial = [
            row.installation_point,
            row.serial_number ? `S/N: ${row.serial_number}` : null,
            row.return_reason,
          ]
            .filter(Boolean)
            .join(" / ");

          return `
            <tr>
              <td>${escapeHtml(row.line_no)}</td>
              <td>${escapeHtml(name)}</td>
              <td>${escapeHtml(serial || "-")}</td>
            </tr>`;
        })
        .join("")
    : `<tr><td colspan="3" class="muted">No equipment rows</td></tr>`;

const createServiceReportSnapshot = async (
  reportId: string,
  uploadedBy: string,
) => {
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
      service_report_photos: {
        orderBy: {
          created_at: "asc",
        },
      },
      service_report_signs: {
        orderBy: {
          signed_at: "desc",
        },
      },
      satisfaction: true,
    },
  });

  if (!report) return;

  const snapshotDir = path.join(process.cwd(), "public", "uploads", "service-snapshots");
  await mkdir(snapshotDir, { recursive: true });

  const safeJobNumber = (report.job_number || report.report_id).replace(/[^A-Za-z0-9._-]+/g, "-");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${safeJobNumber}-${timestamp}.html`;
  const absolutePath = path.join(snapshotDir, fileName);
  const fileUrl = path.posix.join("/uploads/service-snapshots", fileName);
  const engineerName =
    [report.engineers.first_name, report.engineers.last_name].filter(Boolean).join(" ") ||
    report.engineers.users.full_name ||
    report.engineers.employee_id ||
    "-";
  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Service report snapshot ${escapeHtml(report.job_number)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, "Tahoma", sans-serif; color: #0f172a; margin: 0; background: #f8fafc; }
    main { max-width: 900px; margin: 0 auto; background: white; padding: 24px; }
    h1 { margin: 0; font-size: 24px; }
    h2 { margin: 24px 0 10px; font-size: 16px; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
    .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; }
    .label { color: #64748b; font-size: 12px; font-weight: 700; }
    .value { margin-top: 4px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #94a3b8; padding: 8px; vertical-align: top; }
    th { background: #e2e8f0; }
    .muted { color: #64748b; text-align: center; }
    .footer { margin-top: 24px; color: #64748b; font-size: 11px; }
  </style>
</head>
<body>
  <main>
    <h1>Job Snapshot</h1>
    <p class="muted">Generated at ${escapeHtml(formatSnapshotDate(new Date()))}</p>
    <section class="meta">
      <div class="box"><div class="label">Job No.</div><div class="value">${escapeHtml(report.job_number)}</div></div>
      <div class="box"><div class="label">Status</div><div class="value">${escapeHtml(report.status || "-")}</div></div>
      <div class="box"><div class="label">Customer</div><div class="value">${escapeHtml(report.customers.company_name)}</div></div>
      <div class="box"><div class="label">Site</div><div class="value">${escapeHtml(report.customer_sites?.site_name || report.customer_sites?.address || "-")}</div></div>
      <div class="box"><div class="label">Contact</div><div class="value">${escapeHtml(report.customer_contacts?.full_name || report.customers.contact_person || "-")}</div></div>
      <div class="box"><div class="label">Responsible user</div><div class="value">${escapeHtml(engineerName)}</div></div>
      <div class="box"><div class="label">Started</div><div class="value">${escapeHtml(formatSnapshotDate(report.start_time))}</div></div>
      <div class="box"><div class="label">Finished</div><div class="value">${escapeHtml(formatSnapshotDate(report.finish_time))}</div></div>
    </section>
    <h2>Service Details</h2>
    <table>
      <thead><tr><th>No.</th><th>Work topic</th><th>Work detail</th><th>Repair detail</th><th>Resolution</th></tr></thead>
      <tbody>${renderRows(report.service_report_items)}</tbody>
    </table>
    <h2>Installed / Delivered Equipment</h2>
    <table>
      <thead><tr><th>No.</th><th>Equipment</th><th>Point / Serial</th></tr></thead>
      <tbody>${renderAssetRows(report.service_report_assets.filter((asset) => asset.action_type !== "Returned"))}</tbody>
    </table>
    <h2>Returned Equipment</h2>
    <table>
      <thead><tr><th>No.</th><th>Equipment</th><th>Serial / Reason</th></tr></thead>
      <tbody>${renderAssetRows(report.service_report_assets.filter((asset) => asset.action_type === "Returned"))}</tbody>
    </table>
    <section class="meta">
      <div class="box"><div class="label">Photos</div><div class="value">${report.service_report_photos.length}</div></div>
      <div class="box"><div class="label">Signatures</div><div class="value">${report.service_report_signs.length}</div></div>
      <div class="box"><div class="label">Satisfaction</div><div class="value">${escapeHtml(report.satisfaction?.overall_score ?? "-")}</div></div>
      <div class="box"><div class="label">NPS</div><div class="value">${escapeHtml(report.satisfaction?.nps_score ?? "-")}</div></div>
    </section>
    <p class="footer">This snapshot was generated automatically when the report was approved.</p>
  </main>
</body>
</html>`;

  await writeFile(absolutePath, html, "utf8");
  const fileStats = await stat(absolutePath);

  await prisma.$transaction(async (tx) => {
    const file = await tx.uploaded_files.create({
      data: {
        file_category: "Export",
        file_url: fileUrl,
        original_name: fileName,
        mime_type: "text/html; charset=utf-8",
        size_bytes: BigInt(fileStats.size),
        uploaded_by: uploadedBy,
      },
    });

    await tx.service_report_attachments.create({
      data: {
        report_id: reportId,
        file_id: file.file_id,
        attachment_type: "Document",
        note: "Auto snapshot generated when the service report was approved.",
      },
    });
  });
};

const backupReportSnapshot = (reportId: string, jobNumber: string | null, status: ReviewStatus) => {
  const scriptPath = path.join(process.cwd(), "scripts", "backup-system.mjs");
  const safeJobNumber = (jobNumber || reportId).replace(/[^A-Za-z0-9._-]+/g, "-");
  const tag = `service-report-${safeJobNumber}-${status.toLowerCase()}`;
  const child = spawn(
    process.execPath,
    [scriptPath, "--backup-root=backups/service-reports", `--tag=${tag}`],
    {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      stdio: "ignore",
      detached: true,
    },
  );

  child.on("error", (error) => {
    console.error("Service report backup failed to start", error);
  });
  child.unref();
};

export async function reviewServiceReportAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);
  await requireFeature({ key: "service_reports", user, locale });
  const reportId = readText(formData, "reportId");
  const reviewAction = readText(formData, "reviewAction") as ReviewStatus;
  const reviewNote = readText(formData, "reviewNote");

  if (!reportId) redirect(withLocale("/reports/create", locale));

  const roleName = user.roles.role_name;
  const canReview = roleName === "admin";
  if (!canReview) redirect(withLocale("/reports", locale));
  if (!reviewStatuses.includes(reviewAction)) {
    redirect(withLocale(`/reports/${reportId}/service-form`, locale));
  }

  const report = await prisma.service_reports.findUnique({
    where: {
      report_id: reportId,
    },
    include: {
      engineers: true,
    },
  });

  if (!report) redirect(withLocale("/reports/create", locale));

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.service_reports.update({
      where: {
        report_id: reportId,
      },
      data: {
        status: reviewAction,
        reviewed_at: now,
        reviewed_by: user.user_id,
        review_note: reviewNote || null,
      },
    });

    await tx.service_report_status_history.create({
      data: {
        report_id: reportId,
        from_status: report.status,
        to_status: reviewAction,
        changed_by: user.user_id,
        note: reviewNote || `Admin review: ${reviewAction}`,
      },
    });

    await tx.audit_logs.create({
      data: {
        user_id: user.user_id,
        action: "review_service_report",
        table_name: "service_reports",
        record_id: reportId,
        new_data: JSON.stringify({
          status: reviewAction,
          reviewNote: reviewNote || null,
        }),
      },
    });

    if (report.engineers.user_id) {
      await tx.notifications.create({
        data: {
          user_id: report.engineers.user_id,
          notification_type: "Report_Approved",
          title: `Service report ${reviewAction}: ${report.job_number}`,
          body: reviewNote || null,
          link_url: withLocale(`/reports/${reportId}/work`, locale),
        },
      });
    }
  });

  if (reviewAction === "Approved") {
    try {
      await createServiceReportSnapshot(reportId, user.user_id);
    } catch (snapshotError) {
      console.error("Service report snapshot failed", snapshotError);
    }

    backupReportSnapshot(reportId, report.job_number, reviewAction);

    try {
      await prisma.audit_logs.create({
        data: {
          user_id: user.user_id,
          action: "service_report_backup_queued",
          table_name: "system_backup",
          record_id: reportId,
          new_data: JSON.stringify({
            jobNumber: report.job_number,
            status: reviewAction,
            backupRoot: "backups/service-reports",
          }),
        },
      });
    } catch (auditError) {
      console.error("Service report backup audit log failed", auditError);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/technician/jobs");
  revalidatePath(`/reports/${reportId}/service-form`);
  redirect(
    `${withLocale(`/reports/${reportId}/service-form`, locale)}&review=${reviewAction}`,
  );
}
