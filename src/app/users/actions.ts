"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { getLocale, withLocale } from "@/lib/i18n";
import { isOwnerUser, OWNER_USERNAME } from "@/lib/owner";
import { prisma } from "@/lib/prisma";

const requireAdmin = async () => {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.roles.role_name !== "admin" && !isOwnerUser(user)) {
    throw new Error("Only admin users can manage users.");
  }

  return user;
};

const readText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const normalizeUsername = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");

export async function ensureSupportedRoles() {
  await prisma.roles.upsert({
    where: {
      role_name: "admin",
    },
    update: {},
    create: {
      role_name: "admin",
      description: "Administrator",
    },
  });
  await prisma.roles.upsert({
    where: {
      role_name: "user",
    },
    update: {},
    create: {
      role_name: "user",
      description: "Service user",
    },
  });
  await prisma.roles.upsert({
    where: {
      role_name: "support",
    },
    update: {},
    create: {
      role_name: "support",
      description: "Support user",
    },
  });
}

export async function createUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const returnPath = readText(formData, "returnTo") === "owner" ? "/owner" : "/users";
  const redirectBase = withLocale(returnPath, locale);
  const username = normalizeUsername(readText(formData, "username"));
  const rawEmail = readText(formData, "email").toLowerCase();
  const email = rawEmail || `${username}@e-service.local`;
  const password = String(formData.get("password") ?? "");
  const fullName = readText(formData, "fullName");
  const phone = readText(formData, "phone");
  const roleId = Number(formData.get("roleId"));
  const employeeId = readText(formData, "employeeId");
  const department = readText(formData, "department");
  const position = readText(formData, "position");
  const redirectWithError = (error: string): never => {
    redirect(`${redirectBase}&error=${error}`);
  };

  if (username.length < 3) {
    redirectWithError("username");
  }
  if (username === OWNER_USERNAME) {
    redirectWithError("reserved_user");
  }

  if (!email.includes("@")) {
    redirectWithError("email");
  }

  if (password.length < 8) {
    redirectWithError("password");
  }

  const role = await prisma.roles.findUnique({
    where: {
      role_id: roleId,
    },
  });

  if (!role) {
    redirectWithError("role");
  }
  const validRole = role ?? redirectWithError("role");

  if (!["admin", "support", "user"].includes(validRole.role_name)) {
    redirectWithError("role");
  }

  const existingUsername = await prisma.users.findFirst({
    where: {
      username,
    },
    select: {
      user_id: true,
    },
  });

  if (existingUsername) {
    redirectWithError("duplicate_username");
  }

  const existingEmail = await prisma.users.findFirst({
    where: {
      email,
    },
    select: {
      user_id: true,
    },
  });

  if (existingEmail) {
    redirectWithError("duplicate_email");
  }

  if (employeeId) {
    const existingEngineer = await prisma.engineers.findUnique({
      where: {
        employee_id: employeeId,
      },
    });

    if (existingEngineer) {
      redirectWithError("employee");
    }
  }

  const userId = randomUUID();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.users.create({
        data: {
          user_id: userId,
          username,
          email,
          password_hash: hashPassword(password),
          role_id: validRole.role_id,
          full_name: fullName || null,
          phone: phone || null,
          is_active: true,
        },
      });

      if (["support", "user"].includes(validRole.role_name) && employeeId) {
        await tx.engineers.create({
          data: {
            user_id: userId,
            employee_id: employeeId,
            first_name: fullName || null,
            phone: phone || null,
            department:
              department || (validRole.role_name === "support" ? "Support" : null),
            position:
              position ||
              (validRole.role_name === "support" ? "Support" : "Field Engineer"),
            status: "Active",
          },
        });
      }

      await tx.audit_logs.create({
        data: {
          user_id: admin.user_id,
          action: "create_user",
          table_name: "users",
          record_id: userId,
          new_data: JSON.stringify({ username, email, role: validRole.role_name }),
        },
      });
    });
  } catch {
    redirectWithError("create_failed");
  }

  revalidatePath("/users");
  revalidatePath("/owner");
  redirect(`${redirectBase}&created=1`);
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const userId = readText(formData, "userId");

  if (userId === admin.user_id) {
    redirect(`${withLocale("/users", locale)}&error=delete_self`);
  }

  const user = await prisma.users.findUnique({
    where: {
      user_id: userId,
    },
    include: {
      roles: true,
    },
  });

  if (!user) {
    redirect(withLocale("/users", locale));
  }
  if (isOwnerUser(user)) {
    redirect(`${withLocale("/users", locale)}&error=reserved_user`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.audit_logs.create({
        data: {
          user_id: admin.user_id,
          action: "delete_user",
          table_name: "users",
          record_id: userId,
          old_data: JSON.stringify({
            username: user.username,
            email: user.email,
            role: user.roles.role_name,
          }),
        },
      });

      await tx.engineers.deleteMany({
        where: {
          user_id: userId,
        },
      });

      await tx.users.delete({
        where: {
          user_id: userId,
        },
      });
    });
  } catch {
    redirect(`${withLocale("/users", locale)}&error=delete_has_history`);
  }

  revalidatePath("/users");
  redirect(`${withLocale("/users", locale)}&deleted=1`);
}

export async function toggleUserStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const userId = readText(formData, "userId");
  const redirectWithError = (error: string): never => {
    redirect(`${withLocale("/users", locale)}&error=${error}`);
  };

  if (userId === admin.user_id) {
    redirectWithError("disable_self");
  }

  const user = await prisma.users.findUnique({
    where: {
      user_id: userId,
    },
  });

  if (!user) {
    redirectWithError("user_missing");
  }
  const validUser = user ?? redirectWithError("user_missing");

  if (isOwnerUser(validUser)) {
    redirectWithError("reserved_user");
  }

  await prisma.users.update({
    where: {
      user_id: userId,
    },
    data: {
      is_active: !validUser.is_active,
    },
  });

  await prisma.audit_logs.create({
    data: {
      user_id: admin.user_id,
      action: validUser.is_active ? "disable_user" : "enable_user",
      table_name: "users",
      record_id: userId,
    },
  });

  revalidatePath("/users");
  redirect(`${withLocale("/users", locale)}&updated=1`);
}

export async function sendUserMessageAction(formData: FormData) {
  const admin = await requireAdmin();
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const userId = readText(formData, "userId");
  const message = readText(formData, "message");

  if (!message) {
    redirect(`${withLocale("/users", locale)}&error=message_empty`);
  }

  const user = await prisma.users.findUnique({
    where: {
      user_id: userId,
    },
    select: {
      user_id: true,
      username: true,
      full_name: true,
      is_active: true,
    },
  });

  if (!user || !user.is_active) {
    redirect(`${withLocale("/users", locale)}&error=message_user`);
  }
  if (isOwnerUser(user)) {
    redirect(`${withLocale("/users", locale)}&error=reserved_user`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.notifications.create({
      data: {
        user_id: user.user_id,
        notification_type: "System",
        title: locale === "th" ? "ข้อความจากแอดมิน" : "Message from admin",
        body: message,
        link_url: withLocale("/technician/jobs", locale),
      },
    });

    await tx.audit_logs.create({
      data: {
        user_id: admin.user_id,
        action: "send_user_message",
        table_name: "notifications",
        record_id: user.user_id,
        new_data: JSON.stringify({
          to: user.username || user.full_name,
          message,
        }),
      },
    });
  });

  revalidatePath("/users");
  revalidatePath("/technician/jobs");
  redirect(`${withLocale("/users", locale)}&message_sent=1`);
}
