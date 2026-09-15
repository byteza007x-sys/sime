"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export async function markNotificationsReadAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);

  await prisma.notifications.updateMany({
    where: {
      user_id: user.user_id,
      read_at: null,
    },
    data: {
      read_at: new Date(),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/technician/jobs");
}
