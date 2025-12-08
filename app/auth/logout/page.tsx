"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Logging out...");

  useEffect(() => {
    async function logout() {
      try {
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("Logout error:", error);
          setStatus("Error logging out. Redirecting to login...");
        } else {
          setStatus("Logged out successfully! Redirecting...");
        }

        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push("/auth/login");
        }, 1000);
      } catch (err) {
        console.error("Logout error:", err);
        setStatus("Error occurred. Redirecting...");
        setTimeout(() => {
          router.push("/auth/login");
        }, 1000);
      }
    }

    logout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}
