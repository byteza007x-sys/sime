import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Shield,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import DeleteUserButton from "@/components/delete-user-button";
import LanguageSwitcher from "@/components/language-switcher";
import ThemeToggle from "@/components/theme-toggle";
import BackupButton from "@/components/backup-button";
import { triggerBackupAction } from "@/app/backup/actions";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { isOwnerUser, OWNER_USERNAME } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import {
  createUserAction,
  deleteUserAction,
  ensureSupportedRoles,
  sendUserMessageAction,
  toggleUserStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

interface UsersPageProps {
  searchParams: RouteSearchParams;
}

const copy = {
  en: {
    backDashboard: "Dashboard",
    title: "User Management",
    subtitle: "Create accounts, choose admin/user access, and manage sign-in.",
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
    table: {
      user: "User",
      role: "Role",
      phone: "Phone",
      status: "Status",
      action: "Action",
    },
    status: {
      active: "Active",
      disabled: "Disabled",
    },
    currentUser: "Current user",
    disable: "Disable",
    enable: "Enable",
    delete: "Delete",
    confirmDelete: "Delete this user?",
    roles: {
      admin: "Admin",
      support: "Support",
      user: "User",
    },
  },
  th: {
    backDashboard: "แดชบอร์ด",
    title: "จัดการผู้ใช้",
    subtitle: "สร้างบัญชี เลือกสิทธิ์ admin/user และจัดการการเข้าใช้งาน",
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
    table: {
      user: "ผู้ใช้",
      role: "สิทธิ์",
      phone: "เบอร์โทร",
      status: "สถานะ",
      action: "จัดการ",
    },
    status: {
      active: "ใช้งาน",
      disabled: "ปิดใช้งาน",
    },
    currentUser: "บัญชีที่ใช้อยู่",
    disable: "ปิดใช้งาน",
    enable: "เปิดใช้งาน",
    delete: "ลบ",
    confirmDelete: "ยืนยันที่จะลบผู้ใช้นี้ไหม?",
    roles: {
      admin: "แอดมิน",
      support: "Support",
      user: "ผู้ใช้",
    },
  },
} satisfies Record<Locale, object>;

const thaiCopy = {
  ...copy.en,
  backDashboard: "แดชบอร์ด",
  title: "จัดการผู้ใช้",
  subtitle: "สร้างบัญชี เลือกสิทธิ์ admin/user ส่งข้อความ และจัดการการเข้าใช้งาน",
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
  table: {
    user: "ผู้ใช้",
    role: "สิทธิ์",
    phone: "เบอร์โทร",
    status: "สถานะ",
    action: "จัดการ",
  },
  status: {
    active: "ใช้งาน",
    disabled: "ปิดใช้งาน",
  },
  currentUser: "บัญชีที่ใช้อยู่",
  disable: "ปิดใช้งาน",
  enable: "เปิดใช้งาน",
  delete: "ลบ",
  confirmDelete: "ยืนยันที่จะลบผู้ใช้นี้ไหม?",
  roles: {
    admin: "แอดมิน",
    support: "Support",
    user: "ผู้ใช้",
  },
} satisfies typeof copy.en;

const messageCopy = {
  en: {
    label: "Message user",
    placeholder: "Type a message...",
    send: "Send",
  },
  th: {
    label: "ส่งข้อความถึงผู้ใช้",
    placeholder: "พิมพ์ข้อความ...",
    send: "ส่งข้อความ",
  },
} satisfies Record<Locale, Record<string, string>>;

const feedbackCopy = {
  en: {
    created: "User account was created successfully.",
    updated: "User status was updated successfully.",
    username: "Username must be at least 3 characters.",
    email: "Email format is invalid.",
    password: "Password must be at least 8 characters.",
    role: "Please choose a supported role.",
    duplicate: "Username or email already exists.",
    duplicate_username: "This username is already used by another account.",
    duplicate_email: "This email is already used by another account.",
    employee: "Employee ID already exists.",
    reserved_user: "This username is reserved.",
    create_failed: "Could not create this user. Please check the form and try again.",
    delete_self: "You cannot delete the account currently in use.",
    disable_self: "You cannot disable the account currently in use.",
    user_missing: "User account was not found.",
    delete_has_history: "This user has work history and cannot be deleted.",
  },
  th: {
    created: "สร้างผู้ใช้สำเร็จแล้ว",
    updated: "อัปเดตสถานะผู้ใช้สำเร็จแล้ว",
    username: "Username ต้องมีอย่างน้อย 3 ตัวอักษร",
    email: "รูปแบบ Email ไม่ถูกต้อง",
    password: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    role: "กรุณาเลือกสิทธิ์ที่ระบบรองรับ",
    duplicate: "Username หรือ Email นี้มีอยู่แล้ว",
    duplicate_username: "Username นี้มีคนใช้ไปแล้ว กรุณาใช้ชื่ออื่น",
    duplicate_email: "Email นี้มีคนใช้ไปแล้ว กรุณาใช้ Email อื่น",
    employee: "รหัสพนักงานนี้มีอยู่แล้ว",
    reserved_user: "Username นี้ถูกสงวนไว้",
    create_failed: "สร้างผู้ใช้ไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่",
    delete_self: "ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้",
    disable_self: "ไม่สามารถปิดบัญชีที่กำลังใช้งานอยู่ได้",
    user_missing: "ไม่พบบัญชีผู้ใช้นี้",
    delete_has_history: "ผู้ใช้นี้มีประวัติการทำงานแล้ว จึงไม่สามารถลบได้",
  },
} satisfies Record<Locale, Record<string, string>>;

type FeedbackKey = keyof (typeof feedbackCopy)["en"];

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const currentUser = await requireUser(locale);
  await requireFeature({ key: "users", user: currentUser, locale });
  const isAdmin = currentUser.roles.role_name === "admin" || isOwnerUser(currentUser);
  const t = locale === "th" ? thaiCopy : copy.en;
  const messageText = messageCopy[locale];
  const feedbackText = feedbackCopy[locale];
  const backupStatus = Array.isArray(params.backup) ? params.backup[0] : params.backup;
  const errorKey = String(
    Array.isArray(params.error) ? params.error[0] : params.error ?? "",
  );
  const created = Boolean(
    Array.isArray(params.created) ? params.created[0] : params.created,
  );
  const updated = Boolean(
    Array.isArray(params.updated) ? params.updated[0] : params.updated,
  );
  const feedbackMessage = created
    ? feedbackText.created
    : updated
      ? feedbackText.updated
    : errorKey
      ? feedbackText[errorKey as FeedbackKey] ?? feedbackText.create_failed
      : null;
  const formatDateTime = (date: Date | null) =>
    date
      ? new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date)
      : "-";

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

          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} pathname="/users" />
            <ThemeToggle />
            {isAdmin ? (
              <BackupButton
                action={triggerBackupAction}
                locale={locale}
                returnTo="/users"
                source="users"
              />
            ) : null}
          </div>
        </header>

        {backupStatus === "success" || backupStatus === "failed" ? (
          <section
            className={`animate-panel rounded-2xl border px-5 py-4 text-sm font-semibold shadow-sm ${
              backupStatus === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            }`}
          >
            {backupStatus === "success"
              ? locale === "th"
                ? "สำรองข้อมูลเรียบร้อยแล้ว"
                : "Backup completed."
              : locale === "th"
                ? "สำรองข้อมูลไม่สำเร็จ กรุณาตรวจสอบหน้า System"
                : "Backup failed. Please check the System page."}
          </section>
        ) : null}

        {feedbackMessage ? (
          <div
            className={`animate-panel rounded-2xl border px-5 py-4 text-sm font-semibold shadow-sm ${
              created || updated
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
          <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <div className="animate-panel interactive-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center gap-2">
                <UserPlus className="text-blue-700 dark:text-blue-300" size={20} />
                <h2 className="font-bold">{t.createUser}</h2>
              </div>

              <form action={createUserAction} className="space-y-4">
                <input type="hidden" name="lang" value={locale} />
                <label className="block">
                  <span className="text-sm font-bold">{t.username}</span>
                  <input
                    name="username"
                    required
                    minLength={3}
                    pattern="[A-Za-z0-9._-]+"
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder={t.usernamePlaceholder}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold">{t.fullName}</span>
                  <input
                    name="fullName"
                    required
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder={t.fullNamePlaceholder}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold">{t.email}</span>
                  <input
                    name="email"
                    type="email"
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
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
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder={t.passwordPlaceholder}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="block">
                    <span className="text-sm font-bold">{t.role}</span>
                    <select
                      name="roleId"
                      required
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
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
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                      placeholder={t.phonePlaceholder}
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="mb-3 text-sm font-bold">{t.userDetails}</p>
                  <div className="space-y-3">
                    <input
                      name="employeeId"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                      placeholder={t.employeeIdPlaceholder}
                    />
                    <input
                      name="department"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                      placeholder={t.departmentPlaceholder}
                    />
                    <input
                      name="position"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                      placeholder={t.positionPlaceholder}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="interactive-button h-11 w-full rounded-lg bg-blue-700 text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  {t.createButton}
                </button>
              </form>
            </div>

            <div className="animate-panel interactive-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h2 className="font-bold">{t.users}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t.accounts(users.length)}
                </p>
              </div>

              <div className="grid gap-3 p-4 lg:hidden">
                {users.map((user) => (
                  <article
                    key={user.user_id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold">
                          {user.full_name || user.username || user.email}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <UserRound size={13} />
                          {user.username || "-"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Mail size={13} />
                          {user.email}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          user.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {user.is_active ? t.status.active : t.status.disabled}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                        <Shield size={13} />
                        {roleLabel(user.roles.role_name)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        <Phone size={13} />
                        {user.phone || "-"}
                      </span>
                    </div>
                    <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
                      <p>
                        {locale === "th" ? "สร้างเมื่อ" : "Created"}:{" "}
                        {formatDateTime(user.created_at)}
                      </p>
                      <p className="mt-1">
                        {locale === "th" ? "เข้าใช้ล่าสุด" : "Last login"}:{" "}
                        {formatDateTime(user.last_login_at)}
                      </p>
                      <p className="mt-1">
                        {locale === "th" ? "แผนก/ตำแหน่ง" : "Department/position"}:{" "}
                        {[user.engineers[0]?.department, user.engineers[0]?.position]
                          .filter(Boolean)
                          .join(" / ") || "-"}
                      </p>
                    </div>

                    {user.user_id === currentUser.user_id ? (
                      <p className="mt-4 text-xs font-semibold text-slate-400">
                        {t.currentUser}
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <form action={toggleUserStatusAction}>
                            <input type="hidden" name="lang" value={locale} />
                            <input type="hidden" name="userId" value={user.user_id} />
                            <button
                              type="submit"
                              className="interactive-button h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {user.is_active ? t.disable : t.enable}
                            </button>
                          </form>
                          <DeleteUserButton
                            action={deleteUserAction}
                            userId={user.user_id}
                            locale={locale}
                            label={t.delete}
                            confirmMessage={t.confirmDelete}
                          />
                        </div>

                        {user.is_active ? (
                          <form
                            action={sendUserMessageAction}
                            className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                          >
                            <input type="hidden" name="lang" value={locale} />
                            <input type="hidden" name="userId" value={user.user_id} />
                            <label className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                              <MessageSquare size={13} />
                              {messageText.label}
                            </label>
                            <textarea
                              name="message"
                              required
                              rows={2}
                              maxLength={500}
                              placeholder={messageText.placeholder}
                              className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                            />
                            <button
                              type="submit"
                              className="interactive-button mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800"
                            >
                              <Send size={13} />
                              {messageText.send}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    )}
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3">{t.table.user}</th>
                      <th className="px-5 py-3">{t.table.role}</th>
                      <th className="px-5 py-3">{t.table.phone}</th>
                      <th className="px-5 py-3">{t.table.status}</th>
                      <th className="px-5 py-3">{t.table.action}</th>
                    </tr>
                  </thead>
                  <tbody className="stagger-list divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((user) => (
                      <tr key={user.user_id} className="table-row-motion text-sm">
                        <td className="px-5 py-4">
                          <p className="font-bold">
                            {user.full_name || user.username || user.email}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <UserRound size={13} />
                            {user.username || "-"}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Mail size={13} />
                            {user.email}
                          </p>
                          {user.engineers[0]?.employee_id ? (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {user.engineers[0].employee_id}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {locale === "th" ? "สร้างเมื่อ" : "Created"}:{" "}
                            {formatDateTime(user.created_at)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {locale === "th" ? "เข้าใช้ล่าสุด" : "Last login"}:{" "}
                            {formatDateTime(user.last_login_at)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {locale === "th" ? "แผนก/ตำแหน่ง" : "Department/position"}:{" "}
                            {[user.engineers[0]?.department, user.engineers[0]?.position]
                              .filter(Boolean)
                              .join(" / ") || "-"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                            <Shield size={13} />
                            {roleLabel(user.roles.role_name)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <Phone size={13} />
                            {user.phone || "-"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            <BadgeCheck size={13} />
                            {user.is_active ? t.status.active : t.status.disabled}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {user.user_id === currentUser.user_id ? (
                            <span className="text-xs font-semibold text-slate-400">
                              {t.currentUser}
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <form action={toggleUserStatusAction}>
                                <input type="hidden" name="lang" value={locale} />
                                <input
                                  type="hidden"
                                  name="userId"
                                  value={user.user_id}
                                />
                                <button
                                  type="submit"
                                  className="interactive-button h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  {user.is_active ? t.disable : t.enable}
                                </button>
                              </form>
                              <DeleteUserButton
                                action={deleteUserAction}
                                userId={user.user_id}
                                locale={locale}
                                label={t.delete}
                                confirmMessage={t.confirmDelete}
                              />
                              {user.is_active ? (
                                <>
                                  <form
                                    action={sendUserMessageAction}
                                    className="mt-2 w-full min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950"
                                  >
                                    <input type="hidden" name="lang" value={locale} />
                                    <input
                                      type="hidden"
                                      name="userId"
                                      value={user.user_id}
                                    />
                                    <label className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                                      <MessageSquare size={13} />
                                      {messageText.label}
                                    </label>
                                    <textarea
                                      name="message"
                                      required
                                      rows={2}
                                      maxLength={500}
                                      placeholder={messageText.placeholder}
                                      className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                                    />
                                    <button
                                      type="submit"
                                      className="interactive-button mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800"
                                    >
                                      <Send size={13} />
                                      {messageText.send}
                                    </button>
                                  </form>
                                <form
                                  action={sendUserMessageAction}
                                  className="hidden"
                                >
                                  <input type="hidden" name="lang" value={locale} />
                                  <input
                                    type="hidden"
                                    name="userId"
                                    value={user.user_id}
                                  />
                                  <label className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                                    <MessageSquare size={13} />
                                    {locale === "th"
                                      ? "ส่งข้อความถึงผู้ใช้"
                                      : "Message user"}
                                  </label>
                                  <textarea
                                    name="message"
                                    required
                                    rows={2}
                                    maxLength={500}
                                    placeholder={
                                      locale === "th"
                                        ? "พิมพ์ข้อความ..."
                                        : "Type a message..."
                                    }
                                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                                  />
                                  <button
                                    type="submit"
                                    className="interactive-button mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800"
                                  >
                                    <Send size={13} />
                                    {locale === "th" ? "ส่งข้อความ" : "Send"}
                                  </button>
                                </form>
                                </>
                              ) : null}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
