"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { featureDefinitions, type FeatureKey } from "@/lib/features";
import { getLocale, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { prisma } from "@/lib/prisma";

const featureKeys = new Set<string>(featureDefinitions.map((feature) => feature.key));

export async function toggleFeatureFlagAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await getCurrentUser();

  if (!isOwnerUser(user)) {
    throw new Error(locale === "th" ? "ไม่มีสิทธิ์ใช้งาน" : "Owner access required.");
  }

  const key = String(formData.get("featureKey") ?? "") as FeatureKey;
  const enabled = String(formData.get("enabled") ?? "") === "1";

  if (!featureKeys.has(key)) {
    throw new Error(locale === "th" ? "ไม่พบระบบนี้" : "Unknown feature.");
  }

  const definition = featureDefinitions.find((feature) => feature.key === key);

  await prisma.system_feature_flags.upsert({
    where: {
      flag_key: key,
    },
    update: {
      is_enabled: enabled,
      updated_by: user?.user_id ?? null,
    },
    create: {
      flag_key: key,
      label: definition?.label ?? key,
      description: definition?.description ?? null,
      is_enabled: enabled,
      updated_by: user?.user_id ?? null,
    },
  });

  await prisma.audit_logs.create({
    data: {
      user_id: user?.user_id ?? null,
      action: enabled ? "enable_feature" : "disable_feature",
      table_name: "system_feature_flags",
      record_id: key,
      new_data: JSON.stringify({ key, enabled }),
    },
  });

  revalidatePath("/owner");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/qr-code");
  revalidatePath("/reports");
  revalidatePath("/customers");
  revalidatePath("/inventory");
  revalidatePath("/users");
  revalidatePath("/technician/jobs");
  redirect(`${withLocale("/owner", locale)}&updated=${key}&enabled=${enabled ? "1" : "0"}`);
}
