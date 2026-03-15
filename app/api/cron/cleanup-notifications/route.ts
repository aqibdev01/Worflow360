import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/cron/cleanup-notifications
 *
 * Deletes notifications older than 60 days.
 * Schedule weekly via Vercel Cron or external cron.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);

    const { error, count } = await (supabaseAdmin as any)
      .from("notifications")
      .delete()
      .lt("created_at", cutoffDate.toISOString())
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Cleanup error:", error);
      return NextResponse.json({ error: "Failed to clean up" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Cleanup complete",
      deleted: count || 0,
    });
  } catch (error) {
    console.error("Notification cleanup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
