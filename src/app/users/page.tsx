import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import CreateUserDrawer from "@/components/create-user-drawer";
import LanguageSwitcher from "@/components/language-switcher";
import ThemeToggle from "@/components/theme-toggle";
import UserDirectory, { type DirectoryUser } from "@/components/user-directory";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { isOwnerUser, OWNER_USERNAME } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { normalizeUploadUrl } from "@/lib/upload-urls";
import { createUserAction, ensureSupportedRoles } from "./actions";

export const dynamic = "force-dynamic";

interface UsersPageProps {
  searchParams: RouteSearchParams;
}

const copy = {
  en: {
    backDashboard: "Dashboard",
    title: "User Management",
    subtitle:
      "Create accounts, review employee profiles, inspect work history, and audit user activity.",
    adminRequired: "Admin access required",
    adminRequiredDetail:
      "Your account can view the system, but only admin users can manage user accounts.",
    createUser: "Create user",
    username: "Username",
    fullName: "Full name",
    email: "Email (optional)",
    password: "Password",
    role: "Role",
    phone: "Phone",
    userDetails: "Work profile",
    employeeIdPlaceholder: "Employee ID, e.g. USER-002",
    departmentPlaceholder: "Department",
    positionPlaceholder: "Position",
    passwordPlaceholder: "At least 8 characters",
    fullNamePlaceholder: "Service User",
    usernamePlaceholder: "service-user",
    phonePlaceholder: "099-000-0000",
    createButton: "Create user",
    users: "Users",
    accounts: (count: number) => `${count} accounts in the system`,
    status: {
      active: "Active",
      disabled: "Disabled",
    },
    roles: {
      admin: "Admin",
      support: "Support",
      user: "User",
    },
    feedback: {
      created: "User account was created successfully.",
      updated: "User status was updated successfully.",
      profile_updated: "User information and profile photo were updated successfully.",
      username: "Username must be at least 3 characters.",
      email: "Email format is invalid.",
      password: "Password must be at least 8 characters.",
      role: "Please choose a supported role.",
      duplicate: "Username or email already exists.",
      duplicate_username: "This username is already used by another account.",
      duplicate_email: "This email is already used by another account.",
      employee: "Employee ID already exists.",
      avatar_type: "Profile photo must be a JPEG, PNG, WebP, or GIF image.",
      avatar_size: "Profile photo must not exceed 3 MB.",
      signature_type: "Staff signature must be a JPEG, PNG, WebP, or GIF image.",
      signature_size: "Staff signature must not exceed 3 MB.",
      profile_failed: "Could not update this user profile. Please try again.",
      reserved_user: "This username is reserved.",
      create_failed: "Could not create this user. Please check the form and try again.",
      delete_self: "You cannot delete the account currently in use.",
      disable_self: "You cannot disable the account currently in use.",
      user_missing: "User account was not found.",
      delete_has_history: "This user has work history and cannot be deleted.",
    },
    directory: {
      grid: "Grid",
      table: "Table",
      details: "View details",
      allReports: "View all service jobs",
      profile: "User profile",
      workStats: "Work and activity summary",
      recentJobs: "Recent service jobs",
      activityLog: "Recent activity log",
      editProfile: "Edit information and photo",
      saveProfile: "Save profile",
      fullName: "Full name",
      profilePhoto: "Profile photo",
      photoHint: "JPEG, PNG, WebP, or GIF up to 3 MB",
      staffSignature: "Saved staff signature",
      signatureHint: "Upload once. It will be selected automatically for every assigned job.",
      signatureReady: "A saved signature is ready to use.",
      cancel: "Cancel",
      role: "Role",
      phone: "Phone",
      email: "Email",
      employeeId: "Employee ID",
      department: "Department",
      position: "Position",
      status: "Status",
      created: "Created",
      lastLogin: "Last login",
      currentUser: "Current user",
      disable: "Disable",
      enable: "Enable",
      delete: "Delete",
      confirmDelete: "Delete this user?",
      messageUser: "Message user",
      messagePlaceholder: "Type a message...",
      send: "Send",
      noData: "No data",
      stats: {
        created: "Created",
        assigned: "Assigned",
        active: "Active",
        submitted: "Submitted",
        approved: "Approved",
        closed: "Closed",
      },
      tableHeaders: {
        user: "User",
        role: "Role",
        phone: "Phone",
        status: "Status",
        stats: "Work",
        action: "Action",
      },
    },
  },
  th: {
    backDashboard: "แดชบอร์ด",
    title: "จัดการผู้ใช้",
    subtitle:
      "สร้างบัญชี ดูโปรไฟล์พนักงาน ตรวจประวัติใบเซอร์วิซ และดู log การใช้งานของแต่ละคน",
    adminRequired: "ต้องใช้สิทธิ์แอดมิน",
    adminRequiredDetail:
      "บัญชีของคุณดูระบบได้ แต่เฉพาะแอดมินเท่านั้นที่จัดการบัญชีผู้ใช้ได้",
    createUser: "สร้างผู้ใช้",
    username: "Username",
    fullName: "ชื่อ-นามสกุล",
    email: "Email (ไม่บังคับ)",
    password: "รหัสผ่าน",
    role: "สิทธิ์",
    phone: "เบอร์โทร",
    userDetails: "ข้อมูลการทำงาน",
    employeeIdPlaceholder: "รหัสพนักงาน เช่น USER-002",
    departmentPlaceholder: "แผนก",
    positionPlaceholder: "ตำแหน่ง",
    passwordPlaceholder: "อย่างน้อย 8 ตัวอักษร",
    fullNamePlaceholder: "ผู้ใช้ระบบบริการ",
    usernamePlaceholder: "service-user",
    phonePlaceholder: "099-000-0000",
    createButton: "สร้างผู้ใช้",
    users: "ผู้ใช้",
    accounts: (count: number) => `มีบัญชีทั้งหมด ${count} บัญชีในระบบ`,
    status: {
      active: "ใช้งาน",
      disabled: "ปิดใช้งาน",
    },
    roles: {
      admin: "แอดมิน",
      support: "Support",
      user: "ผู้ใช้",
    },
    feedback: {
      created: "สร้างผู้ใช้สำเร็จแล้ว",
      updated: "อัปเดตสถานะผู้ใช้สำเร็จแล้ว",
      profile_updated: "อัปเดตข้อมูลและรูปผู้ใช้สำเร็จแล้ว",
      username: "Username ต้องมีอย่างน้อย 3 ตัวอักษร",
      email: "รูปแบบ Email ไม่ถูกต้อง",
      password: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
      role: "กรุณาเลือกสิทธิ์ที่ระบบรองรับ",
      duplicate: "Username หรือ Email นี้มีอยู่แล้ว",
      duplicate_username: "Username นี้มีคนใช้ไปแล้ว กรุณาใช้ชื่ออื่น",
      duplicate_email: "Email นี้มีคนใช้ไปแล้ว กรุณาใช้ Email อื่น",
      employee: "รหัสพนักงานนี้มีอยู่แล้ว",
      avatar_type: "รูปผู้ใช้ต้องเป็นไฟล์ JPEG, PNG, WebP หรือ GIF",
      avatar_size: "รูปผู้ใช้ต้องมีขนาดไม่เกิน 3 MB",
      signature_type: "ลายเซ็นต้องเป็นไฟล์ JPEG, PNG, WebP หรือ GIF",
      signature_size: "ไฟล์ลายเซ็นต้องมีขนาดไม่เกิน 3 MB",
      profile_failed: "อัปเดตข้อมูลผู้ใช้ไม่สำเร็จ กรุณาลองใหม่",
      reserved_user: "Username นี้ถูกสงวนไว้",
      create_failed: "สร้างผู้ใช้ไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่",
      delete_self: "ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้",
      disable_self: "ไม่สามารถปิดบัญชีที่กำลังใช้งานอยู่ได้",
      user_missing: "ไม่พบบัญชีผู้ใช้นี้",
      delete_has_history: "ผู้ใช้นี้มีประวัติการทำงานแล้ว จึงไม่สามารถลบได้",
    },
    directory: {
      grid: "Grid",
      table: "Table",
      details: "ดูข้อมูลเพิ่มเติม",
      allReports: "ดูใบเซอร์วิซทั้งหมด",
      profile: "ข้อมูลผู้ใช้",
      workStats: "สรุปผลงานและกิจกรรม",
      recentJobs: "ใบเซอร์วิซล่าสุด",
      activityLog: "Log การใช้งานล่าสุด",
      editProfile: "แก้ไขข้อมูลและรูป",
      saveProfile: "บันทึกข้อมูล",
      fullName: "ชื่อ-นามสกุล",
      profilePhoto: "รูปผู้ใช้",
      photoHint: "รองรับ JPEG, PNG, WebP หรือ GIF ขนาดไม่เกิน 3 MB",
      staffSignature: "ลายเซ็นประจำตัว",
      signatureHint: "อัปโหลดครั้งเดียว ระบบจะเลือกให้อัตโนมัติในทุกใบงานที่ได้รับมอบหมาย",
      signatureReady: "มีลายเซ็นพร้อมใช้งานแล้ว",
      cancel: "ยกเลิก",
      role: "สิทธิ์",
      phone: "เบอร์โทร",
      email: "Email",
      employeeId: "รหัสพนักงาน",
      department: "แผนก",
      position: "ตำแหน่ง",
      status: "สถานะ",
      created: "สร้างเมื่อ",
      lastLogin: "เข้าใช้ล่าสุด",
      currentUser: "บัญชีที่ใช้อยู่",
      disable: "ปิดใช้งาน",
      enable: "เปิดใช้งาน",
      delete: "ลบ",
      confirmDelete: "ยืนยันที่จะลบผู้ใช้นี้ไหม?",
      messageUser: "ส่งข้อความถึงผู้ใช้",
      messagePlaceholder: "พิมพ์ข้อความ...",
      send: "ส่งข้อความ",
      noData: "ไม่มีข้อมูล",
      stats: {
        created: "เปิดเอง",
        assigned: "รับผิดชอบ",
        active: "กำลังทำ",
        submitted: "Submitted",
        approved: "Approved",
        closed: "ปิดแล้ว",
      },
      tableHeaders: {
        user: "ผู้ใช้",
        role: "สิทธิ์",
        phone: "เบอร์โทร",
        status: "สถานะ",
        stats: "งาน",
        action: "จัดการ",
      },
    },
  },
} satisfies Record<Locale, object>;

