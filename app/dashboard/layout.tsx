"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  BarChart3,
  Menu,
  X,
  LogOut,
  Settings,
  User,
  PanelLeftClose,
  PanelLeft,
  Home,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AlertBanner, AlertItem } from "@/components/dismissible-alert";
import { Logo } from "@/components/Logo";

const navigation = [
  {
    name: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    comingSoon: false,
  },
  {
    name: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    comingSoon: true,
  },
  {
    name: "Reports",
    href: "/dashboard/analytics",
    icon: BarChart3,
    comingSoon: true,
  },
  {
    name: "Dashboard",
    href: "/dashboard/organizations",
    icon: Building2,
    comingSoon: false,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Dark Navy Theme */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-20' : 'w-64'} transform bg-navy-900 transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo - Links to Landing Page */}
          <div className={`flex h-16 items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-6'} border-b border-white/10`}>
            <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity" title="Go to Landing Page">
              <Logo className="h-12 w-auto" />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-white/60 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-6">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              // For coming soon items, render a div instead of a link
              if (item.comingSoon) {
                return (
                  <div
                    key={item.name}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/40 cursor-not-allowed`}
                    title={sidebarCollapsed ? `${item.name} - Coming Soon` : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!sidebarCollapsed && item.name}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="text-[10px] bg-brand-purple/30 text-brand-purple px-2 py-0.5 rounded-full font-semibold">
                        Soon
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/30"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className={`${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'} transition-all duration-300`}>
        {/* Top navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-white px-4 lg:px-6 shadow-sm">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-brand-blue transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Hide/Show Menu Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center gap-2 text-muted-foreground hover:text-navy-900 transition-colors"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">{sidebarCollapsed ? 'Show Menu' : 'Hide Menu'}</span>
          </button>

          {/* Right side - User profile */}
          <div className="ml-auto flex items-center gap-4">
            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl hover:bg-muted/50 px-3 py-2 transition-colors">
                  <span className="hidden md:block text-sm font-medium text-navy-900">
                    {userProfile?.full_name || user?.email?.split("@")[0] || "User"}
                  </span>
                  <Avatar
                    src={userProfile?.avatar_url || undefined}
                    alt={userProfile?.full_name || user?.email || "User"}
                    fallback={
                      userProfile?.full_name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"
                    }
                    className="h-10 w-10 ring-2 ring-brand-blue/20"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onSelect={() => router.push("/")}>
                  <Home className="mr-2 h-4 w-4" />
                  Landing Page
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
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
