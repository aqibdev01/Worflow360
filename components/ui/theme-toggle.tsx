"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else if (saved === "system" || !saved) {
      setTheme("system");
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      }
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const cycle = () => {
    const next: Theme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);

    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else if (next === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // system
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const Icon = theme === "dark" ? Moon : theme === "system" ? Monitor : Sun;

  return (
    <button
      onClick={cycle}
      className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 ${className}`}
      title={`Theme: ${theme}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
