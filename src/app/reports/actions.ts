"use server";

import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const USER_DELETABLE_STATUSES = new Set([
  "Draft",
  "Open",
  "Assigned",
  "In_Progress",
  "On_Site",
  "Pending_Customer",
  "Need_Revision",
]);

const publicUploadsRoot = path.resolve(process.cwd(), "public", "uploads");

const toSafeUploadPath = (fileUrl: string | null | undefined) => {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) return null;

  const absolutePath = path.resolve(process.cwd(), "public", fileUrl.slice(1));
  const insideUploads =
    absolutePath === publicUploadsRoot ||
    absolutePath.startsWith(`${publicUploadsRoot}${path.sep}`);

  return insideUploads ? absolutePath : null;
};

const deleteUploadFiles = async (fileUrls: Iterable<string>) => {
  await Promise.all(
    [...fileUrls].map(async (fileUrl) => {
      const filePath = toSafeUploadPath(fileUrl);
      if (!filePath) return;

      try {
        await unlink(filePath);
      } catch {
        // The database delete already succeeded. Missing files should not break the user flow.
      }
    }),
  );
};

export async function deleteServiceReportAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);
  await requireFeature({ key: "service_reports", user, locale });
  const reportId = String(formData.get("reportId") ?? "").trim();

  if (!reportId) redirect(withLocale("/reports", locale));

  const report = await prisma.service_reports.findUnique({
    where: {
      report_id: reportId,
    },
    select: {
      report_id: true,
      job_number: true,
      created_by: true,
      status: true,
      customer_signature_url: true,
      engineer_signature_url: true,
    },
  });

  if (!report) redirect(withLocale("/reports", locale));

  const isAdmin = user.roles.role_name === "admin";
  const isCreator = report.created_by === user.user_id;
  const canUserDelete =
    isCreator &&
    report.status !== null &&
    USER_DELETABLE_STATUSES.has(report.status);

  if (!isAdmin && !canUserDelete) {
    redirect(`${withLocale("/reports", locale)}&error=delete_forbidden`);
  }

  const [photos, signatures, attachments] = await Promise.all([
    prisma.service_report_photos.findMany({
      where: {
        report_id: reportId,
      },
      select: {
        file_id: true,
        file_url: true,
        uploaded_files: {
          select: {
            file_url: true,
          },
        },
      },
    }),
    prisma.service_report_signatures.findMany({
      where: {
        report_id: reportId,
      },
      select: {
        file_id: true,
        signature_url: true,
        uploaded_files: {
          select: {
            file_url: true,
          },
        },
      },
    }),
    prisma.service_report_attachments.findMany({
      where: {
        report_id: reportId,
      },
      select: {
        file_id: true,
        uploaded_files: {
          select: {
            file_url: true,
          },
        },
      },
    }),
  ]);
  const uploadedFileIds = new Set<number>();
  const fileUrls = new Set<string>();

  if (report.customer_signature_url) fileUrls.add(report.customer_signature_url);
  if (report.engineer_signature_url) fileUrls.add(report.engineer_signature_url);

  for (const photo of photos) {
    if (photo.file_id !== null) uploadedFileIds.add(photo.file_id);
    if (photo.file_url) fileUrls.add(photo.file_url);
    if (photo.uploaded_files?.file_url) fileUrls.add(photo.uploaded_files.file_url);
  }
  for (const signature of signatures) {
    if (signature.file_id !== null) uploadedFileIds.add(signature.file_id);
    if (signature.signature_url) fileUrls.add(signature.signature_url);
    if (signature.uploaded_files?.file_url) {
      fileUrls.add(signature.uploaded_files.file_url);
    }
  }
  for (const attachment of attachments) {
    uploadedFileIds.add(attachment.file_id);
    if (attachment.uploaded_files?.file_url) {
      fileUrls.add(attachment.uploaded_files.file_url);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.audit_logs.create({
      data: {
        user_id: user.user_id,
        action: "delete_service_report",
        table_name: "service_reports",
        record_id: report.report_id,
        old_data: JSON.stringify({
          jobNumber: report.job_number,
          status: report.status,
        }),
      },
    });

    await tx.service_report_assets.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_attachments.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_check_results.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_comments.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_locations.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_photos.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_satisfaction.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_signatures.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_status_history.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_topics.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_time_logs.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_assignments.deleteMany({ where: { report_id: reportId } });
    await tx.service_report_items.deleteMany({ where: { report_id: reportId } });
    await tx.report_equipment.deleteMany({ where: { report_id: reportId } });
    await tx.inventory_movements.deleteMany({ where: { report_id: reportId } });

    if (uploadedFileIds.size > 0) {
      await tx.uploaded_files.deleteMany({
        where: {
          file_id: {
            in: [...uploadedFileIds],
          },
        },
      });
    }

    await tx.service_reports.delete({
      where: {
        report_id: reportId,
      },
    });
  });

  await deleteUploadFiles(fileUrls);

  revalidatePath("/reports");
  revalidatePath("/dashboard");
  redirect(`${withLocale("/reports", locale)}&deleted=1`);
}
