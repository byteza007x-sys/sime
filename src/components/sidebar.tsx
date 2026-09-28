"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  QrCode,
  Users,
} from "lucide-react";
import BrandLogo from "@/components/brand-logo";

const menus = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Jobs",
    href: "/reports",
    icon: ClipboardList,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Boxes,
  },
  {
    title: "สร้าง QR Code",
    href: "/dashboard/qr-code",
    icon: QrCode,
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-950 text-white">
      <div className="border-b border-white/10 p-6">
        <div className="flex items-center gap-4">
          <BrandLogo size={48} priority />
          <div>
            <h1 className="text-lg font-bold">e service</h1>
            <p className="text-sm text-slate-400">Service system</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 p-5">
        {menus.map((menu) => {
          const Icon = menu.icon;
          const active =
            pathname === menu.href ||
            (menu.href !== "/dashboard" && pathname.startsWith(menu.href));

          return (
            <Link
              key={menu.title}
              href={menu.href}
              className={`interactive-button flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold transition ${
                active ? "bg-blue-600 shadow-lg" : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <Icon size={20} />
              {menu.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-5">
        <button className="interactive-button flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-600 hover:text-white">
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}
