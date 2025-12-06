"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  BarChart3,
  Menu,
  X,
  Search,
  Bell,
  LogOut,
  Settings,
  User,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getOrganization, getProjectDetails } from "@/lib/database";
import { AlertBanner, AlertItem } from "@/components/dismissible-alert";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Organizations",
    href: "/dashboard/organizations",
    icon: Building2,
  },
  {
    name: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount] = useState(3);

  // System alerts - these can be dynamically updated from backend or state
  const [alerts] = useState<AlertItem[]>([
    {
      id: "welcome-alert",
      title: "Welcome to Workflow360!",
      message: "Get started by creating or joining an organization to collaborate with your team.",
      variant: "info",
      persistDismissal: true,
    },
  ]);

  const handleLogout = async () => {
    try {
      const { error } = await signOut();

      if (error) {
        toast.error("Logout failed", {
          description: error.message || "An error occurred while logging out. Please try again.",
        });
        return;
      }

      toast.success("Logged out successfully", {
        description: "You have been signed out of your account.",
      });
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      toast.error("Logout failed", {
        description: "An error occurred while logging out. Please try again.",
      });
    }
  };

  // State for resolved breadcrumb names (for IDs)
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

  // Helper to check if a string is a UUID
  const isUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Resolve names for UUIDs in the path
  useEffect(() => {
    const paths = pathname.split("/").filter(Boolean);

    const resolveNames = async () => {
      const newNames: Record<string, string> = {};

      for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const prevPath = paths[i - 1];

        if (isUUID(path)) {
          try {
            // Check what type of ID this is based on previous path segment
            if (prevPath === "organizations") {
              const org = await getOrganization(path) as { name?: string } | null;
              if (org?.name) newNames[path] = org.name;
            } else if (prevPath === "projects") {
              const project = await getProjectDetails(path) as { name?: string } | null;
              if (project?.name) newNames[path] = project.name;
            }
          } catch (error) {
            // If fetch fails, we'll just show a shortened ID
            console.error("Error resolving breadcrumb name:", error);
          }
        }
      }

      setResolvedNames((prev) => ({ ...prev, ...newNames }));
    };

    resolveNames();
  }, [pathname]);

  // Get breadcrumb items based on current path
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    const breadcrumbs = paths.map((path, index) => {
      const href = `/${paths.slice(0, index + 1).join("/")}`;

      // Check if we have a resolved name for this path (for UUIDs)
      let name = resolvedNames[path];

      if (!name) {
        if (isUUID(path)) {
          // Show shortened UUID while loading or if not resolved
          name = `${path.slice(0, 8)}...`;
        } else {
          // Capitalize and format regular path segments
          name = path
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }
      }

      return { name, href };
    });
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold">Workflow360</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={userProfile?.avatar_url || undefined}
                alt={userProfile?.full_name || user?.email || "User"}
                fallback={
                  userProfile?.full_name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "U"
                }
                className="h-10 w-10"
              />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {userProfile?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Link
                  href={crumb.href}
                  className={`${
                    index === breadcrumbs.length - 1
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {crumb.name}
                </Link>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div className="ml-auto flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pl-10"
              />
            </div>

            {/* Notifications */}
            <button className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {notificationCount}
                </Badge>
              )}
            </button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg hover:bg-accent px-2 py-1.5">
                  <Avatar
                    src={userProfile?.avatar_url || undefined}
                    alt={userProfile?.full_name || user?.email || "User"}
                    fallback={
                      userProfile?.full_name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"
                    }
                    className="h-8 w-8"
                  />
                  <span className="hidden md:block text-sm font-medium">
                    {userProfile?.full_name || user?.email}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <div className="px-4 lg:px-6 pt-4">
            <AlertBanner alerts={alerts} />
          </div>
        )}

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
