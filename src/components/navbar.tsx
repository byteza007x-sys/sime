"use client";

import Link from "next/link";
import {
  Bell,
  Search,
  Moon,
  Sun,
  Settings,
  UserCircle,
} from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between rounded-3xl border border-slate-200 bg-white px-8 shadow-sm">

      {/* Left */}

      <div>

        <h1 className="text-2xl font-bold text-slate-900">
          Service Dashboard
        </h1>

        <p className="text-sm text-slate-500">
          Service Management System
        </p>

      </div>

      {/* Center */}

      <div className="hidden lg:flex">

        <div className="relative">

          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />

          <input
            type="text"
            placeholder="Search report, customer..."
            className="w-96 rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-5 outline-none transition focus:border-blue-500 focus:bg-white"
          />

        </div>

      </div>

      {/* Right */}

      <div className="flex items-center gap-4">

        <button className="relative rounded-2xl bg-slate-100 p-3 transition hover:bg-slate-200">

          <Bell size={22} />

          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500"></span>

        </button>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-2xl bg-slate-100 p-3 transition hover:bg-slate-200"
        >
          {darkMode ? (
            <Sun size={22} />
          ) : (
            <Moon size={22} />
          )}
        </button>

        <button className="rounded-2xl bg-slate-100 p-3 transition hover:bg-slate-200">
          <Settings size={22} />
        </button>

        <Link
          href="/users"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2 transition hover:bg-slate-50"
        >

          <UserCircle
            size={40}
            className="text-blue-600"
          />

          <div className="hidden text-left xl:block">

            <h3 className="font-semibold text-slate-900">
              Administrator
            </h3>

            <p className="text-sm text-slate-500">
              Online
            </p>

          </div>

        </Link>

      </div>

    </header>
  );
}
