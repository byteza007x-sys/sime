"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const readText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const activeAssignmentStatuses = new Set(["Assigned", "Accepted"]);
const closedStatuses = new Set(["Approved", "Closed", "Completed", "Cancelled"]);

const reportHref = (reportId: string, locale: "en" | "th", query = "") =>
  `${withLocale(`/reports/${reportId}`, locale)}${query}`;

export async function assignServiceReportAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);
  await requireFeature({ key: "service_reports", user, locale });

  const reportId = readText(formData, "reportId");
  const assigneeUserId = readText(formData, "assigneeUserId");
  const note = readText(formData, "assignmentNote");
  const returnTo = readText(formData, "returnTo");
  const returnHref = (query = "") => {
    const suffix = query ? `&${query.replace(/^[?&]/, "")}` : "";

    if (returnTo === "report_work") {
      return `${withLocale(`/reports/${reportId}/work`, locale)}${suffix}`;
    }

    return returnTo === "technician_jobs"
      ? `${withLocale("/technician/jobs", locale)}${suffix}`
      : reportHref(reportId, locale, suffix);
  };

  if (!reportId) redirect(withLocale("/reports", locale));
  if (!assigneeUserId) redirect(returnHref("?assign_error=user"));

  const [report, assignee] = await Promise.all([
    prisma.service_reports.findUnique({
      where: {
        report_id: reportId,
      },
      include: {
        customers: true,
        engineers: {
          include: {
            users: true,
          },
        },
        service_report_assignments: true,
      },
    }),
    prisma.users.findUnique({
      where: {
        user_id: assigneeUserId,
      },
      include: {
        roles: true,
        engineers: {
          orderBy: {
            engineer_id: "asc",
          },
        },
      },
    }),
  ]);

  if (!report) redirect(withLocale("/reports/create", locale));
  if (closedStatuses.has(String(report.status))) {
    redirect(returnHref("?assign_error=locked"));
  }

  const currentEngineerIds = user.engineers.map((engineer) => engineer.engineer_id);
  const isAdmin = user.roles.role_name === "admin";
  const isCreator = report.created_by === user.user_id;
  const isAssignedEngineer = currentEngineerIds.includes(report.engineer_id);
  const isAssignedByAssignment = report.service_report_assignments.some(
    (assignment) =>
      currentEngineerIds.includes(assignment.engineer_id) &&
      activeAssignmentStatuses.has(String(assignment.status)),
  );

  if (!isAdmin && !isCreator && !isAssignedEngineer && !isAssignedByAssignment) {
    redirect(returnHref("?assign_error=permission"));
  }

  if (
    !assignee ||
    !assignee.is_active ||
    !["admin", "support", "user"].includes(assignee.roles.role_name)
  ) {
    redirect(returnHref("?assign_error=user"));
  }

  const now = new Date();
  const nextStatus =
    report.status === "Draft" || report.status === "Open"
      ? "Assigned"
      : report.status || "Assigned";
  const assigneeName =
    assignee.full_name || assignee.username || assignee.email || "Assigned user";

  await prisma.$transaction(async (tx) => {
    const existingEngineer = assignee.engineers[0] ?? null;
    const activeEngineer =
      existingEngineer && existingEngineer.status !== "Active"
        ? await tx.engineers.update({
            where: {
              engineer_id: existingEngineer.engineer_id,
            },
            data: {
              status: "Active",
            },
          })
        : existingEngineer;

    const targetEngineer =
      activeEngineer ??
      (await tx.engineers.create({
        data: {
          user_id: assignee.user_id,
          employee_id: `USR-${assignee.user_id.slice(0, 8)}`,
          first_name: assignee.full_name || assignee.username,
          phone: assignee.phone || null,
          department: assignee.roles.role_name === "support" ? "Support" : null,
          position:
            assignee.roles.role_name === "support"
              ? "Support"
              : assignee.roles.role_name === "admin"
                ? "Admin"
                : "Field Engineer",
          status: "Active",
        },
      }));

    await tx.service_report_assignments.updateMany({
      where: {
        report_id: reportId,
        engineer_id: {
          not: targetEngineer.engineer_id,
        },
        assignment_role: "Primary",
        status: {
          in: ["Assigned", "Accepted"],
        },
      },
      data: {
        assignment_role: "Assistant",
        status: "Completed",
        completed_at: now,
      },
    });

    await tx.service_report_assignments.upsert({
      where: {
        report_id_engineer_id: {
          report_id: reportId,
          engineer_id: targetEngineer.engineer_id,
        },
      },
      update: {
        assigned_by: user.user_id,
        assignment_role: "Primary",
        status: "Assigned",
        assigned_at: now,
        accepted_at: null,
        completed_at: null,
        note: note || null,
      },
      create: {
        report_id: reportId,
        engineer_id: targetEngineer.engineer_id,
        assigned_by: user.user_id,
        assignment_role: "Primary",
        status: "Assigned",
        assigned_at: now,
        note: note || null,
      },
    });

    await tx.service_reports.update({
      where: {
        report_id: reportId,
      },
      data: {
        engineer_id: targetEngineer.engineer_id,
        assigned_at: now,
        status: nextStatus,
      },
    });

    await tx.service_report_status_history.create({
      data: {
        report_id: reportId,
        from_status: report.status,
        to_status: nextStatus,
        changed_by: user.user_id,
        note: note || `Transferred to ${assigneeName}`,
      },
    });

    await tx.audit_logs.create({
      data: {
        user_id: user.user_id,
        action: "transfer_service_report",
        table_name: "service_reports",
        record_id: reportId,
        old_data: JSON.stringify({
          engineerId: report.engineer_id,
        }),
        new_data: JSON.stringify({
          engineerId: targetEngineer.engineer_id,
          assigneeUserId: assignee.user_id,
          note: note || null,
        }),
      },
    });

    await tx.notifications.create({
      data: {
        user_id: assignee.user_id,
        notification_type: "Job_Assigned",
        title: `Transferred service job: ${report.job_number}`,
        body: `${report.customers.company_name}${note ? ` - ${note}` : ""}`,
        link_url: withLocale(`/reports/${reportId}/work`, locale),
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/technician/jobs");
  revalidatePath(`/reports/${reportId}`);
  revalidatePath(`/reports/${reportId}/work`);
  revalidatePath(`/reports/${reportId}/service-form`);
  redirect(returnHref("?assigned=1"));
}
