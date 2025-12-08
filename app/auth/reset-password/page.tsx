"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword, updatePassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  Check,
  X,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Password validation
const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p: string) => /[0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user came from a reset link (has access_token or type=recovery)
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Real-time validation
  const emailValid = useMemo(() => EMAIL_REGEX.test(email), [email]);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const passwordRequirementsMet = PASSWORD_REQUIREMENTS.map(req => ({
    ...req,
    met: req.test(newPassword)
  }));
  const allPasswordRequirementsMet = passwordRequirementsMet.every(req => req.met);

  // Check for recovery session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Method 1: Check URL hash for access token (Supabase PKCE flow)
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const type = hashParams.get("type");

          if (accessToken && type === "recovery") {
            // Set the session from the recovery token
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

            if (!error) {
              setIsUpdateMode(true);
              // Clear the hash from URL for cleaner appearance
              window.history.replaceState(null, "", window.location.pathname);
            }
            setCheckingSession(false);
            return;
          }
        }

        // Method 2: Check URL query params (some Supabase configs use this)
        const urlType = searchParams.get("type");
        const code = searchParams.get("code");

        if (code) {
          // Exchange code for session
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            setIsUpdateMode(true);
          }
          setCheckingSession(false);
          return;
        }

        if (urlType === "recovery") {
          // Check if there's an existing session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsUpdateMode(true);
          }
          setCheckingSession(false);
          return;
        }

        // Method 3: Listen for auth state change (handles automatic token exchange)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
            if (session) {
              setIsUpdateMode(true);
              setCheckingSession(false);
            }
          }
        });

        // Give the auth state change a moment to fire
        setTimeout(() => {
          setCheckingSession(false);
        }, 1000);

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error("Error checking session:", err);
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [searchParams]);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!emailValid) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await resetPassword(email);

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allPasswordRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await updatePassword(newPassword);

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  // Loading state while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  // Success state for reset email sent
  if (success && !isUpdateMode) {
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
            </div>
          </div>
        </nav>

        <div className="flex items-center justify-center min-h-screen pt-16 pb-12 px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md bg-white border-0 shadow-2xl p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-navy-900">Check your email</h1>
              <p className="text-muted-foreground">
                We&apos;ve sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
              </p>
            </div>

            <div className="space-y-3">
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
              >
                Try a different email
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Success state for password updated
  if (success && isUpdateMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/80 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-3">
                <Logo className="h-9 w-9" />
                <span className="text-xl font-bold text-white">
                  Workflow<span className="text-brand-blue">360</span>
                </span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="flex items-center justify-center min-h-screen pt-16 pb-12 px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md bg-white border-0 shadow-2xl p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-navy-900">Password updated!</h1>
              <p className="text-muted-foreground">
                Your password has been successfully updated. Redirecting to dashboard...
              </p>
              <Loader2 className="h-6 w-6 animate-spin text-brand-blue mx-auto" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-white/70 hover:text-brand-blue hover:bg-white/5">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Form */}
      <div className="flex items-center justify-center min-h-screen pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-white border-0 shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20 mb-4">
              <KeyRound className="h-4 w-4 text-brand-blue" />
              <span className="text-sm text-brand-blue font-medium">
                {isUpdateMode ? "Set New Password" : "Password Recovery"}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-navy-900">
              {isUpdateMode ? "Create new password" : "Reset your password"}
            </h1>
            <p className="text-muted-foreground">
              {isUpdateMode
                ? "Enter a strong password for your account"
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          {isUpdateMode ? (
            // Update Password Form
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-destructive">{error}</div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-navy-900">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={loading}
                    className="pl-10 pr-10 border-border focus:border-brand-blue focus:ring-brand-blue/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-navy-900"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              {newPassword.length > 0 && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground">Password requirements:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {passwordRequirementsMet.map((req, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        {req.met ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className={`text-xs ${req.met ? "text-green-600" : "text-muted-foreground"}`}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-navy-900">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={loading}
                    className={`pl-10 pr-10 border-border focus:border-brand-blue focus:ring-brand-blue/20 ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? "border-green-500 focus:border-green-500"
                          : "border-destructive focus:border-destructive"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-navy-900"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-brand-blue hover:bg-brand-blue-600 text-white shadow-lg shadow-brand-blue/25"
                disabled={loading || !allPasswordRequirementsMet || !passwordsMatch}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          ) : (
            // Request Reset Form
            <form onSubmit={handleResetRequest} className="space-y-4">
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
                          ? "border-green-500 focus:border-green-500"
                          : "border-destructive focus:border-destructive"
                        : ""
                    }`}
                  />
                  {email.length > 0 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {emailValid ? (
                        <Check className="h-5 w-5 text-green-500" />
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

              <Button
                type="submit"
                className="w-full bg-brand-blue hover:bg-brand-blue-600 text-white shadow-lg shadow-brand-blue/25"
                disabled={loading || !emailValid}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    Remember your password?
                  </span>
                </div>
              </div>

              <Link href="/auth/login" className="block">
                <Button type="button" variant="outline" className="w-full border-brand-purple/30 text-brand-purple hover:bg-brand-purple/5 hover:border-brand-purple">
                  Back to sign in
                </Button>
              </Link>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
