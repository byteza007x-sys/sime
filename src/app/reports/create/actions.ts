"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isFeatureEnabled, requireFeature } from "@/lib/features";
import { getLocale, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

type ServiceType = "Installation" | "Maintenance" | "Repair" | "PM" | "Emergency";
type Priority = "Low" | "Normal" | "High" | "Urgent";
type ReferenceType =
  | "quotation"
  | "project"
  | "service_call"
  | "quotation_project"
  | "quotation_service_call"
  | "project_service_call"
  | "all"
  | "both";

const serviceTypes: ServiceType[] = [
  "PM",
  "Maintenance",
  "Installation",
  "Repair",
  "Emergency",
];
const priorities: Priority[] = ["Low", "Normal", "High", "Urgent"];
const referenceTypes: ReferenceType[] = [
  "quotation",
  "project",
  "service_call",
  "quotation_project",
  "quotation_service_call",
  "project_service_call",
  "all",
  "both",
];

const readText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const readNumber = (formData: FormData, key: string) => {
  const value = Number(formData.get(key));
  return Number.isInteger(value) && value > 0 ? value : null;
};

const readDateTime = (value: string) => {
  if (!value) return null;

  const normalizedValue = value.length === 10 ? `${value}T00:00` : value;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
};

const redirectWithError = (locale: "en" | "th", error: string): never => {
  redirect(`${withLocale("/reports/create", locale)}&error=${error}`);
};

const createJobNumber = async () => {
  const now = new Date();
  const datePart = [
    now.getFullYear().toString().slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
  ].join("");

  for (let sequence = 1; sequence <= 99; sequence += 1) {
    const jobNumber = `${datePart}${String(sequence).padStart(2, "0")}`;
    const exists = await prisma.service_reports.findUnique({
      where: {
        job_number: jobNumber,
      },
    });

    if (!exists) return jobNumber;
  }

  return `${datePart}${randomUUID().slice(0, 6).toUpperCase()}`;
};

export async function createServiceReportAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);
  await requireFeature({ key: "service_reports", user, locale });
  const customerId = readNumber(formData, "customerId");
  const siteId = readNumber(formData, "siteId");
  const contactId = readNumber(formData, "contactId");
  const contactName = readText(formData, "contactName");
  const contactPhone = readText(formData, "contactPhone");
  const requestedEngineerId = readNumber(formData, "engineerId");
  const serviceType = readText(formData, "serviceType") as ServiceType;
  const priority = readText(formData, "priority") as Priority;
  const referenceType = readText(formData, "referenceType") as ReferenceType;
  const quotationNumber = readText(formData, "quotationNumber");
  const projectNumber = readText(formData, "projectNumber");
  const serviceCallNumber = readText(formData, "serviceCallNumber");
  const scheduledDate = readDateTime(readText(formData, "scheduledDate"));
  const dueAt = readDateTime(readText(formData, "dueDate"));

  if (customerId === null) {
    redirectWithError(locale, "required");
  }
  if (!serviceTypes.includes(serviceType)) redirectWithError(locale, "serviceType");
  if (!priorities.includes(priority)) redirectWithError(locale, "priority");
  if (!referenceTypes.includes(referenceType)) redirectWithError(locale, "required");
  const needsQuotation =
    referenceType === "quotation" ||
    referenceType === "quotation_project" ||
    referenceType === "quotation_service_call" ||
    referenceType === "all" ||
    referenceType === "both";
  const needsProject =
    referenceType === "project" ||
    referenceType === "quotation_project" ||
    referenceType === "project_service_call" ||
    referenceType === "all" ||
    referenceType === "both";
  const needsServiceCall =
    referenceType === "service_call" ||
    referenceType === "quotation_service_call" ||
    referenceType === "project_service_call" ||
    referenceType === "all";
  if (
    (needsQuotation && !quotationNumber) ||
    (needsProject && !projectNumber) ||
    (needsServiceCall && !serviceCallNumber)
  ) {
    redirectWithError(locale, "required");
  }

  const validCustomerId = customerId ?? redirectWithError(locale, "required");
  const selfEngineerId = user.engineers[0]?.engineer_id ?? null;
  const isAdmin = user.roles.role_name === "admin";
  const engineerAssignmentEnabled = await isFeatureEnabled("engineer_assignment");
  const engineerId = isAdmin && engineerAssignmentEnabled ? requestedEngineerId : selfEngineerId;

  const [customer, site, contact, engineer, fallbackEngineer] = await Promise.all([
    prisma.customers.findUnique({
      where: {
        customer_id: validCustomerId,
      },
    }),
    siteId !== null
      ? prisma.customer_sites.findUnique({
          where: {
            site_id: siteId,
          },
        })
      : Promise.resolve(null),
    contactId !== null
      ? prisma.customer_contacts.findUnique({
          where: {
            contact_id: contactId,
          },
        })
      : Promise.resolve(null),
    engineerId !== null
      ? prisma.engineers.findUnique({
          where: {
            engineer_id: engineerId,
          },
        })
      : Promise.resolve(null),
    prisma.engineers.findFirst({
      where: {
        status: "Active",
      },
      orderBy: {
        engineer_id: "asc",
      },
    }),
  ]);

  const validCustomer = customer ?? redirectWithError(locale, "required");
  const existingSelfEngineer = user.engineers[0] ?? null;
  const fallbackSelfEngineer =
    engineer || fallbackEngineer
      ? null
      : existingSelfEngineer
        ? await prisma.engineers.update({
            where: {
              engineer_id: existingSelfEngineer.engineer_id,
            },
            data: {
              status: "Active",
            },
          })
        : await prisma.engineers.create({
            data: {
              user_id: user.user_id,
              employee_id: `USR-${user.user_id.slice(0, 8)}`,
              first_name: user.full_name || user.username || user.email,
              phone: user.phone || null,
              department:
                user.roles.role_name === "support"
                  ? "Support"
                  : user.roles.role_name === "admin"
                    ? "Admin"
                    : null,
              position:
                user.roles.role_name === "support"
                  ? "Support"
                  : user.roles.role_name === "admin"
                    ? "Admin"
                    : "Field Engineer",
              status: "Active",
            },
          });
  const validEngineer =
    engineer ?? fallbackEngineer ?? fallbackSelfEngineer ?? redirectWithError(locale, "required");

  if (site && site.customer_id !== validCustomer.customer_id) {
    redirectWithError(locale, "site");
  }
  if (contact && contact.customer_id !== validCustomer.customer_id) {
    redirectWithError(locale, "contact");
  }

  const fallbackSites =
    site === null
      ? await prisma.customer_sites.findMany({
          where: {
            customer_id: validCustomer.customer_id,
            is_active: true,
          },
          orderBy: [
            {
              site_name: "asc",
            },
            {
              site_id: "asc",
            },
          ],
          take: 2,
        })
      : [];
  if (site === null && fallbackSites.length > 1) {
    redirectWithError(locale, "site");
  }
  const resolvedSite = site ?? (fallbackSites.length === 1 ? fallbackSites[0] : null);

  const reportId = randomUUID();
  const jobNumber = await createJobNumber();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const typedContact =
      contact ??
      (contactName
        ? await tx.customer_contacts.findFirst({
            where: {
              customer_id: validCustomer.customer_id,
              site_id: resolvedSite?.site_id ?? null,
              full_name: contactName,
            },
          })
        : null);
    const savedTypedContact =
      typedContact && contactPhone && typedContact.phone !== contactPhone
        ? await tx.customer_contacts.update({
            where: {
              contact_id: typedContact.contact_id,
            },
            data: {
              phone: contactPhone,
            },
          })
        : typedContact;
    const createdContact =
      savedTypedContact ??
      (contactName || contactPhone
        ? await tx.customer_contacts.create({
            data: {
              customer_id: validCustomer.customer_id,
              site_id: resolvedSite?.site_id ?? null,
              full_name:
                contactName || validCustomer.contact_person || validCustomer.company_name,
              phone: contactPhone || null,
              is_active: true,
            },
          })
        : null);

    await tx.service_reports.create({
      data: {
        report_id: reportId,
        job_number: jobNumber,
        project_number: projectNumber || null,
        quotation_number: quotationNumber || null,
        service_call_number: serviceCallNumber || null,
        customer_id: validCustomer.customer_id,
        site_id: resolvedSite?.site_id ?? null,
        contact_id: createdContact?.contact_id ?? null,
        engineer_id: validEngineer.engineer_id,
        created_by: user.user_id,
        service_type: serviceType,
        source: isAdmin ? "Admin" : "Technician",
        priority,
        status: "Assigned",
        date_issued: now,
        scheduled_date: scheduledDate,
        due_at: dueAt,
        assigned_at: now,
        problem_description: null,
        recommendation: null,
      },
    });

    await tx.service_report_assignments.create({
      data: {
        report_id: reportId,
        engineer_id: validEngineer.engineer_id,
        assigned_by: user.user_id,
        assignment_role: "Primary",
        status: "Assigned",
      },
    });

    await tx.service_report_status_history.create({
      data: {
        report_id: reportId,
        to_status: "Assigned",
        changed_by: user.user_id,
        note: isAdmin ? "Created from admin report form" : "Created from user service form",
      },
    });

    await tx.audit_logs.create({
      data: {
        user_id: user.user_id,
        action: "create_service_report",
        table_name: "service_reports",
        record_id: reportId,
        new_data: JSON.stringify({
          jobNumber,
          customerId,
          quotationNumber: quotationNumber || null,
          projectNumber: projectNumber || null,
          serviceCallNumber: serviceCallNumber || null,
          contactId: createdContact?.contact_id ?? null,
          engineerId: validEngineer.engineer_id,
        }),
      },
    });

    if (validEngineer.user_id) {
      await tx.notifications.create({
        data: {
          user_id: validEngineer.user_id,
          notification_type: "Job_Assigned",
          title: `New job assigned: ${jobNumber}`,
          body: `${validCustomer.company_name} - ${serviceType}`,
          link_url: withLocale(`/reports/${reportId}/work`, locale),
        },
      });
    }

    if (!isAdmin) {
      const adminUsers = await tx.users.findMany({
        where: {
          is_active: true,
          roles: {
            role_name: "admin",
          },
        },
        select: {
          user_id: true,
        },
      });
      const adminNotifications = adminUsers
        .filter((adminUser) => adminUser.user_id !== user.user_id)
        .map((adminUser) => ({
          user_id: adminUser.user_id,
          notification_type: "Job_Assigned" as const,
          title: `New service report created: ${jobNumber}`,
          body: `${validCustomer.company_name} - ${serviceType}`,
          link_url: withLocale(`/reports/${reportId}`, locale),
        }));

      if (adminNotifications.length > 0) {
        await tx.notifications.createMany({
          data: adminNotifications,
        });
      }
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/technician/jobs");
  redirect(withLocale(`/reports/${reportId}/work`, locale));
}
