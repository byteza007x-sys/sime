"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { getLocale, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { prisma } from "@/lib/prisma";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const locale = getLocale(String(formData.get("lang") ?? "en"));

  const user = await prisma.users.findFirst({
    where: {
      OR: [
        {
          username,
        },
        {
          email: username,
        },
      ],
      is_active: true,
    },
    include: {
      roles: true,
    },
  });

  const isValid = user ? verifyPassword(password, user.password_hash) : false;

  if (!user || !isValid) {
    redirect(`${withLocale("/login", locale)}&error=invalid`);
  }

  await createSession(user.user_id);

  await prisma.users.update({
    where: {
      user_id: user.user_id,
    },
    data: {
      last_login_at: new Date(),
    },
  });

  redirect(
    withLocale(
      isOwnerUser(user)
        ? "/owner"
        : user.roles.role_name === "admin"
          ? "/dashboard"
          : "/technician/jobs",
      locale,
    ),
  );
}

export async function logoutAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));

  await destroySession();
  redirect(withLocale("/login", locale));
}
