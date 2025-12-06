"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestAuthPage() {
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {};

    // Test 1: Check Supabase connection
    console.log("🧪 Test 1: Checking Supabase connection...");
    try {
      const { data, error } = await supabase.auth.getSession();
      results.connection = {
        success: !error,
        message: error ? error.message : "Connected successfully",
        session: data.session ? "Session exists" : "No session",
      };
      console.log("✅ Supabase connection test:", results.connection);
    } catch (err: any) {
      results.connection = {
        success: false,
        message: err.message,
      };
      console.error("❌ Connection error:", err);
    }

    // Test 2: Check if users table exists
    console.log("🧪 Test 2: Checking if users table exists...");
    try {
      const { data, error } = await supabase.from("users").select("count").limit(1);
      results.usersTable = {
        success: !error,
        message: error ? error.message : "Users table exists",
        details: error?.details || error?.hint || "Table accessible",
      };
      console.log("✅ Users table test:", results.usersTable);
    } catch (err: any) {
      results.usersTable = {
        success: false,
        message: err.message,
      };
      console.error("❌ Users table error:", err);
    }

    // Test 3: Check email confirmation settings
    console.log("🧪 Test 3: Checking auth settings...");
    try {
      // Try to get current user
      const { data: { user }, error } = await supabase.auth.getUser();
      results.authSettings = {
        currentUser: user ? user.email : "No user logged in",
        userConfirmed: user?.email_confirmed_at ? "Yes" : "No",
      };
      console.log("✅ Auth settings test:", results.authSettings);
    } catch (err: any) {
      results.authSettings = {
        error: err.message,
      };
      console.error("❌ Auth settings error:", err);
    }

    // Test 4: Check organizations table
    console.log("🧪 Test 4: Checking organizations table...");
    try {
      const { data, error } = await supabase.from("organizations").select("count").limit(1);
      results.orgsTable = {
        success: !error,
        message: error ? error.message : "Organizations table exists",
        details: error?.details || error?.hint || "Table accessible",
      };
      console.log("✅ Organizations table test:", results.orgsTable);
    } catch (err: any) {
      results.orgsTable = {
        success: false,
        message: err.message,
      };
      console.error("❌ Organizations table error:", err);
    }

    // Test 5: Try a test signup
    console.log("🧪 Test 5: Testing signup flow...");
    const testEmail = `test${Date.now()}@workflow360test.com`;
    const testPassword = "TestPassword123!";

    try {
      console.log("Attempting signup with:", testEmail);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      if (authError) {
        results.signup = {
          success: false,
          message: authError.message,
          code: authError.code,
        };
        console.error("❌ Signup error:", authError);
      } else {
        results.signup = {
          success: true,
          message: "Signup successful",
          userId: authData.user?.id,
          emailConfirmed: authData.user?.email_confirmed_at !== null,
          confirmationRequired: authData.user?.email_confirmed_at === null,
        };
        console.log("✅ Signup test:", results.signup);

        // Test 6: Try to create user profile
        if (authData.user) {
          console.log("🧪 Test 6: Creating user profile...");
          try {
            const { data: profileData, error: profileError } = await supabase
              .from("users")
              .insert({
                id: authData.user.id,
                email: testEmail,
              })
              .select()
              .single();

            results.profileCreation = {
              success: !profileError,
              message: profileError ? profileError.message : "Profile created",
              details: profileError?.details || profileError?.hint || "Success",
            };
            console.log("✅ Profile creation test:", results.profileCreation);

            // Clean up - delete test user profile
            if (!profileError) {
              await supabase.from("users").delete().eq("id", authData.user.id);
            }
          } catch (err: any) {
            results.profileCreation = {
              success: false,
              message: err.message,
            };
            console.error("❌ Profile creation error:", err);
          }
        }

        // Clean up - delete test auth user
        try {
          await supabase.auth.admin.deleteUser(authData.user?.id || "");
        } catch (e) {
          console.log("Note: Could not delete test user (admin access required)");
        }
      }
    } catch (err: any) {
      results.signup = {
        success: false,
        message: err.message,
      };
      console.error("❌ Signup test error:", err);
    }

    setTestResults(results);
    setLoading(false);
    console.log("🎯 All tests complete:", results);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Supabase Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This page will run diagnostic tests on your Supabase setup to identify authentication issues.
          </p>

          <Button onClick={runTests} disabled={loading}>
            {loading ? "Running Tests..." : "Run Diagnostic Tests"}
          </Button>

          {Object.keys(testResults).length > 0 && (
            <div className="space-y-4 mt-6">
              <h3 className="font-semibold text-lg">Test Results:</h3>

              {Object.entries(testResults).map(([key, value]: [string, any]) => (
                <div key={key} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold mb-2">What to check:</h4>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Connection should be successful</li>
              <li>Users table should exist</li>
              <li>Organizations table should exist</li>
              <li>Signup should succeed</li>
              <li>Profile creation should work</li>
              <li>Check browser console (F12) for detailed logs</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
