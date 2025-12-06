"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DismissibleAlertProps {
  id: string; // Unique ID for storing dismissal state in localStorage
  title?: string;
  message: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  persistDismissal?: boolean; // If true, dismissal is remembered in localStorage
  onDismiss?: () => void;
  className?: string;
}

const iconMap = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

export function DismissibleAlert({
  id,
  title,
  message,
  variant = "default",
  persistDismissal = true,
  onDismiss,
  className,
}: DismissibleAlertProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start as dismissed to prevent flash
  const storageKey = `alert-dismissed-${id}`;

  useEffect(() => {
    // Check if this alert was previously dismissed
    if (persistDismissal) {
      const dismissed = localStorage.getItem(storageKey);
      setIsDismissed(dismissed === "true");
    } else {
      setIsDismissed(false);
    }
  }, [persistDismissal, storageKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (persistDismissal) {
      localStorage.setItem(storageKey, "true");
    }
    onDismiss?.();
  };

  if (isDismissed) return null;

  const Icon = iconMap[variant];

  return (
    <Alert variant={variant} className={cn("relative pr-12", className)}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8 rounded-full hover:bg-background/50"
        onClick={handleDismiss}
        aria-label="Dismiss alert"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}

// Alert container for showing multiple alerts
export interface AlertItem {
  id: string;
  title?: string;
  message: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  persistDismissal?: boolean;
}

interface AlertBannerProps {
  alerts: AlertItem[];
  className?: string;
}

export function AlertBanner({ alerts, className }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {alerts.map((alert) => (
        <DismissibleAlert
          key={alert.id}
          id={alert.id}
          title={alert.title}
          message={alert.message}
          variant={alert.variant}
          persistDismissal={alert.persistDismissal}
        />
      ))}
    </div>
  );
}
