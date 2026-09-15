"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const priorities = ["Low", "Normal", "High", "Urgent"] as const;

const readText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function updateTechnicianReportPriorityAction(formData: FormData) {
  const locale = getLocale(readText(formData, "lang") || "en");
  const user = await requireUser(locale);
  const reportId = readText(formData, "reportId");
  const priority = readText(formData, "priority") as (typeof priorities)[number];

  if (!reportId || !priorities.includes(priority)) {
    return;
  }

  const isAdmin = user.roles.role_name === "admin";
  const engineerIds = user.engineers.map((engineer) => engineer.engineer_id);
  const report = await prisma.service_reports.findFirst({
    where: {
      report_id: reportId,
      OR: isAdmin
        ? undefined
        : [
            {
              created_by: user.user_id,
            },
            {
              engineer_id: {
                in: engineerIds.length > 0 ? engineerIds : [-1],
              },
            },
          ],
    },
    select: {
      report_id: true,
      priority: true,
      status: true,
    },
  });

  if (!report || report.priority === priority) {
    return;
  }

  if (["Closed", "Cancelled"].includes(String(report.status))) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.service_reports.update({
      where: {
        report_id: report.report_id,
      },
      data: {
        priority,
      },
    });

    await tx.audit_logs.create({
      data: {
        user_id: user.user_id,
        action: "update_report_priority",
        table_name: "service_reports",
        record_id: report.report_id,
        old_data: JSON.stringify({ priority: report.priority }),
        new_data: JSON.stringify({ priority }),
      },
    });
  });

  revalidatePath("/technician/jobs");
  revalidatePath("/reports");
  revalidatePath(`/reports/${report.report_id}`);
}