type FeedbackKey = keyof (typeof copy)["en"]["feedback"];

const activeStatuses = new Set([
  "Draft",
  "Open",
  "Assigned",
  "In_Progress",
  "On_Site",
  "Pending_Customer",
  "Need_Revision",
]);
const approvedStatuses = new Set(["Approved", "Completed", "Closed"]);
const closedStatuses = new Set(["Approved", "Completed", "Closed", "Cancelled"]);

const toIso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

const summarizeJson = (value: string | null | undefined) => {
  if (!value) return "";

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed)
      .slice(0, 3)
      .map(([key, item]) => `${key}: ${String(item)}`)
      .join(" / ");
  } catch {
    return value.slice(0, 120);
  }
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const currentUser = await requireUser(locale);
  await requireFeature({ key: "users", user: currentUser, locale });
  const isAdmin = currentUser.roles.role_name === "admin" || isOwnerUser(currentUser);
  const t = copy[locale];
  const errorKey = String(
    Array.isArray(params.error) ? params.error[0] : params.error ?? "",
  );
  const created = Boolean(
    Array.isArray(params.created) ? params.created[0] : params.created,
  );
  const updated = Boolean(
    Array.isArray(params.updated) ? params.updated[0] : params.updated,
  );
  const profileUpdated = Boolean(
    Array.isArray(params.profile_updated)
      ? params.profile_updated[0]
      : params.profile_updated,
  );
  const feedbackMessage = created
    ? t.feedback.created
    : profileUpdated
      ? t.feedback.profile_updated
      : updated
        ? t.feedback.updated
      : errorKey
        ? t.feedback[errorKey as FeedbackKey] ?? t.feedback.create_failed
        : null;

  if (isAdmin) {
    await ensureSupportedRoles();
  }

  const roleLabel = (roleName: string) =>
    Object.prototype.hasOwnProperty.call(t.roles, roleName)
      ? t.roles[roleName as keyof typeof t.roles]
      : roleName;

  const [users, roles] = await Promise.all([
    prisma.users.findMany({
      where: {
        username: {
          not: OWNER_USERNAME,
        },
      },
      include: {
        roles: true,
        engineers: true,
        uploaded_files: {
          where: {
            file_category: "Signature",
          },
          orderBy: [
            {
              created_at: "desc",
            },
            {
              file_id: "desc",
            },
          ],
          take: 1,
        },
      },
      orderBy: {
        created_at: "desc",
      },
    }),
    prisma.roles.findMany({
      where: {
        role_name: {
          in: ["admin", "support", "user"],
        },
      },
      orderBy: {
        role_name: "asc",
      },
    }),
  ]);

  const directoryUsers: DirectoryUser[] = isAdmin
    ? await Promise.all(
        users.map(async (user) => {
          const engineerIds = user.engineers.map((engineer) => engineer.engineer_id);
          const workWhere = {
            OR: [
              {
                created_by: user.user_id,
              },
              {
                engineer_id: {
                  in: engineerIds.length > 0 ? engineerIds : [-1],
                },
              },
              {
                service_report_assignments: {
                  some: {
                    engineer_id: {
                      in: engineerIds.length > 0 ? engineerIds : [-1],
                    },
                  },
                },
              },
            ],
          };
          const [reports, logs] = await Promise.all([
            prisma.service_reports.findMany({
              where: workWhere,
              select: {
                report_id: true,
                job_number: true,
                status: true,
                priority: true,
                service_type: true,
                created_by: true,
                engineer_id: true,
                created_at: true,
                updated_at: true,
                customers: {
                  select: {
                    company_name: true,
                  },
                },
                customer_sites: {
                  select: {
                    site_name: true,
                  },
                },
              },
              orderBy: [
                {
                  updated_at: "desc",
                },
                {
                  created_at: "desc",
                },
              ],
            }),
            prisma.audit_logs.findMany({
              where: {
                user_id: user.user_id,
              },
              select: {
                log_id: true,
                action: true,
                table_name: true,
                record_id: true,
                old_data: true,
                new_data: true,
                created_at: true,
              },
              orderBy: {
                created_at: "desc",
              },
              take: 12,
            }),
          ]);
          const primaryEngineer = user.engineers[0] ?? null;
          const createdJobs = reports.filter(
            (report) => report.created_by === user.user_id,
          ).length;
          const assignedJobs = reports.filter(
            (report) =>
              report.engineer_id !== null && engineerIds.includes(report.engineer_id),
          ).length;

          return {
            userId: user.user_id,
            username: user.username || "",
            email: user.email,
            fullName: user.full_name || "",
            phone: user.phone || "",
            roleName: user.roles.role_name,
            roleLabel: roleLabel(user.roles.role_name),
            isActive: Boolean(user.is_active),
            createdAt: toIso(user.created_at),
            lastLoginAt: toIso(user.last_login_at),
            engineer: {
              employeeId: primaryEngineer?.employee_id || "",
              name:
                [primaryEngineer?.first_name, primaryEngineer?.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                user.full_name ||
                user.username ||
                "",
              phone: primaryEngineer?.phone || "",
              department: primaryEngineer?.department || "",
              position: primaryEngineer?.position || "",
              status: primaryEngineer?.status || "",
              avatarUrl: normalizeUploadUrl(primaryEngineer?.avatar_url) || "",
              signatureUrl: normalizeUploadUrl(user.uploaded_files[0]?.file_url) || "",
            },
            stats: {
              createdJobs,
              assignedJobs,
              activeJobs: reports.filter((report) =>
                activeStatuses.has(String(report.status)),
              ).length,
              submittedJobs: reports.filter((report) => report.status === "Submitted")
                .length,
              approvedJobs: reports.filter((report) =>
                approvedStatuses.has(String(report.status)),
              ).length,
              closedJobs: reports.filter((report) =>
                closedStatuses.has(String(report.status)),
              ).length,
            },
            recentReports: reports.map((report) => ({
              reportId: report.report_id,
              jobNumber: report.job_number,
              status: String(report.status || "-"),
              priority: String(report.priority || "Normal"),
              serviceType: String(report.service_type || "-"),
              customer: report.customers.company_name,
              site: report.customer_sites?.site_name || "",
              updatedAt: toIso(report.updated_at),
            })),
            recentLogs: logs.map((log) => ({
              id: log.log_id,
              action: log.action || "",
              table: log.table_name || "",
              recordId: log.record_id || "",
              createdAt: toIso(log.created_at),
              summary: summarizeJson(log.new_data || log.old_data),
            })),
          };
        }),
      )
    : [];

  const directoryText = {
    users: t.users,
    accounts: t.accounts(users.length),
    active: t.status.active,
    disabled: t.status.disabled,
    ...t.directory,
  };

  return (
    <main className="animate-page min-h-screen bg-slate-100 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="animate-panel flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href={withLocale("/dashboard", locale)}
              className="interactive-button mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300"
            >
              <ArrowLeft size={16} />
              {t.backDashboard}
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Users size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t.subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg shadow-sm transition hover:shadow-md">
              <LanguageSwitcher locale={locale} pathname="/users" />
            </div>
            <div className="rounded-lg shadow-sm transition hover:shadow-md">
              <ThemeToggle />
            </div>
            {isAdmin ? (
              <CreateUserDrawer
                title={t.createUser}
                triggerLabel={t.createUser}
                closeLabel={t.directory.cancel}
              >
                <form action={createUserAction} className="grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="lang" value={locale} />
                  <label className="block">
                    <span className="text-sm font-bold">{t.username}</span>
                    <input
                      name="username"
                      required
                      minLength={3}
                      pattern="[A-Za-z0-9._-]+"
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
                      placeholder={t.usernamePlaceholder}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">{t.fullName}</span>
                    <input
                      name="fullName"
                      required
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
                      placeholder={t.fullNamePlaceholder}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">{t.email}</span>
                    <input
                      name="email"
                      type="email"
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
                      placeholder="user@e-service.local"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">{t.password}</span>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
                      placeholder={t.passwordPlaceholder}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">{t.role}</span>
                    <select
                      name="roleId"
                      required
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
                    >
                      {roles.map((role) => (
                        <option key={role.role_id} value={role.role_id}>
                          {roleLabel(role.role_name)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">{t.phone}</span>
                    <input
                      name="phone"
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
                      placeholder={t.phonePlaceholder}
                    />
                  </label>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:col-span-2">
                    <p className="mb-3 text-sm font-bold">{t.userDetails}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input
                        name="employeeId"
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
                        placeholder={t.employeeIdPlaceholder}
                      />
                      <input
                        name="department"
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
                        placeholder={t.departmentPlaceholder}
                      />
                      <input
                        name="position"
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
                        placeholder={t.positionPlaceholder}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="interactive-button h-11 w-full rounded-lg bg-blue-700 text-sm font-bold text-white shadow-[0_6px_16px_rgba(29,78,216,0.2)] transition hover:bg-blue-800 sm:col-span-2"
                  >
                    {t.createButton}
                  </button>
                </form>
              </CreateUserDrawer>
            ) : null}
          </div>
        </header>

        {feedbackMessage ? (
          <div
            className={`animate-panel rounded-2xl border px-5 py-4 text-sm font-semibold shadow-sm ${
              created || updated || profileUpdated
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            }`}
          >
            {feedbackMessage}
          </div>
        ) : null}

        {!isAdmin ? (
          <section className="animate-panel rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <h2 className="font-bold">{t.adminRequired}</h2>
            <p className="mt-1 text-sm">{t.adminRequiredDetail}</p>
          </section>
        ) : (
          <section>
            <UserDirectory
              users={directoryUsers}
              currentUserId={currentUser.user_id}
              locale={locale}
              text={directoryText}
            />
          </section>
        )}
      </div>
    </main>
  );
}
