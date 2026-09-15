"use server";

import { spawn } from "child_process";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLocale, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { prisma } from "@/lib/prisma";

const allowedReturnPaths = new Set([
  "/dashboard",
  "/dashboard/system",
  "/reports",
  "/customers",
  "/inventory",
  "/users",
]);

const readReturnPath = (formData: FormData) => {
  const value = String(formData.get("returnTo") ?? "/dashboard/system");

  return allowedReturnPaths.has(value) ? value : "/dashboard/system";
};

const runBackupScript = async () => {
  const scriptPath = path.join(process.cwd(), "scripts", "backup-system.mjs");
  const child = spawn(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return await new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `Backup failed with code ${code}`));
    });
  });
};

export async function triggerBackupAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);
  const returnPath = readReturnPath(formData);
  let result: "success" | "failed" = "success";

  if (user.roles.role_name !== "admin" && !isOwnerUser(user)) {
    redirect(`${withLocale(returnPath, locale)}&backup=forbidden`);
  }

  try {
    await runBackupScript();

    try {
      await prisma.audit_logs.create({
        data: {
          user_id: user.user_id,
          action: "manual_backup",
          table_name: "system_backup",
          new_data: JSON.stringify({
            returnPath,
            triggeredFrom: String(formData.get("source") ?? "manual"),
          }),
        },
      });
    } catch (auditError) {
      console.error("Manual backup audit log failed", auditError);
    }
  } catch (error) {
    result = "failed";
    console.error("Manual backup failed", error);

    try {
      await prisma.audit_logs.create({
        data: {
          user_id: user.user_id,
          action: "manual_backup_failed",
          table_name: "system_backup",
          new_data: JSON.stringify({
            returnPath,
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      });
    } catch (auditError) {
      console.error("Manual backup failure audit log failed", auditError);
    }
  }

  revalidatePath("/dashboard/system");
  revalidatePath(returnPath);
  redirect(`${withLocale(returnPath, locale)}&backup=${result}`);
}
