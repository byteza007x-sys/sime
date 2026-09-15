"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Clock3, RotateCcw, Wrench } from "lucide-react";
import { markNotificationsReadAction } from "@/app/notifications/actions";
import type { Locale } from "@/lib/i18n";

interface NotificationBellItem {
  notification_id: number;
  notification_type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: Date | null;
  created_at: Date;
}

interface NotificationBellProps {
  locale: Locale;
  notifications: NotificationBellItem[];
}

const text = {
  en: {
    title: "Notifications",
    empty: "No notifications yet",
    markRead: "Mark all read",
    aria: "Notifications",
  },
  th: {
    title: "แจ้งเตือน",
    empty: "ยังไม่มีแจ้งเตือน",
    markRead: "อ่านทั้งหมดแล้ว",
    aria: "แจ้งเตือน",
  },
} satisfies Record<Locale, Record<string, string>>;

const iconFor = (type: string) => {
  switch (type) {
    case "Report_Approved":
      return <CheckCircle2 size={17} className="text-emerald-600" />;
    case "Report_Need_Revision":
      return <RotateCcw size={17} className="text-rose-600" />;
    case "Report_Submitted":
      return <AlertTriangle size={17} className="text-violet-600" />;
    case "Job_Assigned":
      return <Wrench size={17} className="text-blue-600" />;
    default:
      return <Bell size={17} className="text-slate-500" />;
  }
};

const formatTime = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

export default function NotificationBell({
  locale,
  notifications,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = text[locale];
  const unreadCount = notifications.filter((item) => item.read_at === null).length;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="interactive-button relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-label={t.aria}
        aria-expanded={isOpen}
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {Math.min(unreadCount, 9)}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-11 z-[100] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.title}
            </h2>
            <form action={markNotificationsReadAction}>
              <input type="hidden" name="lang" value={locale} />
              <button
                type="submit"
                disabled={unreadCount === 0}
                className="interactive-button rounded-lg px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-300 dark:hover:bg-blue-950/40"
              >
                {t.markRead}
              </button>
            </form>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <Bell className="mx-auto mb-2 text-slate-300" size={28} />
              {t.empty}
            </div>
          ) : (
            <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {notifications.map((item) => {
                const content = (
                  <>
                    <div className="mt-0.5 shrink-0">{iconFor(item.notification_type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </p>
                        {item.read_at === null ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
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
                    onClick={() => setIsOpen(false)}
                    className="flex gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={item.notification_id} className="flex gap-3 px-4 py-3">
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
