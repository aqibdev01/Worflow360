import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limit: max 10 lookups per IP per 15 minutes
const lookups = new Map<string, { count: number; firstAttempt: number }>();
const MAX_LOOKUPS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = lookups.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    lookups.set(ip, { count: 1, firstAttempt: now });
    return false;
  }

  record.count++;
  if (record.count > MAX_LOOKUPS) {
    return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up the user's security question by email (do NOT return the answer)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("security_question, full_name")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      );
    }

    if (!userProfile.security_question) {
      // Legacy account — no security question set, use name verification fallback
      return NextResponse.json({
        question: null,
        fallback: true,
        hint: userProfile.full_name
          ? `Verify your full name to continue`
          : null,
      });
    }

    return NextResponse.json({ question: userProfile.security_question, fallback: false });
  } catch (err) {
    console.error("Get security question API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
