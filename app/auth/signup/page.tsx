"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, User, Mail, Lock, Check, X } from "lucide-react";

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Password strength requirements
interface PasswordStrength {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

function checkPasswordStrength(password: string): PasswordStrength {
  return {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

function getPasswordStrengthScore(strength: PasswordStrength): number {
  return Object.values(strength).filter(Boolean).length;
}

function getPasswordStrengthLabel(score: number): { label: string; color: string } {
  if (score <= 2) return { label: "Weak", color: "text-red-600" };
  if (score <= 3) return { label: "Fair", color: "text-orange-500" };
  if (score <= 4) return { label: "Good", color: "text-yellow-600" };
  return { label: "Strong", color: "text-green-600" };
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <X className="h-3.5 w-3.5 text-gray-400" />
      )}
      <span className={`text-xs ${met ? "text-green-700" : "text-gray-500"}`}>
        {text}
      </span>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // Real-time validation
  const emailValid = useMemo(() => EMAIL_REGEX.test(email), [email]);
  const passwordStrength = useMemo(() => checkPasswordStrength(password), [password]);
  const passwordScore = useMemo(() => getPasswordStrengthScore(passwordStrength), [passwordStrength]);
  const passwordsMatch = useMemo(() => password === confirmPassword && confirmPassword.length > 0, [password, confirmPassword]);

  useEffect(() => {
    const configured = isSupabaseConfigured();
    setSupabaseConfigured(configured);
    if (!configured) {
      setError(
        "⚠️ Supabase is not configured. Please check the browser console for setup instructions."
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate name is provided
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }

    // Validate name has at least 2 characters
    if (fullName.trim().length < 2) {
      setError("Name must be at least 2 characters long");
      return;
    }

    // Validate email format
    if (!emailValid) {
      setError("Please enter a valid email address");
      return;
    }

    // Validate password strength (at least 3 requirements met)
    if (passwordScore < 3) {
      setError("Password is too weak. Please meet at least 3 of the requirements below.");
      setShowPasswordRequirements(true);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      console.log("📝 Starting signup process...");
      const { data, error: authError } = await signUp({
        email,
        password,
        fullName,
      });

      console.log("📝 Signup response:", { data, authError });

      if (authError) {
        console.error("❌ Signup error:", authError);
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data) {
        console.log("✅ Signup successful, redirecting to verification...");
        setSuccess(true);
        // Redirect to email verification page instead of dashboard
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        }, 1500);
      } else {
        // Handle case where no data and no error (shouldn't happen but just in case)
        console.error("❌ No data returned from signup");
        setError("Signup failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("❌ Unexpected error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-3">
                <Logo className="h-9 w-9" />
                <span className="text-xl font-bold text-gray-900">
                  Workflow<span className="text-blue-600">360</span>
                </span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="flex items-center justify-center min-h-screen pt-16">
          <Card className="w-full max-w-md bg-white border-gray-100 shadow-lg p-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-100">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Verify Your Email</h3>
                <p className="text-gray-600 mt-2">
                  We've sent a 6-digit code to <span className="font-medium text-blue-600">{email}</span>
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Redirecting to verification page...
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
              <Link href="/auth/login">
                <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:bg-gray-50">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Signup Form */}
      <div className="flex items-center justify-center min-h-screen pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-white border-gray-100 shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 border border-violet-100 mb-4">
              <div className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
              <span className="text-sm text-violet-700 font-medium">Start Your Free Trial</span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Create Account
            </h1>
            <p className="text-gray-600">
              Get started with Workflow360 today
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
              <Label htmlFor="fullName" className="text-gray-700">Full Name <span className="text-red-500">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  disabled={loading}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

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
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setShowPasswordRequirements(true)}
                  placeholder="Create a strong password"
                  disabled={loading}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Password strength:</span>
                    <span className={`text-xs font-medium ${getPasswordStrengthLabel(passwordScore).color}`}>
                      {getPasswordStrengthLabel(passwordScore).label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordScore <= 2
                          ? "bg-red-500"
                          : passwordScore <= 3
                          ? "bg-orange-500"
                          : passwordScore <= 4
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${(passwordScore / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              {(showPasswordRequirements || password.length > 0) && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-1.5">
                  <p className="text-xs font-medium text-gray-600 mb-2">Password must have:</p>
                  <PasswordRequirement met={passwordStrength.hasMinLength} text="At least 8 characters" />
                  <PasswordRequirement met={passwordStrength.hasUppercase} text="One uppercase letter" />
                  <PasswordRequirement met={passwordStrength.hasLowercase} text="One lowercase letter" />
                  <PasswordRequirement met={passwordStrength.hasNumber} text="One number" />
                  <PasswordRequirement met={passwordStrength.hasSpecialChar} text="One special character (!@#$%...)" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  disabled={loading}
                  className={`pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? "border-green-500 focus:border-green-500"
                        : "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
                {confirmPassword.length > 0 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {passwordsMatch ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              By creating an account, you agree to our{" "}
              <Link href="#" className="text-blue-600 hover:text-blue-700">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="text-blue-600 hover:text-blue-700">
                Privacy Policy
              </Link>
            </p>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>

            <Link href="/auth/login" className="block">
              <Button type="button" variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50">
                Sign in instead
              </Button>
            </Link>
          </form>
        </Card>
      </div>
    </div>
  );
}
