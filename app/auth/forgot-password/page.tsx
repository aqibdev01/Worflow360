"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  CheckCircle2,
  KeyRound,
  Lock,
  Check,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

type Step = "email" | "sent" | "otp" | "password" | "success";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  // If arriving from callback with ?step=password, skip straight to password step
  const initialStep = searchParams.get("step") === "password" ? "password" : "email";

  const [step, setStep] = useState<Step>(initialStep as Step);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValidPassword = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Step 1: Send password reset email
  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Send password reset email with redirect to our callback
      // The callback will detect type=recovery and redirect to this page with ?step=password
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        // Show "check your email" confirmation
        setStep("sent");
        setResendTimer(60);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Update password (user arrives here via email link → callback → redirect)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidPassword) {
      setError("Please meet all password requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    console.log("Starting password update...");

    try {
      // First check if we have a valid session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("Current session:", sessionData?.session ? "exists" : "none");

      if (!sessionData?.session) {
        console.error("No session found - cannot update password");
        setError("Session expired. Please restart the password reset process.");
        setLoading(false);
        return;
      }

      console.log("Calling updateUser...");
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      console.log("updateUser response:", { data, updateError });

      if (updateError) {
        console.error("Password update error:", updateError);
        setError(updateError.message);
        setLoading(false);
        return;
      }

      console.log("Password updated successfully!");

      // Password updated successfully - sign out and redirect
      await supabase.auth.signOut();

      setLoading(false);
      setStep("success");
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // Resend reset email
  const handleResendEmail = async () => {
    if (resendTimer > 0) return;

    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (!resetError) {
        setResendTimer(60);
      } else {
        setError("Failed to resend email. Please try again.");
      }
    } catch (err) {
      setError("Failed to resend email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-redirect on success
  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Success Screen
  if (step === "success") {
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

        <div className="flex items-center justify-center min-h-screen pt-16 pb-12 px-4">
          <Card className="w-full max-w-md bg-white border-0 shadow-2xl p-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-navy-900">Password Updated!</h1>
              <p className="text-gray-600">
                Your password has been changed successfully.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to login...
              </p>
              <Loader2 className="h-5 w-5 animate-spin text-brand-blue mx-auto" />
              <Link href="/auth/login">
                <Button className="mt-4 bg-brand-blue hover:bg-brand-blue/90 text-white">
                  Go to Login Now
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-screen pt-16 pb-12 px-4">
        <Card className="w-full max-w-md bg-white border-0 shadow-2xl p-8">
          {/* Step Indicator */}
          {step !== "password" && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {[
                { key: "email", label: "1" },
                { key: "sent", label: "2" },
              ].map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === s.key
                        ? "bg-brand-blue text-white"
                        : ["email", "sent"].indexOf(step) > i
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {["email", "sent"].indexOf(step) > i ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      s.label
                    )}
                  </div>
                  {i < 1 && (
                    <div
                      className={`w-12 h-1 mx-1 ${
                        ["email", "sent"].indexOf(step) > i
                          ? "bg-green-500"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <>
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20">
                  <KeyRound className="h-4 w-4 text-brand-blue" />
                  <span className="text-sm text-brand-blue font-medium">Reset Password</span>
                </div>
                <h1 className="text-2xl font-bold text-navy-900 mt-4">Forgot Password?</h1>
                <p className="text-gray-600 text-sm">
                  Enter your email and we&apos;ll send you a reset link
                </p>
              </div>

              <form onSubmit={handleSendReset} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-navy-900">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Step 2: Check your email */}
          {step === "sent" && (
            <>
              <div className="text-center space-y-2 mb-6">
                <div className="mx-auto w-16 h-16 bg-brand-blue/10 rounded-full flex items-center justify-center border border-brand-blue/20">
                  <Mail className="h-8 w-8 text-brand-blue" />
                </div>
                <h1 className="text-2xl font-bold text-navy-900 mt-4">Check Your Email</h1>
                <p className="text-gray-600 text-sm">
                  We sent a password reset link to
                </p>
                <p className="text-brand-blue font-medium">{email}</p>
                <p className="text-gray-500 text-xs mt-2">
                  Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resendTimer > 0 || loading}
                    className={`text-sm ${
                      resendTimer > 0
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-brand-blue hover:underline"
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Sending...
                      </span>
                    ) : resendTimer > 0 ? (
                      `Resend email in ${resendTimer}s`
                    ) : (
                      "Resend email"
                    )}
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Use different email
                </button>
              </div>
            </>
          )}

          {/* Step 3: New Password */}
          {step === "password" && (
            <>
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20">
                  <Lock className="h-4 w-4 text-brand-blue" />
                  <span className="text-sm text-brand-blue font-medium">New Password</span>
                </div>
                <h1 className="text-2xl font-bold text-navy-900 mt-4">Create New Password</h1>
                <p className="text-gray-600 text-sm">
                  Enter a strong password for your account
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-navy-900">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {password.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-gray-700">Password requirements:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        {hasMinLength ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-300" />}
                        <span className={`text-xs ${hasMinLength ? "text-green-600" : "text-gray-500"}`}>8+ characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasUppercase ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-300" />}
                        <span className={`text-xs ${hasUppercase ? "text-green-600" : "text-gray-500"}`}>Uppercase</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasLowercase ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-300" />}
                        <span className={`text-xs ${hasLowercase ? "text-green-600" : "text-gray-500"}`}>Lowercase</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasNumber ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-300" />}
                        <span className={`text-xs ${hasNumber ? "text-green-600" : "text-gray-500"}`}>Number</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-navy-900">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className={`pl-10 ${
                        confirmPassword.length > 0
                          ? passwordsMatch
                            ? "border-green-500"
                            : "border-red-500"
                          : ""
                      }`}
                    />
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || !isValidPassword || !passwordsMatch}
                  className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </>
          )}

          {step === "email" && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Remember your password?{" "}
                <Link href="/auth/login" className="text-brand-blue hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
