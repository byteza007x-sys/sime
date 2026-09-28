import "server-only";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isOwnerUser } from "@/lib/owner";
import { type Locale, withLocale } from "@/lib/i18n";

export const featureDefinitions = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Admin overview, charts, CSV imports, and system health.",
  },
  {
    key: "service_reports",
    label: "Service reports",
    description: "Report list, create report, work form, review, and service form.",
  },
  {
    key: "technician_jobs",
    label: "Technician jobs",
    description: "User work queue and field workflow.",
  },
  {
    key: "customers",
    label: "Customers",
    description: "Customer master data and site GPS management.",
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "SAP equipment, model, and serial lookup.",
  },
  {
    key: "users",
    label: "Users",
    description: "User management, roles, and admin messages.",
  },
  {
    key: "maps",
    label: "Maps / GPS",
    description: "Map preview and GPS capture in service work forms.",
  },
  {
    key: "gps_distance_limit",
    label: "GPS 10 km distance limit",
    description: "Block service submissions when the captured GPS is more than 10 km from the customer site.",
  },
  {
    key: "engineer_assignment",
    label: "Job transfer",
    description: "Show responsible-user selection while creating and transferring service jobs.",
  },
  {
    key: "qr_code",
    label: "QR Code Generator",
    description: "Create static QR codes from links inside the dashboard.",
  },
  {
    key: "system_admin",
    label: "System Admin",
    description: "CSV imports, readiness checks, system health, and audit logs.",
  },
] as const;

export type FeatureKey = (typeof featureDefinitions)[number]["key"];

const definitionByKey = new Map(featureDefinitions.map((feature) => [feature.key, feature]));

export const ensureFeatureFlags = async () => {
  await Promise.all(
    featureDefinitions.map((feature) =>
      prisma.system_feature_flags.upsert({
        where: {
          flag_key: feature.key,
        },
        update: {
          description: feature.description,
        },
        create: {
          flag_key: feature.key,
          description: feature.description,
          is_enabled: true,
        },
      }),
    ),
  );
};

export const getFeatureFlags = async () => {
  await ensureFeatureFlags();

  const rows = await prisma.system_feature_flags.findMany({
    orderBy: {
      flag_key: "asc",
    },
  });
  const byKey = new Map(rows.map((row) => [row.flag_key, row]));

  return featureDefinitions.map((definition) => {
    const row = byKey.get(definition.key);

    return {
      ...definition,
      isEnabled: row?.is_enabled ?? true,
      updatedAt: row?.updated_at ?? null,
    };
  });
};

export const isFeatureEnabled = async (key: FeatureKey) => {
  await ensureFeatureFlags();

  const flag = await prisma.system_feature_flags.findUnique({
    where: {
      flag_key: key,
    },
    select: {
      is_enabled: true,
    },
  });

  return flag?.is_enabled ?? true;
};

export const requireFeature = async ({
  key,
  user,
  locale,
}: {
  key: FeatureKey;
  user: { username: string | null } | null | undefined;
  locale: Locale;
}) => {
  if (isOwnerUser(user)) return;

  const enabled = await isFeatureEnabled(key);
  if (enabled) return;

  const definition = definitionByKey.get(key);
  const message = encodeURIComponent(definition?.label ?? key);

  redirect(`${withLocale("/feature-disabled", locale)}&feature=${message}`);
};
