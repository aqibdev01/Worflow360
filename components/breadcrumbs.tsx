"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import React, { createContext, useContext, useEffect, useState } from "react";

// ── Context ──────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbContextValue {
  crumbs: BreadcrumbItem[];
  setCrumbs: (crumbs: BreadcrumbItem[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  crumbs: [],
  setCrumbs: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([]);
  return (
    <BreadcrumbContext.Provider value={{ crumbs, setCrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

// ── Hook — call this in any page to set its breadcrumb trail ─────────────────

export function useBreadcrumbs(crumbs: BreadcrumbItem[]) {
  const { setCrumbs } = useContext(BreadcrumbContext);
  // Stable serialized key so we only re-run when crumbs actually change
  const key = JSON.stringify(crumbs);
  useEffect(() => {
    setCrumbs(crumbs);
    return () => setCrumbs([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

// ── Display component — placed in layout header ──────────────────────────────

export function BreadcrumbNav() {
  const { crumbs } = useContext(BreadcrumbContext);

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-muted-foreground min-w-0"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 shrink-0 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={i}>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            {isLast || !crumb.href ? (
              <span
                className={`truncate max-w-[180px] ${
                  isLast ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
                title={crumb.label}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="truncate max-w-[180px] hover:text-foreground transition-colors"
                title={crumb.label}
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
