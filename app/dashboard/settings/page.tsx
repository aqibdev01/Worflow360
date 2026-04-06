"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useBreadcrumbs } from "@/components/breadcrumbs";
import { Avatar } from "@/components/ui/avatar";
import { SkillsManager } from "@/components/ai/SkillsManager";
import { Skeleton } from "@/components/ui/skeleton";
import { updateUserProfile, updatePassword, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  User,
  Mail,
  Sparkles,
  Lock,
  ShieldQuestion,
  Bell,
  BellOff,
  Sun,
  Moon,
  Monitor,
  LogOut,
  AlertTriangle,
  Loader2,
  Check,
  Pencil,
  X,
  Eye,
  EyeOff,
  Save,
  Laptop,
} from "lucide-react";

type SettingsTab = "appearance" | "account" | "notifications";

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favorite movie?",
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, userProfile, loading, refreshUser } = useAuth();

  useBreadcrumbs([{ label: "Settings" }]);

  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  // Profile editing
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Security question
  const [showSecurityForm, setShowSecurityForm] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [currentSecurityQuestion, setCurrentSecurityQuestion] = useState("");

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Theme
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

  // Load initial values
  useEffect(() => {
    if (userProfile) setFullName(userProfile.full_name || "");
  }, [userProfile]);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("users")
      .select("security_question")
      .eq("id", user.id)
      .single()
      .then(({ data }: any) => {
        if (data?.security_question) {
          setCurrentSecurityQuestion(data.security_question);
          setSecurityQuestion(data.security_question);
        }
      });
  }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem("notifications_enabled");
    if (saved !== null) setNotificationsEnabled(saved === "true");
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (saved) setTheme(saved);
    else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("system");
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-80" />
        <Skeleton className="h-12 w-full max-w-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-8">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        Please sign in to view settings.
      </div>
    );
  }

  const displayName = userProfile?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // ── Handlers ──

  const handleSaveName = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setSavingName(true);
    const { error } = await updateUserProfile(user.id, { full_name: fullName.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Name updated"); setEditingName(false); refreshUser(); }
    setSavingName(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); setConfirmPassword(""); setShowPasswordForm(false); }
    setSavingPassword(false);
  };

  const handleSaveSecurity = async () => {
    if (!securityQuestion) { toast.error("Please select a security question"); return; }
    if (!securityAnswer.trim() || securityAnswer.trim().length < 2) { toast.error("Answer must be at least 2 characters"); return; }
    setSavingSecurity(true);
    const { error } = await (supabase as any).from("users").update({ security_question: securityQuestion, security_answer: securityAnswer.trim().toLowerCase() }).eq("id", user.id);
    if (error) toast.error(error.message || "Failed to update");
    else { toast.success("Security question updated"); setCurrentSecurityQuestion(securityQuestion); setSecurityAnswer(""); setShowSecurityForm(false); }
    setSavingSecurity(false);
  };

  const handleToggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    localStorage.setItem("notifications_enabled", String(next));
    toast.success(next ? "Notifications enabled" : "Notifications disabled");
  };

  const handleChangeTheme = (t: "light" | "dark" | "system") => {
    setTheme(t);
    localStorage.setItem("theme", t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else if (t === "light") document.documentElement.classList.remove("dark");
    else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) toast.error("Failed to sign out");
    else { toast.success("Signed out"); router.push("/auth/login"); router.refresh(); }
  };

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "appearance", label: "Appearance" },
    { key: "account", label: "Account" },
    { key: "notifications", label: "Notifications" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Settings</h2>
        <p className="text-on-surface-variant dark:text-slate-400">
          Manage your workspace preferences, account details, and notification rules.
        </p>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-8 border-b border-outline-variant/30 dark:border-slate-800 mb-10 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-4 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-bold"
                : "text-on-surface-variant dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-12">

          {/* ════════ APPEARANCE TAB ════════ */}
          {activeTab === "appearance" && (
            <>
              {/* Theme Preference */}
              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Theme Preference</h3>
                  <p className="text-sm text-on-surface-variant dark:text-slate-400">
                    Customize how Workflow360 looks on your device.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {([
                    { value: "light" as const, label: "Light", icon: Sun },
                    { value: "dark" as const, label: "Dark", icon: Moon },
                    { value: "system" as const, label: "System", icon: Monitor },
                  ]).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => handleChangeTheme(value)}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl transition-all ${
                        theme === value
                          ? "bg-white dark:bg-indigo-500/10 border-2 border-indigo-500 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon className={`h-7 w-7 ${theme === value ? "text-indigo-500" : "text-on-surface-variant dark:text-slate-500"}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${theme === value ? "text-indigo-600 dark:text-indigo-400" : "text-on-surface-variant dark:text-slate-500"}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Skills (part of Appearance — personal workspace customization) */}
              <section className="pt-8 border-t border-outline-variant/30 dark:border-slate-800 space-y-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">My Skills</h3>
                    <p className="text-sm text-on-surface-variant dark:text-slate-400">
                      Skills help the AI Smart Assigner match you with the right tasks.
                    </p>
                  </div>
                </div>
                <SkillsManager userId={user.id} />
              </section>
            </>
          )}

          {/* ════════ ACCOUNT TAB ════════ */}
          {activeTab === "account" && (
            <>
              {/* Profile */}
              <section className="space-y-6">
                <h3 className="text-xl font-bold text-foreground">Profile</h3>
                <div className="flex items-start gap-6">
                  <Avatar
                    src={userProfile?.avatar_url || undefined}
                    alt={displayName}
                    fallback={initials}
                    className="h-16 w-16 rounded-xl text-lg shrink-0"
                  />
                  <div className="flex-1 space-y-5">
                    {/* Name */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <label className="text-sm font-medium text-on-surface-variant dark:text-slate-400 pt-2">
                        Full Name
                      </label>
                      <div className="col-span-2">
                        {editingName ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="flex-1 bg-white dark:bg-slate-950 border border-outline-variant/20 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-foreground"
                              autoFocus
                            />
                            <button onClick={handleSaveName} disabled={savingName} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors">
                              {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </button>
                            <button onClick={() => { setEditingName(false); setFullName(userProfile?.full_name || ""); }} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{displayName}</span>
                            <button onClick={() => setEditingName(true)} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Email */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <label className="text-sm font-medium text-on-surface-variant dark:text-slate-400 pt-2">
                        Email Address
                      </label>
                      <div className="col-span-2">
                        <input
                          readOnly
                          value={user.email || ""}
                          className="w-full bg-white dark:bg-slate-950 border border-outline-variant/20 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-foreground opacity-70 cursor-not-allowed outline-none"
                        />
                        <p className="mt-1.5 text-xs text-on-surface-variant dark:text-slate-500 italic">
                          This email is used for all system notifications and login.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Password & Security */}
              <section className="pt-8 border-t border-outline-variant/30 dark:border-slate-800 space-y-6">
                <h3 className="text-xl font-bold text-foreground">Account Security</h3>

                {/* Password */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-on-surface-variant dark:text-slate-400 pt-2">
                    Password
                  </label>
                  <div className="col-span-2">
                    {showPasswordForm ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password (min 8 chars)"
                            className="w-full bg-white dark:bg-slate-950 border border-outline-variant/20 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-foreground placeholder:text-slate-400"
                          />
                          <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground transition-colors">
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full bg-white dark:bg-slate-950 border border-outline-variant/20 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-foreground placeholder:text-slate-400"
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-xs text-rose-500">Passwords do not match</p>
                        )}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleChangePassword}
                            disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
                            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Update
                          </button>
                          <button onClick={() => { setShowPasswordForm(false); setNewPassword(""); setConfirmPassword(""); }} className="text-sm font-medium text-slate-500 hover:text-foreground transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setShowPasswordForm(true)}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground rounded-lg text-sm font-semibold transition-colors"
                        >
                          Change Password
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Question */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <label className="text-sm font-medium text-on-surface-variant dark:text-slate-400 pt-2">
                    Security Question
                  </label>
                  <div className="col-span-2">
                    {showSecurityForm ? (
                      <div className="space-y-4">
                        <select
                          value={securityQuestion}
                          onChange={(e) => setSecurityQuestion(e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-outline-variant/20 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-foreground appearance-none"
                        >
                          <option value="">Select a question...</option>
                          {SECURITY_QUESTIONS.map((q) => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                          placeholder="Your answer"
                          className="w-full bg-white dark:bg-slate-950 border border-outline-variant/20 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-foreground placeholder:text-slate-400"
                        />
                        <p className="text-xs text-on-surface-variant dark:text-slate-500 italic">
                          Used to verify your identity for password recovery.
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleSaveSecurity}
                            disabled={savingSecurity || !securityQuestion || !securityAnswer.trim()}
                            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {savingSecurity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                          </button>
                          <button onClick={() => { setShowSecurityForm(false); setSecurityAnswer(""); }} className="text-sm font-medium text-slate-500 hover:text-foreground transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {currentSecurityQuestion ? (
                          <div className="flex items-center gap-4">
                            <p className="text-sm text-foreground">{currentSecurityQuestion}</p>
                            <button onClick={() => setShowSecurityForm(true)} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-violet-600 transition-colors">
                              Update
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowSecurityForm(true)}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground rounded-lg text-sm font-semibold transition-colors"
                          >
                            Set Up Security Question
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-6 border-t border-outline-variant/30 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                      <AlertTriangle className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Sign Out</h4>
                      <p className="text-xs text-on-surface-variant dark:text-slate-500">
                        Sign out of your account on this device
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-rose-500 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </section>
            </>
          )}

          {/* ════════ NOTIFICATIONS TAB ════════ */}
          {activeTab === "notifications" && (
            <section className="space-y-8">
              <div className="flex justify-between items-end">
                <h3 className="text-xl font-bold text-foreground">Notification Preferences</h3>
              </div>

              {/* Master toggle */}
              <div className="flex items-center justify-between p-6 bg-white dark:bg-slate-900/40 rounded-2xl border border-outline-variant/20 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${notificationsEnabled ? "bg-indigo-50 dark:bg-indigo-950/30" : "bg-slate-100 dark:bg-slate-800"}`}>
                    {notificationsEnabled ? (
                      <Bell className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <BellOff className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {notificationsEnabled ? "Notifications are enabled" : "Notifications are disabled"}
                    </h4>
                    <p className="text-xs text-on-surface-variant dark:text-slate-500">
                      {notificationsEnabled
                        ? "You will receive all in-app notifications for tasks, mentions, deadlines, and more."
                        : "You will not receive any notifications. Toggle on to re-enable."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleNotifications}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                    notificationsEnabled
                      ? "bg-indigo-500"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notificationsEnabled ? "translate-x-5" : "translate-x-0.5"
                    } mt-0.5`}
                  />
                </button>
              </div>

              {/* Info */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-outline-variant/10 dark:border-slate-800">
                <p className="text-sm text-on-surface-variant dark:text-slate-400 leading-relaxed">
                  When enabled, you receive notifications for: task assignments, status changes, mentions, sprint deadlines, internal mail, new members, project invites, comments, and file shares.
                </p>
              </div>
            </section>
          )}
        </div>

        {/* ── Right Sidebar Column ── */}
        <div className="lg:col-span-4 space-y-8">
          {/* AI Insight Card */}
          <div className="p-6 bg-surface-container-high dark:bg-slate-800/50 rounded-3xl space-y-4">
            <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-sm">
              <Sparkles className="h-5 w-5 text-indigo-500" />
            </div>
            <h4 className="text-lg font-bold text-foreground">Curator Insights</h4>
            <p className="text-sm text-on-surface-variant dark:text-slate-400 leading-relaxed">
              Keep your skills up to date to improve AI task assignment accuracy. The Smart Assigner uses your skill profile to match you with the most relevant tasks.
            </p>
            <button
              onClick={() => setActiveTab("appearance")}
              className="w-full py-2 bg-foreground dark:bg-white text-background dark:text-slate-900 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors hover:opacity-90"
            >
              Manage Skills
            </button>
          </div>

          {/* Session Info */}
          <div className="p-6 border border-outline-variant/30 dark:border-slate-800 rounded-3xl space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-500">
              Current Session
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Laptop className="h-5 w-5 text-on-surface-variant dark:text-slate-500" />
                <div>
                  <p className="text-sm font-bold text-foreground">This Device</p>
                  <p className="text-xs text-on-surface-variant dark:text-slate-500">
                    Active now
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-violet-600 transition-colors mt-2"
            >
              Sign out of this device
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
