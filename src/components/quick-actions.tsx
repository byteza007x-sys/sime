import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Package,
  UserPlus,
  Wrench,
} from "lucide-react";

const actions = [
  {
    title: "New Service Report",
    description: "สร้างใบเซอร์วิสใหม่",
    href: "/reports/create",
    icon: Wrench,
    color: "bg-blue-600",
  },
  {
    title: "Customers",
    description: "ดูข้อมูลลูกค้าจาก SAP",
    href: "/customers",
    icon: UserPlus,
    color: "bg-emerald-600",
  },
  {
    title: "Inventory",
    description: "ดูอุปกรณ์และ Serial No.",
    href: "/inventory",
    icon: Package,
    color: "bg-orange-500",
  },
  {
    title: "Reports",
    description: "ดูรายการใบเซอร์วิสทั้งหมด",
    href: "/reports",
    icon: ClipboardList,
    color: "bg-violet-600",
  },
];

export default function QuickActions() {
  return (
    <div className="interactive-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Quick Actions
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          เมนูลัดสำหรับงานหลัก
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              href={action.href}
              className="interactive-button group rounded-xl border border-slate-200 p-5 transition hover:border-blue-500 hover:shadow-lg dark:border-slate-800 dark:hover:border-blue-500"
            >
              <div
                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${action.color}`}
              >
                <Icon className="text-white" size={24} />
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {action.title}
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {action.description}
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-300">
                Open
                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-1"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
