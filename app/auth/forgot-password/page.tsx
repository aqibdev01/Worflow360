"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  KeyRound,
  Lock,
  Check,
  X,
  Eye,
  EyeOff,
  Mail,
  ShieldQuestion,
  CheckCircle2,
  User,
} from "lucide-react";

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favorite movie?",
];

type Step = "email" | "question" | "password" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [isFallback, setIsFallback] = useState(false); // true for legacy accounts (no security question)
  const [fullName, setFullName] = useState(""); // fallback verification
  const [newSecurityQuestion, setNewSecurityQuestion] = useState(""); // legacy users must set one
  const [newSecurityAnswer, setNewSecurityAnswer] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValidPassword = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  // Auto-redirect on success
  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Step 1: Enter email, fetch security question
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/get-security-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to find account");
        return;
      }

      if (data.fallback) {
        // Legacy account — no security question, use name verification
        setIsFallback(true);
        setSecurityQuestion("");
      } else {
        setIsFallback(false);
        setSecurityQuestion(data.question);
      }
      setStep("question");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify identity and move to password step
  const handleVerifyIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isFallback) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setError("Please enter your full name");
        return;
      }
    } else {
      if (!securityAnswer.trim() || securityAnswer.trim().length < 2) {
        setError("Please enter your security answer");
        return;
      }
    }

    setStep("password");
  };

  // Step 3: Reset password via API
  const handleResetPassword = async (e: React.FormEvent) => {
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

    // For legacy fallback, require setting a security question for future resets
    if (isFallback) {
      if (!newSecurityQuestion) {
        setError("Please select a security question for future use");
        return;
      }
      if (!newSecurityAnswer.trim() || newSecurityAnswer.trim().length < 2) {
        setError("Please enter an answer for your security question");
        return;
      }
    }

    setLoading(true);

    try {
      const body: Record<string, string> = {
        email: email.trim(),
        newPassword: password,
      };

      if (isFallback) {
        body.fullName = fullName.trim();
        body.securityQuestion = newSecurityQuestion;
        body.newSecurityAnswer = newSecurityAnswer.trim();
      } else {
        body.securityAnswer = securityAnswer.trim();
      }

      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setStep("question");
          if (isFallback) setFullName("");
          else setSecurityAnswer("");
        }
        setError(data.error || "Failed to reset password");
        return;
      }

      setStep("success");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step indicators config
  const steps = [
    { key: "email", label: "1" },
    { key: "question", label: "2" },
    { key: "password", label: "3" },
  ];
  const stepOrder = ["email", "question", "password"];
  const currentStepIndex = stepOrder.indexOf(step);

  // Success Screen
  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-3">
                <Logo className="h-9 w-9" />
                <span className="text-xl font-bold text-white">
                  Workflow<span className="text-indigo-600">360</span>
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
              <h1 className="text-2xl font-bold text-foreground">Password Updated!</h1>
              <p className="text-gray-600">
                Your password has been changed successfully.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to login...
              </p>
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600 mx-auto" />
              <Link href="/auth/login">
                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-600/90 text-white">
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <Logo className="h-9 w-9" />
              <span className="text-xl font-bold text-white">
                Workflow<span className="text-indigo-600">360</span>
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
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStepIndex === i
                      ? "bg-indigo-600 text-white"
                      : currentStepIndex > i
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStepIndex > i ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    s.label
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-1 ${
                      currentStepIndex > i
                        ? "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Enter Email */}
          {step === "email" && (
            <>
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/10 border border-indigo-500/20">
                  <KeyRound className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm text-indigo-600 font-medium">Reset Password</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mt-4">Find Your Account</h1>
                <p className="text-gray-600 text-sm">
                  Enter the email address associated with your account
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email Address</Label>
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
                  className="w-full bg-indigo-600 hover:bg-indigo-600/90 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking up account...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Remember your password?{" "}
                  <Link href="/auth/login" className="text-indigo-600 hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* Step 2: Verify Identity */}
          {step === "question" && (
            <>
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/10 border border-indigo-500/20">
                  {isFallback ? (
                    <User className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <ShieldQuestion className="h-4 w-4 text-indigo-600" />
                  )}
                  <span className="text-sm text-indigo-600 font-medium">
                    {isFallback ? "Identity Verification" : "Security Question"}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mt-4">Verify Your Identity</h1>
                <p className="text-gray-600 text-sm">
                  {isFallback
                    ? "Enter the full name you used when signing up"
                    : "Answer the security question you set during registration"}
                </p>
              </div>

              <form onSubmit={handleVerifyIdentity} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                {isFallback ? (
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name as registered"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={loading}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      This must match the name you used when signing up (not case-sensitive)
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-foreground">{securityQuestion}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="securityAnswer" className="text-foreground">Your Answer</Label>
                      <div className="relative">
                        <ShieldQuestion className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="securityAnswer"
                          type="text"
                          placeholder="Enter your answer"
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                          disabled={loading}
                          className="pl-10"
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Answer is not case-sensitive
                      </p>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={loading || (isFallback ? !fullName.trim() : !securityAnswer.trim())}
                  className="w-full bg-indigo-600 hover:bg-indigo-600/90 text-white"
                >
                  Continue
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setSecurityAnswer("");
                    setFullName("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Go back
                </button>
              </form>
            </>
          )}

          {/* Step 3: New Password */}
          {step === "password" && (
            <>
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/10 border border-indigo-500/20">
                  <Lock className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm text-indigo-600 font-medium">New Password</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mt-4">Create New Password</h1>
                <p className="text-gray-600 text-sm">
                  Enter a strong password for your account
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">New Password</Label>
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
                  <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
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

                {/* Legacy users: set a security question for future resets */}
                {isFallback && (
                  <>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-700 font-medium">
                        Please set a security question for future password resets
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newSecurityQuestion" className="text-foreground">Security Question</Label>
                      <select
                        id="newSecurityQuestion"
                        value={newSecurityQuestion}
                        onChange={(e) => setNewSecurityQuestion(e.target.value)}
                        disabled={loading}
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">Select a security question...</option>
                        {SECURITY_QUESTIONS.map((q) => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>

                    {newSecurityQuestion && (
                      <div className="space-y-2">
                        <Label htmlFor="newSecurityAnswer" className="text-foreground">Security Answer</Label>
                        <Input
                          id="newSecurityAnswer"
                          type="text"
                          placeholder="Enter your answer"
                          value={newSecurityAnswer}
                          onChange={(e) => setNewSecurityAnswer(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    )}
                  </>
                )}

                <Button
                  type="submit"
                  disabled={loading || !isValidPassword || !passwordsMatch || (isFallback && (!newSecurityQuestion || !newSecurityAnswer.trim()))}
                  className="w-full bg-indigo-600 hover:bg-indigo-600/90 text-white"
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

                <button
                  type="button"
                  onClick={() => {
                    setStep("question");
                    setError("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Go back
                </button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
