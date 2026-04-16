"use client";

import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "gradient";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl flex flex-col items-start justify-between min-h-[360px] shadow-sm hover:shadow-ambient transition-all">
      {/* Illustration area */}
      <div className="w-full h-48 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center justify-center relative overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5" />
        <div className="relative z-10 w-24 h-24 flex items-center justify-center">
          <div className="absolute w-full h-full border-2 border-dashed border-indigo-300/40 dark:border-indigo-700/40 rounded-full animate-pulse-soft" />
          <Icon className="h-12 w-12 text-indigo-500 dark:text-indigo-400" />
        </div>
      </div>

      {/* Content */}
      <div>
        <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
          {description}
        </p>
      </div>

      {/* Action */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={`w-full py-3 px-6 font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
            variant === "gradient"
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90"
              : "bg-slate-100 dark:bg-slate-800 text-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
