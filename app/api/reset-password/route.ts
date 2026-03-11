import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory rate limiting: max 5 attempts per email per 15 minutes
const attempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const record = attempts.get(email);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(email, { count: 1, firstAttempt: now });
    return false;
  }

  record.count++;
  if (record.count > MAX_ATTEMPTS) {
    return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const { email, securityAnswer, fullName, newPassword, securityQuestion: newSecurityQuestion, newSecurityAnswer } = await request.json();

    if (!email || (!securityAnswer && !fullName) || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit check
    if (isRateLimited(normalizedEmail)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === "your_service_role_key_here") {
      return NextResponse.json(
        { error: "Server configuration error. Please contact the administrator." },
        { status: 500 }
      );
    }

    // Create admin client with service role key (server-side only)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up user by email
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, security_answer")
      .eq("email", normalizedEmail)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 403 }
      );
    }

    // Determine verification mode
    if (userProfile.security_answer && securityAnswer) {
      // Normal path: verify security answer
      const storedAnswer = userProfile.security_answer.toLowerCase().trim();
      const providedAnswer = securityAnswer.toLowerCase().trim();

      if (storedAnswer !== providedAnswer) {
        return NextResponse.json(
          { error: "The security answer is incorrect" },
          { status: 403 }
        );
      }
    } else if (!userProfile.security_answer && fullName) {
      // Fallback for legacy accounts: verify full name
      const storedName = (userProfile.full_name || "").toLowerCase().trim();
      const providedName = fullName.toLowerCase().trim();

      if (!storedName || storedName !== providedName) {
        return NextResponse.json(
          { error: "The full name does not match our records" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid verification method" },
        { status: 400 }
      );
    }

    // Verification passed — reset rate limit
    attempts.delete(normalizedEmail);

    // Update password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userProfile.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update password. Please try again." },
        { status: 500 }
      );
    }

    // If legacy account provided a new security question, save it
    if (newSecurityQuestion && newSecurityAnswer) {
      await supabaseAdmin
        .from("users")
        .update({
          security_question: newSecurityQuestion,
          security_answer: newSecurityAnswer.toLowerCase().trim(),
        })
        .eq("id", userProfile.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset password API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
