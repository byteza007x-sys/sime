import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Boxes,
  Building2,
  ClipboardList,
  Database,
  History,
  LockKeyhole,
  LogOut,
  Power,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  Users,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { createUserAction, ensureSupportedRoles } from "@/app/users/actions";
import BrandLogo from "@/components/brand-logo";
import LanguageSwitcher from "@/components/language-switcher";
import ThemeToggle from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { getFeatureFlags } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { requireOwner } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { toggleFeatureFlagAction } from "./actions";

export const dynamic = "force-dynamic";

interface OwnerPageProps {
  searchParams: RouteSearchParams;
}

type LogUser = {
  username: string | null;
  full_name: string | null;
  email: string;
} | null;

type RoleOption = {
  role_id: number;
  role_name: string;
};

type UserCreateText = (typeof userCreateCopy)["en"];

const displayUser = (user: LogUser) =>
  user?.full_name || user?.username || user?.email || "System";

const userCreateCopy = {
  en: {
    title: "Add user",
    subtitle: "Create admin, support, or field user accounts from the owner panel.",
    username: "Username",
    usernamePlaceholder: "service-user",
    fullName: "Full name",
    fullNamePlaceholder: "Service User",
    email: "Email (optional)",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    role: "Role",
    phone: "Phone",
    phonePlaceholder: "099-000-0000",
    userDetails: "Work profile",
    employeeIdPlaceholder: "Employee ID, e.g. USER-002",
    departmentPlaceholder: "Department",
    positionPlaceholder: "Position",
    submit: "Create user",
    created: "User account was created successfully.",
    errors: {
      username: "Username must be at least 3 characters.",
      email: "Email format is invalid.",
      password: "Password must be at least 8 characters.",
      role: "Please choose a supported role.",
      duplicate_username: "This username is already used by another account.",
      duplicate_email: "This email is already used by another account.",
      employee: "Employee ID already exists.",
      reserved_user: "This username is reserved.",
      create_failed: "Could not create this user. Please check the form and try again.",
    },
    roles: {
      admin: "Admin",
      support: "Support",
      user: "User",
    },
  },
  th: {
    title: "เพิ่มผู้ใช้",
    subtitle: "สร้างบัญชี admin, support หรือช่างจากหน้า owner ได้ทันที",
    username: "Username",
    usernamePlaceholder: "service-user",
    fullName: "ชื่อ-นามสกุล",
    fullNamePlaceholder: "ผู้ใช้ระบบบริการ",
    email: "Email (ไม่บังคับ)",
    password: "รหัสผ่าน",
    passwordPlaceholder: "อย่างน้อย 8 ตัวอักษร",
    role: "สิทธิ์",
    phone: "เบอร์โทร",
    phonePlaceholder: "099-000-0000",
    userDetails: "ข้อมูลการทำงาน",
    employeeIdPlaceholder: "รหัสพนักงาน เช่น USER-002",
    departmentPlaceholder: "แผนก",
    positionPlaceholder: "ตำแหน่ง",
    submit: "สร้างผู้ใช้",
    created: "สร้างผู้ใช้สำเร็จแล้ว",
    errors: {
      username: "Username ต้องมีอย่างน้อย 3 ตัวอักษร",
      email: "รูปแบบ Email ไม่ถูกต้อง",
      password: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
      role: "กรุณาเลือกสิทธิ์ที่ระบบรองรับ",
      duplicate_username: "Username นี้มีคนใช้ไปแล้ว กรุณาใช้ชื่ออื่น",
      duplicate_email: "Email นี้มีคนใช้ไปแล้ว กรุณาใช้ Email อื่น",
      employee: "รหัสพนักงานนี้มีอยู่แล้ว",
      reserved_user: "Username นี้ถูกสงวนไว้",
      create_failed: "สร้างผู้ใช้ไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่",
    },
    roles: {
      admin: "แอดมิน",
      support: "Support",
      user: "ผู้ใช้",
    },
  },
} satisfies Record<
  Locale,
  {
    title: string;
    subtitle: string;
    username: string;
    usernamePlaceholder: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    password: string;
    passwordPlaceholder: string;
    role: string;
    phone: string;
    phonePlaceholder: string;
    userDetails: string;
    employeeIdPlaceholder: string;
    departmentPlaceholder: string;
    positionPlaceholder: string;
    submit: string;
    created: string;
    errors: Record<string, string>;
    roles: Record<string, string>;
  }
>;

