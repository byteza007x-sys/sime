"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Clock3,
  FileSignature,
  Grid2X2,
  ImageUp,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  ScrollText,
  Save,
  Send,
  Shield,
  Table2,
  UserRound,
  X,
} from "lucide-react";
import DeleteUserButton from "@/components/delete-user-button";
import {
  deleteUserAction,
  sendUserMessageAction,
  toggleUserStatusAction,
  updateUserProfileAction,
} from "@/app/users/actions";

export interface DirectoryUser {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  phone: string;
  roleName: string;
  roleLabel: string;
  isActive: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
  engineer: {
    employeeId: string;
    name: string;
    phone: string;
    department: string;
    position: string;
    status: string;
    avatarUrl: string;
    signatureUrl: string;
  };
  stats: {
    createdJobs: number;
    assignedJobs: number;
    activeJobs: number;
    submittedJobs: number;
    approvedJobs: number;
    closedJobs: number;
  };
  recentReports: Array<{
    reportId: string;
    jobNumber: string;
    status: string;
    priority: string;
    serviceType: string;
    customer: string;
    site: string;
    updatedAt: string | null;
  }>;
  recentLogs: Array<{
    id: number;
    action: string;
    table: string;
    recordId: string;
    createdAt: string | null;
    summary: string;
  }>;
}

interface UserDirectoryText {
  users: string;
  accounts: string;
  grid: string;
  table: string;
  details: string;
  allReports: string;
  profile: string;
  workStats: string;
  recentJobs: string;
  activityLog: string;
  editProfile: string;
  saveProfile: string;
  fullName: string;
  profilePhoto: string;
  photoHint: string;
  staffSignature: string;
  signatureHint: string;
  signatureReady: string;
  cancel: string;
  role: string;
  phone: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
  status: string;
  created: string;
  lastLogin: string;
  active: string;
  disabled: string;
  currentUser: string;
  disable: string;
  enable: string;
  delete: string;
  confirmDelete: string;
  messageUser: string;
  messagePlaceholder: string;
  send: string;
  noData: string;
  stats: {
    created: string;
    assigned: string;
    active: string;
    submitted: string;
    approved: string;
    closed: string;
  };
  tableHeaders: {
    user: string;
    role: string;
    phone: string;
    status: string;
    stats: string;
    action: string;
  };
}

interface UserDirectoryProps {
  users: DirectoryUser[];
  currentUserId: string;
  locale: "en" | "th";
  text: UserDirectoryText;
}

