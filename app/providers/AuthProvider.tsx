"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getOrCreateUserProfile } from "@/lib/database";
import type { User as UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            // Ensure user profile exists and fetch it
            await getOrCreateUserProfile(
              session.user.id,
              session.user.email || ""
            );
            await fetchUserProfile(session.user.id);
          } else {
            setUser(null);
            setUserProfile(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [fetchUserProfile]);

  // Listen to auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (session?.user) {
        setUser(session.user);
        // Ensure profile exists and fetch it
        try {
          await getOrCreateUserProfile(
            session.user.id,
            session.user.email || ""
          );
          await fetchUserProfile(session.user.id);
        } catch (error) {
          console.error("Error handling auth state change:", error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }

      // Handle specific events
      if (event === "SIGNED_IN") {
        console.log("User signed in");
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
      } else if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed");
      } else if (event === "USER_UPDATED") {
        console.log("User updated");
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Auto-refresh session before expiry
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    const setupAutoRefresh = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Refresh token 5 minutes before expiry
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const expiresIn = expiresAt * 1000 - Date.now();
          const refreshTime = Math.max(expiresIn - 5 * 60 * 1000, 0);

          refreshInterval = setTimeout(async () => {
            console.log("Auto-refreshing session...");
            const { error } = await supabase.auth.refreshSession();
            if (error) {
              console.error("Error refreshing session:", error);
            }
            // Setup next refresh
            setupAutoRefresh();
          }, refreshTime);
        }
      }
    };

    setupAutoRefresh();

    return () => {
      if (refreshInterval) {
        clearTimeout(refreshInterval);
      }
    };
  }, [user]);

  // Sign out function
  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        await fetchUserProfile(user.id);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  }, [fetchUserProfile]);

  const value = {
    user,
    userProfile,
    loading,
    signOut: handleSignOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
