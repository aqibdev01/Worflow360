// Authentication utility functions for Workflow360
// Handles Supabase Auth operations and user management

import { supabase } from "./supabase";
import { getOrCreateUserProfile } from "./database";
import type { User } from "@supabase/supabase-js";

export interface SignUpCredentials {
  email: string;
  password: string;
  fullName?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse<T> {
  data?: T;
  error?: AuthError;
}

// =====================================================
// SIGN UP
// =====================================================

/**
 * Register a new user with email and password
 * Creates auth user and profile in one transaction
 */
export async function signUp(
  credentials: SignUpCredentials
): Promise<AuthResponse<User>> {
  try {
    const { email, password, fullName } = credentials;

    console.log("🔐 Attempting sign up for:", email);

    // Sign up user with Supabase Auth
    // Note: For OTP-based verification, Supabase must be configured in the dashboard:
    // 1. Go to Authentication > Email Templates > Confirm signup
    // 2. Use {{ .Token }} in the template to include the 6-digit OTP code
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        // Don't set emailRedirectTo - we want OTP verification, not magic links
      },
    });

    if (authError) {
      console.error("❌ Sign up error:", authError);
      return { error: { message: authError.message, code: authError.code } };
    }

    if (!authData.user) {
      console.error("❌ No user returned after signup");
      return { error: { message: "Failed to create user account" } };
    }

    console.log("✅ Auth user created:", authData.user.id);
    console.log("📧 Email confirmation required:", authData.user.email_confirmed_at === null);

    // Create user profile in public.users table
    try {
      await getOrCreateUserProfile(authData.user.id, email);

      // Update full_name if provided
      if (fullName) {
        await supabase
          .from("users")
          .update({ full_name: fullName })
          .eq("id", authData.user.id);
      }
    } catch (profileError) {
      console.error("Error creating user profile:", profileError);
      // Don't fail the signup if profile creation fails
      // The profile will be created on first login
    }

    return { data: authData.user };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// =====================================================
// SIGN IN
// =====================================================

/**
 * Sign in existing user with email and password
 */
export async function signIn(
  credentials: SignInCredentials
): Promise<AuthResponse<User>> {
  try {
    const { email, password } = credentials;

    console.log("🔐 Attempting sign in for:", email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("❌ Sign in error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      return { error: { message: error.message, code: error.code } };
    }

    if (!data.user) {
      console.error("❌ No user returned after signin");
      return { error: { message: "Failed to sign in" } };
    }

    console.log("✅ Sign in successful:", data.user.id);
    console.log("📧 Email confirmed:", data.user.email_confirmed_at !== null);

    // Ensure user profile exists
    try {
      await getOrCreateUserProfile(data.user.id, email);
    } catch (profileError) {
      console.error("Error ensuring user profile:", profileError);
    }

    return { data: data.user };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// =====================================================
// SIGN OUT
// =====================================================

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResponse<void>> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { data: undefined };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// =====================================================
// PASSWORD RESET
// =====================================================

/**
 * Send password reset email to user
 */
export async function resetPassword(email: string): Promise<AuthResponse<void>> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { data: undefined };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

/**
 * Update user password (requires active session)
 */
export async function updatePassword(
  newPassword: string
): Promise<AuthResponse<User>> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    if (!data.user) {
      return { error: { message: "Failed to update password" } };
    }

    return { data: data.user };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// =====================================================
// SESSION MANAGEMENT
// =====================================================

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthResponse<User>> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    if (!user) {
      return { error: { message: "No user logged in" } };
    }

    return { data: user };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

/**
 * Get current session
 */
export async function getSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { data: session };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

/**
 * Refresh the current session
 */
export async function refreshSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { data: session };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// =====================================================
// EMAIL VERIFICATION
// =====================================================

/**
 * Resend verification email
 */
export async function resendVerificationEmail(
  email: string
): Promise<AuthResponse<void>> {
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { data: undefined };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// =====================================================
// OAUTH PROVIDERS
// =====================================================

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 */
export async function signInWithOAuth(
  provider: "google" | "github" | "gitlab" | "azure"
) {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { data };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// =====================================================
// USER PROFILE
// =====================================================

/**
 * Get user profile from public.users table
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      return { error: { message: error.message } };
    }

    return { data };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: { full_name?: string; avatar_url?: string }
) {
  try {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return { error: { message: error.message } };
    }

    return { data };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// =====================================================
// EMAIL UPDATE
// =====================================================

/**
 * Update user email (requires confirmation)
 */
export async function updateEmail(newEmail: string): Promise<AuthResponse<User>> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    if (!data.user) {
      return { error: { message: "Failed to update email" } };
    }

    return { data: data.user };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// =====================================================
// AUTH STATE HELPERS
// =====================================================

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}
