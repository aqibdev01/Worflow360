"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { Loader2, AlertCircle, Eye, EyeOff, Check, X, ArrowRight } from "lucide-react";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailValid = useMemo(() => EMAIL_REGEX.test(email), [email]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Please check setup instructions.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!emailValid) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signIn({ email, password });

      if (authError) {
        if (
          authError.message.toLowerCase().includes("email not confirmed") ||
          authError.code === "email_not_confirmed"
        ) {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data) {
        window.location.href = redirectTo;
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen">
      {/* LEFT PANEL: Brand & Testimonial */}
      <section className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600">
        {/* Decorative shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] right-[-5%] w-80 h-80 bg-violet-500/20 rounded-full blur-2xl" />
        <div className="absolute top-1/4 right-10 w-24 h-24 bg-white/10 backdrop-blur-xl rotate-12 rounded-xl" />

        {/* Brand logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <Logo className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Workflow360
          </span>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 max-w-lg mb-12">
          <div className="mb-8 text-white/40 text-6xl leading-none">&ldquo;</div>
          <h2 className="text-3xl font-medium text-white leading-tight mb-8">
            Workflow360 has completely transformed how our team collaborates. The
            AI-powered task decomposition is a game changer.
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
              SC
            </div>
            <div>
              <p className="font-bold text-white">Sarah Connor</p>
              <p className="text-white/70 text-sm">Head of Product at Cyberdyne</p>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT PANEL: Login Form */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 lg:p-24 bg-white dark:bg-slate-900">
        <div className="w-full max-w-md space-y-10">
          {/* Mobile brand (hidden on desktop) */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Logo className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Workflow360
            </span>
          </div>

          {/* Header */}
          <div className="text-left space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Sign in to your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 text-foreground"
                />
                {email.length > 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {emailValid ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <X className="h-4 w-4 text-rose-500" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="password"
                  className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400"
                >
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            <span className="flex-shrink mx-4 text-[0.6875rem] font-bold uppercase tracking-widest text-slate-400">
              or continue with
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
          </div>

          {/* Social logins */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              <span className="text-sm font-semibold text-foreground">Google</span>
            </button>
            <button className="flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span className="text-sm font-semibold text-foreground">GitHub</span>
            </button>
          </div>

          {/* Footer link */}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors ml-1"
            >
              Sign up
            </Link>
          </p>
        </div>
      </section>

      {/* Footer bar */}
      <footer className="fixed bottom-0 right-0 w-full lg:w-1/2 flex flex-col md:flex-row justify-between items-center px-8 py-6 gap-4 bg-white dark:bg-slate-900">
        <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
          &copy; 2024 Workflow360. Precision in every craft.
        </div>
        <div className="flex gap-6">
          <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer">
            Privacy Policy
          </span>
          <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer">
            Terms of Service
          </span>
        </div>
      </footer>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-slate-900" />
      }
    >
      <LoginContent />
    </Suspense>
  );
}
