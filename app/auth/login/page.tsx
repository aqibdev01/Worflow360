"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Loader2, AlertCircle, Mail, Lock, Check, X } from "lucide-react";

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Real-time validation
  const emailValid = useMemo(() => EMAIL_REGEX.test(email), [email]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError(
        "⚠️ Supabase is not configured. Please check the browser console for setup instructions."
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email format
    if (!emailValid) {
      setError("Please enter a valid email address");
      return;
    }

    // Validate password is not empty
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signIn({ email, password });

      if (authError) {
        // Check if the error is about email not confirmed
        if (authError.message.toLowerCase().includes("email not confirmed") ||
            authError.code === "email_not_confirmed") {
          // Redirect to verification page
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data) {
        // Redirect to dashboard
        router.push(redirectTo);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <Logo className="h-9 w-9" />
              <span className="text-xl font-bold text-white">
                Workflow<span className="text-brand-blue">360</span>
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-white/70 hover:text-brand-blue hover:bg-white/5">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="bg-brand-blue hover:bg-brand-blue-600 text-white shadow-lg shadow-brand-blue/25">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <div className="flex items-center justify-center min-h-screen pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-white border-0 shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20 mb-4">
              <Lock className="h-4 w-4 text-brand-blue" />
              <span className="text-sm text-brand-blue font-medium">Secure Login</span>
            </div>

            <h1 className="text-3xl font-bold text-navy-900">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Sign in to continue to Workflow360
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-sm text-destructive">{error}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-navy-900">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={loading}
                  className={`pl-10 pr-10 border-border focus:border-brand-blue focus:ring-brand-blue/20 ${
                    email.length > 0
                      ? emailValid
                        ? "border-success focus:border-success"
                        : "border-destructive focus:border-destructive"
                      : ""
                  }`}
                />
                {email.length > 0 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailValid ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <X className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {email.length > 0 && !emailValid && (
                <p className="text-xs text-destructive">Please enter a valid email address</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-navy-900">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-brand-blue hover:text-brand-blue-600 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="pl-10 border-border focus:border-brand-blue focus:ring-brand-blue/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-brand-blue hover:bg-brand-blue-600 text-white shadow-lg shadow-brand-blue/25"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Don't have an account?
                </span>
              </div>
            </div>

            <Link href="/auth/signup" className="block">
              <Button type="button" variant="outline" className="w-full border-brand-purple/30 text-brand-purple hover:bg-brand-purple/5 hover:border-brand-purple">
                Create an account
              </Button>
            </Link>
          </form>
        </Card>
      </div>
    </div>
  );
}
