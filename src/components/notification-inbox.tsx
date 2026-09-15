import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { markNotificationsReadAction } from "@/app/notifications/actions";
import type { Locale } from "@/lib/i18n";

interface NotificationInboxItem {
  notification_id: number;
  notification_type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: Date | null;
  created_at: Date;
}

interface NotificationInboxProps {
  compact?: boolean;
  locale: Locale;
  notifications: NotificationInboxItem[];
}

const copy = {
  en: {
    title: "Notifications",
    subtitle: "Latest work updates",
    empty: "No notifications yet",
    markRead: "Mark all read",
    unread: "unread",
  },
  th: {
    title: "แจ้งเตือน",
    subtitle: "อัปเดตงานล่าสุด",
    empty: "ยังไม่มีแจ้งเตือน",
    markRead: "อ่านทั้งหมดแล้ว",
    unread: "ยังไม่อ่าน",
  },
} satisfies Record<Locale, Record<string, string>>;

const thaiCopy = {
  title: "แจ้งเตือน",
  subtitle: "อัปเดตงานและข้อความล่าสุด",
  empty: "ยังไม่มีแจ้งเตือน",
  markRead: "อ่านทั้งหมดแล้ว",
  unread: "ยังไม่อ่าน",
} satisfies typeof copy.en;

const iconFor = (type: string) => {
  switch (type) {
    case "Report_Approved":
      return <CheckCircle2 size={18} className="text-emerald-600" />;
    case "Report_Need_Revision":
      return <RotateCcw size={18} className="text-rose-600" />;
    case "Report_Submitted":
      return <AlertTriangle size={18} className="text-violet-600" />;
    case "Job_Assigned":
      return <Wrench size={18} className="text-blue-600" />;
    default:
      return <Bell size={18} className="text-slate-500" />;
  }
};

const formatTime = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

export default function NotificationInbox({
  compact = false,
  locale,
  notifications,
}: NotificationInboxProps) {
  const t = locale === "th" ? thaiCopy : copy.en;
  const unreadCount = notifications.filter((item) => item.read_at === null).length;

  return (
    <section className="animate-panel interactive-card rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">{t.title}</h2>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900">
                {unreadCount} {t.unread}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.subtitle}
          </p>
        </div>

        <form action={markNotificationsReadAction}>
          <input type="hidden" name="lang" value={locale} />
          <button
            type="submit"
            disabled={unreadCount === 0}
            className="interactive-button rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t.markRead}
          </button>
        </form>
      </div>

      {notifications.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <Bell className="mx-auto mb-2 text-slate-300" size={30} />
          {t.empty}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.slice(0, compact ? 4 : 6).map((item) => {
            const content = (
              <>
                <div className="mt-0.5 shrink-0">{iconFor(item.notification_type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </p>
                    {item.read_at === null ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    ) : null}
                  </div>
                  {item.body ? (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {item.body}
                    </p>
                  ) : null}
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <Clock3 size={12} />
                    {formatTime(item.created_at, locale)}
                  </p>
                </div>
              </>
            );

            return item.link_url ? (
              <Link
                key={item.notification_id}
                href={item.link_url}
                className="table-row-motion flex gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/70"
              >
                {content}
              </Link>
            ) : (
              <div key={item.notification_id} className="flex gap-3 px-5 py-3">
                {content}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