export default async function OwnerPage({ searchParams }: OwnerPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const owner = await requireUser(locale);
  requireOwner(owner, locale);
  await ensureSupportedRoles();

  const isThai = locale === "th";
  const userText = userCreateCopy[locale];
  const updatedFeature = Array.isArray(params.updated) ? params.updated[0] : params.updated;
  const enabledValue = Array.isArray(params.enabled) ? params.enabled[0] : params.enabled;
  const created = Boolean(
    Array.isArray(params.created) ? params.created[0] : params.created,
  );
  const errorKey = String(
    Array.isArray(params.error) ? params.error[0] : params.error ?? "",
  );
  const userErrors: Record<string, string> = userText.errors;
  const userFeedback = created
    ? userText.created
    : errorKey
      ? userErrors[errorKey] ?? userText.errors.create_failed
      : null;

  const [
    features,
    counts,
    recentLogs,
    recentReports,
    recentUsers,
    recentCustomers,
    recentInventory,
    roles,
  ] = await Promise.all([
    getFeatureFlags(),
    Promise.all([
      prisma.service_reports.count(),
      prisma.customers.count(),
      prisma.inventory.count(),
      prisma.users.count(),
    ]),
    prisma.audit_logs.findMany({
      include: {
        users: {
          select: {
            username: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 12,
    }),
    prisma.service_reports.findMany({
      select: {
        report_id: true,
        job_number: true,
        service_type: true,
        status: true,
        created_at: true,
        created_by_user: {
          select: {
            username: true,
            full_name: true,
            email: true,
          },
        },
        customers: {
          select: {
            company_name: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 8,
    }),
    prisma.users.findMany({
      include: {
        roles: true,
        engineers: true,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 10,
    }),
    prisma.customers.findMany({
      select: {
        customer_id: true,
        sap_bp_code: true,
        company_name: true,
        phone: true,
      },
      orderBy: {
        updated_at: "desc",
      },
      take: 10,
    }),
    prisma.inventory.findMany({
      select: {
        inventory_id: true,
        serial_number: true,
        sap_is_active: true,
        equipment_master: {
          select: {
            sap_item_no: true,
            model: true,
            description: true,
          },
        },
      },
      orderBy: {
        updated_at: "desc",
      },
      take: 10,
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
  const [reportCount, customerCount, inventoryCount, userCount] = counts;
  const updatedLabel = features.find((feature) => feature.key === updatedFeature)?.label;
  const roleLabels: Record<string, string> = userText.roles;
  const roleLabel = (roleName: string) => roleLabels[roleName] ?? roleName;

  const formatDateTime = (date: Date | null) =>
    date
      ? new Intl.DateTimeFormat(isThai ? "th-TH" : "en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date)
      : "-";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm dark:border-slate-800">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href={withLocale("/reports", locale)}
                className="interactive-button mb-5 inline-flex items-center gap-2 text-sm font-bold text-blue-200"
              >
                <ArrowLeft size={16} />
                {isThai ? "ใบเซอร์วิซ" : "Service reports"}
              </Link>
              <div className="flex items-start gap-4">
                <BrandLogo size={56} priority className="rounded-2xl" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-200">
                    Owner Control
                  </p>
                  <h1 className="mt-1 text-3xl font-bold">
                    {isThai ? "ผู้ดูแลระบบสูงสุด" : "System Owner"}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                    {isThai
                      ? "ศูนย์ควบคุมของเจ้าของระบบ ดู log ดูข้อมูลหลัก เปิด/ปิดระบบ และเพิ่มผู้ใช้ได้จากหน้าเดียว"
                      : "Owner center for logs, master data overview, feature switches, and user creation."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <LanguageSwitcher locale={locale} pathname="/owner" />
              <ThemeToggle />
              <form action={logoutAction}>
                <input type="hidden" name="lang" value={locale} />
                <button
                  type="submit"
                  className="interactive-button inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  <LogOut size={17} />
                  {isThai ? "ออกจากระบบ" : "Logout"}
                </button>
              </form>
            </div>
          </div>
        </header>

        {updatedLabel ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            {isThai
              ? `${enabledValue === "1" ? "เปิด" : "ปิด"}ระบบ ${updatedLabel} สำเร็จ`
              : `${updatedLabel} was ${enabledValue === "1" ? "enabled" : "disabled"}.`}
          </section>
        ) : null}

        {userFeedback ? (
          <section
            className={[
              "rounded-2xl border px-5 py-4 text-sm font-bold",
              created
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
            ].join(" ")}
          >
            {userFeedback}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <OwnerStat
            icon={<Activity size={20} />}
            label={isThai ? "ใบเซอร์วิซ" : "Reports"}
            value={reportCount}
          />
          <OwnerStat
            icon={<ShieldCheck size={20} />}
            label={isThai ? "ลูกค้า" : "Customers"}
            value={customerCount}
          />
          <OwnerStat
            icon={<Database size={20} />}
            label={isThai ? "อุปกรณ์" : "Inventory"}
            value={inventoryCount}
          />
          <OwnerStat
            icon={<LockKeyhole size={20} />}
            label={isThai ? "ผู้ใช้ทั้งหมด" : "Users"}
            value={userCount}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <OwnerPanel
            icon={<UserPlus size={22} />}
            title={userText.title}
            subtitle={userText.subtitle}
          >
            <OwnerCreateUserForm
              locale={locale}
              roleLabel={roleLabel}
              roles={roles}
              text={userText}
            />
          </OwnerPanel>

          <OwnerPanel
            icon={<Power size={22} />}
            title={isThai ? "เปิด / ปิดระบบหลัก" : "Feature switches"}
            subtitle={
              isThai
                ? "ปิดแล้วผู้ใช้ทั่วไปและแอดมินจะเข้าไม่ได้ แต่ owner ยังเข้าได้เสมอ"
                : "Disabled features are blocked for users and admins. Owner access remains available."
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              {features.map((feature) => (
                <article
                  key={feature.key}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold">{feature.label}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {feature.description}
                      </p>
                    </div>
                    <StatusBadge
                      enabled={feature.isEnabled}
                      enabledLabel={isThai ? "เปิดอยู่" : "Enabled"}
                      disabledLabel={isThai ? "ปิดอยู่" : "Disabled"}
                    />
                  </div>

                  <form action={toggleFeatureFlagAction} className="mt-4">
                    <input type="hidden" name="lang" value={locale} />
                    <input type="hidden" name="featureKey" value={feature.key} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={feature.isEnabled ? "0" : "1"}
                    />
                    <button
                      type="submit"
                      className={[
                        "interactive-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-white",
                        feature.isEnabled
                          ? "bg-rose-600 hover:bg-rose-700"
                          : "bg-emerald-600 hover:bg-emerald-700",
                      ].join(" ")}
                    >
                      {feature.isEnabled ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                      {feature.isEnabled
                        ? isThai
                          ? "ปิดระบบนี้"
                          : "Disable"
                        : isThai
                          ? "เปิดระบบนี้"
                          : "Enable"}
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </OwnerPanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <OwnerPanel
            icon={<History size={22} />}
            title={isThai ? "Log ล่าสุดของระบบ" : "Latest system logs"}
            subtitle={isThai ? "ดูว่าใครทำอะไรในระบบล่าสุด" : "See who recently did what."}
          >
            <div className="space-y-3">
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div
                    key={log.log_id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold">{log.action || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {displayUser(log.users)} | {log.table_name || "-"} |{" "}
                          {log.record_id || "-"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyLine label={isThai ? "ยังไม่มี log" : "No logs yet"} />
              )}
            </div>
          </OwnerPanel>

          <OwnerPanel
            icon={<Users size={22} />}
            title={isThai ? "ผู้ใช้ล่าสุด" : "Latest users"}
            subtitle={isThai ? "รวมบัญชี owner ที่ซ่อนจากหน้าผู้ใช้" : "Includes hidden owner account."}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {recentUsers.map((item) => (
                <div
                  key={item.user_id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                >
                  <p className="font-bold">{item.full_name || item.username || item.email}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    @{item.username || "-"} | {item.email}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                      {roleLabel(item.roles.role_name)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                      {item.is_active
                        ? isThai
                          ? "ใช้งาน"
                          : "Active"
                        : isThai
                          ? "ปิดใช้"
                          : "Disabled"}
                    </span>
                    {item.engineers[0]?.employee_id ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        {item.engineers[0].employee_id}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </OwnerPanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <OwnerPanel
            icon={<ClipboardList size={22} />}
            title={isThai ? "ใบเซอร์วิซล่าสุด" : "Latest service reports"}
            subtitle={isThai ? "แสดงผู้เขียน/ผู้สร้างใบงาน" : "Shows who created each report."}
          >
            <CompactList>
              {recentReports.map((report) => (
                <CompactItem
                  key={report.report_id}
                  href={withLocale(`/reports/${report.report_id}`, locale)}
                  title={report.job_number}
                  meta={`${report.customers.company_name} | ${report.status || "-"} | ${
                    isThai ? "ผู้เขียน" : "Created by"
                  }: ${displayUser(report.created_by_user)}`}
                />
              ))}
            </CompactList>
          </OwnerPanel>

          <OwnerPanel
            icon={<Building2 size={22} />}
            title={isThai ? "ลูกค้าล่าสุด" : "Latest customers"}
            subtitle={isThai ? "ข้อมูลลูกค้าจาก SAP" : "Customer master data from SAP."}
          >
            <CompactList>
              {recentCustomers.map((customer) => (
                <CompactItem
                  key={customer.customer_id}
                  href={withLocale("/customers", locale)}
                  title={customer.company_name}
                  meta={[customer.sap_bp_code, customer.phone].filter(Boolean).join(" | ") || "-"}
                />
              ))}
            </CompactList>
          </OwnerPanel>
        </section>

        <OwnerPanel
          icon={<Boxes size={22} />}
          title={isThai ? "อุปกรณ์ล่าสุด" : "Latest inventory"}
          subtitle={isThai ? "Model และ Serial ที่อัปเดตล่าสุด" : "Recently updated models and serials."}
        >
          <CompactList>
            {recentInventory.map((item) => (
              <CompactItem
                key={item.inventory_id}
                href={withLocale("/inventory", locale)}
                title={
                  item.equipment_master.model ||
                  item.equipment_master.description ||
                  item.equipment_master.sap_item_no ||
                  "-"
                }
                meta={`${item.equipment_master.sap_item_no || "-"} | ${item.serial_number} | ${
                  item.sap_is_active === false
                    ? isThai
                      ? "ซ่อน"
                      : "Hidden"
                    : isThai
                      ? "ใช้งาน"
                      : "Active"
                }`}
              />
            ))}
          </CompactList>
        </OwnerPanel>
      </div>
    </main>
  );
}

function OwnerCreateUserForm({
  locale,
  roles,
  roleLabel,
  text,
}: {
  locale: Locale;
  roles: RoleOption[];
  roleLabel: (roleName: string) => string;
  text: UserCreateText;
}) {
  return (
    <form action={createUserAction} className="space-y-4">
      <input type="hidden" name="lang" value={locale} />
      <input type="hidden" name="returnTo" value="owner" />

      <label className="block">
        <span className="text-sm font-bold">{text.username}</span>
        <input
          name="username"
          required
          minLength={3}
          pattern="[A-Za-z0-9._-]+"
          className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
          placeholder={text.usernamePlaceholder}
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold">{text.fullName}</span>
        <input
          name="fullName"
          required
          className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
          placeholder={text.fullNamePlaceholder}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold">{text.email}</span>
          <input
            name="email"
            type="email"
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
            placeholder="user@e-service.local"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">{text.phone}</span>
          <input
            name="phone"
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
            placeholder={text.phonePlaceholder}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold">{text.password}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
            placeholder={text.passwordPlaceholder}
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">{text.role}</span>
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
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="mb-3 text-sm font-bold">{text.userDetails}</p>
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          <input
            name="employeeId"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
            placeholder={text.employeeIdPlaceholder}
          />
          <input
            name="department"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
            placeholder={text.departmentPlaceholder}
          />
          <input
            name="position"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
            placeholder={text.positionPlaceholder}
          />
        </div>
      </div>

      <button
        type="submit"
        className="interactive-button h-11 w-full rounded-lg bg-blue-700 text-sm font-bold text-white transition hover:bg-blue-800"
      >
        {text.submit}
      </button>
    </form>
  );
}

function OwnerStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
        <span className="text-blue-700 dark:text-blue-300">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function OwnerPanel({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
          {icon}
        </div>
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function StatusBadge({
  enabled,
  enabledLabel,
  disabledLabel,
}: {
  enabled: boolean;
  enabledLabel: string;
  disabledLabel: string;
}) {
  return (
    <span
      className={[
        "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
        enabled
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
          : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200",
      ].join(" ")}
    >
      {enabled ? enabledLabel : disabledLabel}
    </span>
  );
}

function CompactList({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function CompactItem({
  href,
  title,
  meta,
}: {
  href: string;
  title: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="interactive-button block rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
    >
      <p className="line-clamp-1 text-sm font-bold">{title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{meta}</p>
    </Link>
  );
}

function EmptyLine({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
      {label}
    </div>
  );
}
