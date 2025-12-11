"use client";

import { useState, useRef, useEffect } from "react";
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

type Step = "email" | "otp" | "password" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, "");
      setOtp(newOtp);
      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Step 1: Send password reset OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Use Supabase's password reset with OTP (recovery type)
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        // Don't provide redirectTo - this makes Supabase send OTP code instead of link
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setStep("otp");
        setResendTimer(60);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);

    try {
      // Verify the recovery OTP
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "recovery",
      });

      console.log("OTP verification response:", { data, verifyError });

      if (verifyError) {
        console.error("OTP verification error:", verifyError);
        setError("Invalid or expired code. Please try again.");
        setLoading(false);
        return;
      }

      if (data?.session) {
        console.log("Session established, proceeding to password step");
        setStep("password");
      } else {
        console.error("No session after OTP verification");
        setError("Failed to verify code. Please try again.");
      }
    } catch (err) {
      console.error("Unexpected OTP error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Update password
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

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

      if (!resetError) {
        setResendTimer(60);
        setOtp(["", "", "", "", "", ""]);
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } catch (err) {
      setError("Failed to resend code. Please try again.");
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
          <div className="flex items-center justify-center gap-2 mb-6">
            {["email", "otp", "password"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-brand-blue text-white"
                      : ["email", "otp", "password"].indexOf(step) > i
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {["email", "otp", "password"].indexOf(step) > i ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && (
                  <div
                    className={`w-12 h-1 mx-1 ${
                      ["email", "otp", "password"].indexOf(step) > i
                        ? "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

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
                  Enter your email and we&apos;ll send you a reset code
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
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
                      Sending Code...
                    </>
                  ) : (
                    "Send Reset Code"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Step 2: OTP Verification */}
          {step === "otp" && (
            <>
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20">
                  <Mail className="h-4 w-4 text-brand-blue" />
                  <span className="text-sm text-brand-blue font-medium">Verify Code</span>
                </div>
                <h1 className="text-2xl font-bold text-navy-900 mt-4">Enter Reset Code</h1>
                <p className="text-gray-600 text-sm">
                  We sent a 6-digit code to <span className="font-medium text-brand-blue">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      disabled={loading}
                      className="w-12 h-12 text-center text-xl font-semibold"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={loading || otp.join("").length !== 6}
                  className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || loading}
                    className={`text-sm ${
                      resendTimer > 0
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-brand-blue hover:underline"
                    }`}
                  >
                    {resendTimer > 0
                      ? `Resend code in ${resendTimer}s`
                      : "Resend code"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Use different email
                </button>
              </form>
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