const formatDate = (value: string | null, locale: "en" | "th", fallback: string) => {
  if (!value) return fallback;

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const initials = (user: DirectoryUser) =>
  (user.fullName || user.username || user.email || "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const statusTone = (status: string) => {
  if (["Approved", "Closed", "Completed"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900";
  }
  if (status === "Submitted") {
    return "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-900";
  }
  if (status === "Cancelled") {
    return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-900";
  }

  return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900";
};

function Avatar({
  user,
  large = false,
  card = false,
}: {
  user: DirectoryUser;
  large?: boolean;
  card?: boolean;
}) {
  const sizeClass = card
    ? "h-32 w-28 sm:h-36 sm:w-32"
    : large
      ? "h-24 w-24"
      : "h-14 w-14";

  return (
    <div
      className={`${sizeClass} relative shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-sky-500 to-emerald-400 p-[2px] shadow-lg shadow-blue-900/10`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-950">
        <div className="flex h-full w-full items-center justify-center bg-slate-950 text-lg font-black text-white">
          {initials(user)}
        </div>
        {user.engineer.avatarUrl ? (
          <img
            src={user.engineer.avatarUrl}
            alt={user.fullName || user.username || user.email}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
      </div>
    </div>
  );
}

function UserActions({
  user,
  currentUserId,
  locale,
  text,
}: {
  user: DirectoryUser;
  currentUserId: string;
  locale: "en" | "th";
  text: UserDirectoryText;
}) {
  if (user.userId === currentUserId) {
    return <span className="text-xs font-semibold text-slate-400">{text.currentUser}</span>;
  }

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <form action={toggleUserStatusAction}>
          <input type="hidden" name="lang" value={locale} />
          <input type="hidden" name="userId" value={user.userId} />
          <button className="interactive-button h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            {user.isActive ? text.disable : text.enable}
          </button>
        </form>
        <DeleteUserButton
          action={deleteUserAction}
          userId={user.userId}
          locale={locale}
          label={text.delete}
          confirmMessage={text.confirmDelete}
        />
      </div>
      {user.isActive ? (
        <form
          action={sendUserMessageAction}
          className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
        >
          <input type="hidden" name="lang" value={locale} />
          <input type="hidden" name="userId" value={user.userId} />
          <label className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            <MessageSquare size={13} />
            {text.messageUser}
          </label>
          <textarea
            name="message"
            required
            rows={2}
            maxLength={500}
            placeholder={text.messagePlaceholder}
            className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
          />
          <button className="interactive-button mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800">
            <Send size={13} />
            {text.send}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function EditProfileForm({
  user,
  locale,
  text,
  onCancel,
}: {
  user: DirectoryUser;
  locale: "en" | "th";
  text: UserDirectoryText;
  onCancel: () => void;
}) {
  const inputClass =
    "mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-950";

  return (
    <form
      action={updateUserProfileAction}
      encType="multipart/form-data"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
    >
      <input type="hidden" name="lang" value={locale} />
      <input type="hidden" name="userId" value={user.userId} />

      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black">
              <ImageUp size={19} className="text-blue-700 dark:text-blue-300" />
              {text.editProfile}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              @{user.username || "-"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="interactive-button inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={text.cancel}
          title={text.cancel}
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {text.fullName}
          <input
            name="fullName"
            defaultValue={user.fullName}
            maxLength={150}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {text.email}
          <input
            type="email"
            name="email"
            required
            defaultValue={user.email}
            maxLength={255}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {text.phone}
          <input
            name="phone"
            defaultValue={user.phone || user.engineer.phone}
            maxLength={30}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {text.employeeId}
          <input
            name="employeeId"
            defaultValue={user.engineer.employeeId}
            maxLength={50}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {text.department}
          <input
            name="department"
            defaultValue={user.engineer.department}
            maxLength={100}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {text.position}
          <input
            name="position"
            defaultValue={user.engineer.position}
            maxLength={100}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">
          {text.profilePhoto}
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="mt-1 block min-h-11 w-full cursor-pointer rounded-xl border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:border-blue-500 dark:border-blue-900 dark:bg-blue-950/40 dark:text-slate-200"
          />
          <span className="mt-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {text.photoHint}
          </span>
        </label>

        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">
          <span className="flex items-center gap-2">
            <FileSignature size={15} className="text-blue-700 dark:text-blue-300" />
            {text.staffSignature}
          </span>
          {user.engineer.signatureUrl ? (
            <span className="mt-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
              <img
                src={user.engineer.signatureUrl}
                alt={text.staffSignature}
                className="h-16 w-32 rounded-lg bg-white object-contain"
              />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {text.signatureReady}
              </span>
            </span>
          ) : null}
          <input
            type="file"
            name="staffSignature"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="mt-2 block min-h-11 w-full cursor-pointer rounded-xl border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:border-blue-500 dark:border-blue-900 dark:bg-blue-950/40 dark:text-slate-200"
          />
          <span className="mt-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {text.signatureHint}
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-950">
        <button
          type="button"
          onClick={onCancel}
          className="interactive-button h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {text.cancel}
        </button>
        <button className="interactive-button inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-sm hover:bg-blue-800">
          <Save size={16} />
          {text.saveProfile}
        </button>
      </div>
    </form>
  );
}

export default function UserDirectory({
  users,
  currentUserId,
  locale,
  text,
}: UserDirectoryProps) {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"summary" | "reports">("summary");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const selectedUser = useMemo(
    () => users.find((user) => user.userId === selectedId) ?? null,
    [selectedId, users],
  );

  const openUser = (userId: string) => {
    setSelectedId(userId);
    setModalTab("summary");
    setIsEditingProfile(false);
  };

  return (
    <div className="animate-panel interactive-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">{text.users}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{text.accounts}</p>
        </div>
        <div className="inline-grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`interactive-button inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold ${
              view === "grid"
                ? "bg-blue-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900"
            }`}
          >
            <Grid2X2 size={16} />
            {text.grid}
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`interactive-button inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold ${
              view === "table"
                ? "bg-blue-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900"
            }`}
          >
            <Table2 size={16} />
            {text.table}
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
          {users.map((user) => (
            <article
              key={user.userId}
              className="group flex min-h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-lg dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-900 dark:hover:bg-slate-900"
            >
              <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[128px_minmax(0,1fr)]">
                <Avatar user={user} card />
                <div className="min-w-0 py-1">
                  <h3 className="truncate text-lg font-black">
                    {user.fullName || user.username || user.email}
                  </h3>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                    @{user.username || "-"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                      <Shield size={13} />
                      {user.roleLabel}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        user.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      <BadgeCheck size={13} />
                      {user.isActive ? text.active : text.disabled}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    <p className="flex min-w-0 items-center gap-2">
                      <Mail size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate">{user.email}</span>
                    </p>
                    <p className="flex min-w-0 items-center gap-2">
                      <Phone size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate">
                        {user.phone || user.engineer.phone || "-"}
                      </span>
                    </p>
                    <p className="flex min-w-0 items-center gap-2">
                      <UserRound size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate">
                        {[user.engineer.department, user.engineer.position]
                          .filter(Boolean)
                          .join(" / ") || "-"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-3 text-center dark:divide-slate-800 dark:border-slate-800">
                <div className="px-2">
                  <p className="text-lg font-black">{user.stats.activeJobs}</p>
                  <p className="text-[11px] font-bold text-slate-500">{text.stats.active}</p>
                </div>
                <div className="px-2">
                  <p className="text-lg font-black">{user.stats.submittedJobs}</p>
                  <p className="text-[11px] font-bold text-slate-500">{text.stats.submitted}</p>
                </div>
                <div className="px-2">
                  <p className="text-lg font-black">{user.stats.approvedJobs}</p>
                  <p className="text-[11px] font-bold text-slate-500">{text.stats.approved}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openUser(user.userId)}
                className="interactive-button mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                <ScrollText size={16} />
                {text.details}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">{text.tableHeaders.user}</th>
                <th className="px-5 py-3">{text.tableHeaders.role}</th>
                <th className="px-5 py-3">{text.tableHeaders.phone}</th>
                <th className="px-5 py-3">{text.tableHeaders.status}</th>
                <th className="px-5 py-3">{text.tableHeaders.stats}</th>
                <th className="px-5 py-3">{text.tableHeaders.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user) => (
                <tr key={user.userId} className="text-sm">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} />
                      <div>
                        <p className="font-black">{user.fullName || user.username || user.email}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          @{user.username || "-"} / {user.engineer.employeeId || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                      <Shield size={13} />
                      {user.roleLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Phone size={13} />
                      {user.phone || user.engineer.phone || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        user.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      <BadgeCheck size={13} />
                      {user.isActive ? text.active : text.disabled}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-500">
                    {text.stats.active}: {user.stats.activeJobs} / {text.stats.approved}:{" "}
                    {user.stats.approvedJobs}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => openUser(user.userId)}
                      className="interactive-button inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-800"
                    >
                      <ScrollText size={14} />
                      {text.details}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
            >
              <div className="max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <Avatar user={selectedUser} large />
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase text-blue-700 dark:text-blue-300">
                        {text.profile}
                      </p>
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-2xl font-black">
                          {selectedUser.fullName || selectedUser.username || selectedUser.email}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(true)}
                          className="interactive-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900"
                          aria-label={text.editProfile}
                          title={text.editProfile}
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        @{selectedUser.username || "-"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                          <Shield size={13} />
                          {selectedUser.roleLabel}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
                            selectedUser.isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <BadgeCheck size={13} />
                          {selectedUser.isActive ? text.active : text.disabled}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="inline-grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => setModalTab("summary")}
                        className={`interactive-button h-10 rounded-lg px-3 text-sm font-black ${
                          modalTab === "summary"
                            ? "bg-blue-700 text-white shadow-sm"
                            : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900"
                        }`}
                      >
                        {text.workStats}
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalTab("reports")}
                        className={`interactive-button h-10 rounded-lg px-3 text-sm font-black ${
                          modalTab === "reports"
                            ? "bg-blue-700 text-white shadow-sm"
                            : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900"
                        }`}
                      >
                        {text.allReports}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setSelectedId(null);
                      }}
                      className="interactive-button inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="max-h-[calc(94vh-132px)] overflow-y-auto bg-slate-50 p-5 dark:bg-slate-950">
                  <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
                    <aside>
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <InfoLine icon={<Mail size={15} />} label={text.email} value={selectedUser.email} />
                        <InfoLine
                          icon={<Phone size={15} />}
                          label={text.phone}
                          value={selectedUser.phone || selectedUser.engineer.phone || "-"}
                        />
                        <InfoLine
                          icon={<BadgeCheck size={15} />}
                          label={text.employeeId}
                          value={selectedUser.engineer.employeeId || "-"}
                        />
                        <InfoLine
                          icon={<UserRound size={15} />}
                          label={text.department}
                          value={selectedUser.engineer.department || "-"}
                        />
                        <InfoLine
                          icon={<Shield size={15} />}
                          label={text.position}
                          value={selectedUser.engineer.position || "-"}
                        />
                        <InfoLine
                          icon={<Clock3 size={15} />}
                          label={text.lastLogin}
                          value={formatDate(selectedUser.lastLoginAt, locale, text.noData)}
                        />
                      </div>
                    </aside>

                    <section className="space-y-4">
                      {modalTab === "summary" ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <StatTile label={text.stats.created} value={selectedUser.stats.createdJobs} />
                            <StatTile label={text.stats.assigned} value={selectedUser.stats.assignedJobs} />
                            <StatTile label={text.stats.active} value={selectedUser.stats.activeJobs} />
                            <StatTile label={text.stats.submitted} value={selectedUser.stats.submittedJobs} />
                            <StatTile label={text.stats.approved} value={selectedUser.stats.approvedJobs} />
                            <StatTile label={text.stats.closed} value={selectedUser.stats.closedJobs} />
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <h4 className="flex items-center gap-2 font-black">
                              <BarChart3 size={18} />
                              {text.recentJobs}
                            </h4>
                            <ReportList
                              reports={selectedUser.recentReports.slice(0, 6)}
                              locale={locale}
                              text={text}
                              userId={selectedUser.userId}
                            />
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <h4 className="flex items-center gap-2 font-black">
                              <Activity size={18} />
                              {text.activityLog}
                            </h4>
                            <ActivityLogList
                              logs={selectedUser.recentLogs}
                              locale={locale}
                              text={text}
                              userId={selectedUser.userId}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                          <h4 className="flex items-center gap-2 font-black">
                            <ScrollText size={18} />
                            {text.allReports}
                          </h4>
                          <ReportList
                            reports={selectedUser.recentReports}
                            locale={locale}
                            text={text}
                            userId={selectedUser.userId}
                            dense
                          />
                        </div>
                      )}

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <UserActions
                          user={selectedUser}
                          currentUserId={currentUserId}
                          locale={locale}
                          text={text}
                        />
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {isEditingProfile ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm">
                  <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto">
                    <EditProfileForm
                      key={selectedUser.userId}
                      user={selectedUser}
                      locale={locale}
                      text={text}
                      onCancel={() => setIsEditingProfile(false)}
                    />
                  </div>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ReportList({
  reports,
  locale,
  text,
  userId,
  dense = false,
}: {
  reports: DirectoryUser["recentReports"];
  locale: "en" | "th";
  text: UserDirectoryText;
  userId: string;
  dense?: boolean;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
      {reports.length === 0 ? (
        <p className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
          {text.noData}
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {reports.map((report) => (
            <div
              key={`${userId}-${report.reportId}`}
              className={`grid gap-3 px-4 py-3 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-900 ${
                dense
                  ? "md:grid-cols-[120px_minmax(0,1fr)_150px_170px]"
                  : "md:grid-cols-[110px_minmax(0,1fr)_140px_160px]"
              } md:items-center`}
            >
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Job
                </p>
                <p className="font-black text-slate-950 dark:text-white">
                  {report.jobNumber}
                </p>
              </div>

              <div className="min-w-0">
                <p className="truncate font-bold text-slate-800 dark:text-slate-100">
                  {report.customer}
                </p>
                {report.site ? (
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {report.site}
                  </p>
                ) : null}
              </div>

              <div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusTone(
                    report.status,
                  )}`}
                >
                  {report.status}
                </span>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {report.priority}
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                <p>{report.serviceType}</p>
                <p className="mt-1">{formatDate(report.updatedAt, locale, text.noData)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityLogList({
  logs,
  locale,
  text,
  userId,
}: {
  logs: DirectoryUser["recentLogs"];
  locale: "en" | "th";
  text: UserDirectoryText;
  userId: string;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
      {logs.length === 0 ? (
        <p className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
          {text.noData}
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {logs.map((log) => (
            <div
              key={`${userId}-${log.id}`}
              className="grid gap-3 px-4 py-3 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-900 md:grid-cols-[160px_160px_minmax(0,1fr)_160px] md:items-center"
            >
              <div>
                <p className="font-black text-slate-950 dark:text-white">
                  {log.action || "-"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Action
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                <p className="truncate">{log.table || "-"}</p>
                <p className="mt-1 truncate">{log.recordId || "-"}</p>
              </div>
              <p className="min-w-0 break-words text-sm text-slate-600 dark:text-slate-300">
                {log.summary || "-"}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {formatDate(log.createdAt, locale, text.noData)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
      <span className="mt-0.5 text-blue-700 dark:text-blue-300">{icon}</span>
      <span>
        <span className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="mt-0.5 block font-semibold text-slate-800 dark:text-slate-100">
          {value}
        </span>
      </span>
    </div>
  );
}
