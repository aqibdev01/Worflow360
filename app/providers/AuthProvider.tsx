"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
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
  const profileCache = useRef<Record<string, UserProfile>>({});

  // Fetch user profile — cached to avoid redundant DB calls
  const fetchUserProfile = useCallback(async (userId: string) => {
    // Return cached profile if we have it
    if (profileCache.current[userId]) {
      setUserProfile(profileCache.current[userId]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (data) {
        profileCache.current[userId] = data;
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    }
  }, []);

  // Single initialization via onAuthStateChange only — no duplicate getSession()
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch profile (non-blocking)
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Sign out
  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setUserProfile(null);
      profileCache.current = {};
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser();

      if (freshUser) {
        setUser(freshUser);
        // Force re-fetch profile (bust cache)
        delete profileCache.current[freshUser.id];
        await fetchUserProfile(freshUser.id);
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
