"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Calendar,
  BarChart3,
  FolderOpen,
  CheckCircle,
  Sun,
  Moon,
  X,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  section: string;
  shortcut?: string[];
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Toggle with Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands: CommandItem[] = [
    {
      id: "new-project",
      label: "Create New Project",
      icon: <Plus className="h-4 w-4" />,
      section: "Actions",
      shortcut: ["N", "P"],
      action: () => {
        setOpen(false);
        /* navigation handled at component level */
      },
    },
    {
      id: "toggle-theme",
      label: "Toggle Theme",
      icon: <Sun className="h-4 w-4" />,
      section: "Actions",
      shortcut: ["⌘", "T"],
      action: () => {
        document.documentElement.classList.toggle("dark");
        const isDark = document.documentElement.classList.contains("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        setOpen(false);
      },
    },
    {
      id: "go-dashboard",
      label: "Dashboard",
      description: "Home",
      icon: <BarChart3 className="h-4 w-4" />,
      section: "Pages",
      shortcut: ["G", "D"],
      action: () => {
        router.push("/dashboard");
        setOpen(false);
      },
    },
    {
      id: "go-calendar",
      label: "Calendar",
      description: "Organization > Schedule",
      icon: <Calendar className="h-4 w-4" />,
      section: "Pages",
      shortcut: ["G", "C"],
      action: () => {
        router.push("/dashboard/calendar");
        setOpen(false);
      },
    },
    {
      id: "go-analytics",
      label: "Analytics",
      description: "Reports",
      icon: <BarChart3 className="h-4 w-4" />,
      section: "Pages",
      shortcut: ["G", "A"],
      action: () => {
        router.push("/dashboard/analytics");
        setOpen(false);
      },
    },
    {
      id: "go-orgs",
      label: "Organizations",
      description: "All workspaces",
      icon: <FolderOpen className="h-4 w-4" />,
      section: "Pages",
      shortcut: ["G", "O"],
      action: () => {
        router.push("/dashboard/organizations");
        setOpen(false);
      },
    },
  ];

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const sections = [...new Set(filtered.map((c) => c.section))];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[selectedIndex]?.action();
    }
  };

  if (!open) return null;

  let globalIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-black/10 dark:bg-black/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-ambient-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col max-h-[70vh] animate-scale-in">
        {/* Search Input */}
        <div className="flex items-center px-5 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-lg font-medium text-foreground placeholder:text-slate-400"
            placeholder="Search for anything..."
            type="text"
          />
          <kbd className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto py-2">
          {sections.map((section) => (
            <div key={section} className="px-3 pb-4">
              <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {section}
              </h3>
              {filtered
                .filter((c) => c.section === section)
                .map((item) => {
                  globalIndex++;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-left ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className={isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-foreground">
                          {item.label}
                        </span>
                        {item.description && (
                          <span className="text-[11px] text-slate-400 ml-2">
                            {item.description}
                          </span>
                        )}
                      </div>
                      {item.shortcut && (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                          {item.shortcut.map((key, i) => (
                            <kbd
                              key={i}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-slate-400">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                ↑↓
              </kbd>{" "}
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                ↵
              </kbd>{" "}
              to select
            </span>
          </div>
          <div>Workflow360 Search</div>
        </div>
      </div>
    </div>
  );
}
