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
        // Double-check email verification status
        if (!data.email_confirmed_at) {
          // Sign out and redirect to verification
          await supabase.auth.signOut();
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }

        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <Logo className="h-9 w-9" />
              <span className="text-xl font-bold text-gray-900">
                Workflow<span className="text-blue-600">360</span>
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <div className="flex items-center justify-center min-h-screen pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-white border-gray-100 shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-4">
              <Lock className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Secure Login</span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Welcome Back
            </h1>
            <p className="text-gray-600">
              Sign in to continue to Workflow360
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                  className={`pl-10 pr-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                    email.length > 0
                      ? emailValid
                        ? "border-green-500 focus:border-green-500"
                        : "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
                {email.length > 0 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailValid ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {email.length > 0 && !emailValid && (
                <p className="text-xs text-red-600">Please enter a valid email address</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <Link
                  href="/auth/reset-password"
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Don't have an account?
                </span>
              </div>
            </div>

            <Link href="/auth/signup" className="block">
              <Button type="button" variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50">
                Create an account
              </Button>
            </Link>
          </form>
        </Card>
      </div>
    </div>
  );
}
