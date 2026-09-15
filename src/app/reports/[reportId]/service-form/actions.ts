"use server";

import { spawn } from "child_process";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

type ReviewStatus = "Approved" | "Need_Revision" | "Closed";

const reviewStatuses: ReviewStatus[] = ["Approved", "Need_Revision", "Closed"];

const readText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

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
          notification_type:
            reviewAction === "Need_Revision"
              ? "Report_Need_Revision"
              : "Report_Approved",
          title: `Service report ${reviewAction}: ${report.job_number}`,
          body: reviewNote || null,
          link_url: withLocale(`/reports/${reportId}/work`, locale),
        },
      });
    }
  });

  if (reviewAction === "Approved" || reviewAction === "Closed") {
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
