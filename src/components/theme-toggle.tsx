"use client";

import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.dataset.theme = theme;

  if (document.body) {
    document.body.dataset.theme = theme;
  }

  try {
    window.localStorage.setItem("theme", theme);
  } catch {
    // Ignore storage errors; the visual theme should still change.
  }
};

export default function ThemeToggle() {
  const toggleTheme = () => {
    const root = document.documentElement;
    const currentTheme =
      root.dataset.theme === "dark" || root.classList.contains("dark")
        ? "dark"
        : "light";

    applyTheme(currentTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="interactive-button inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      aria-label="Toggle color mode"
      title="Toggle color mode"
    >
      <Moon size={16} className="dark:hidden" />
      <Sun size={16} className="hidden dark:block" />
    </button>
  );
}
