// Export all database types
export * from "./database";

// Example type for API responses
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// UI/Application specific types
export interface SessionUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface MenuItem {
  label: string;
  href: string;
  icon?: string;
}

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: Date;
}
