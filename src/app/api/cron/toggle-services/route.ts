import { NextResponse } from "next/server";
import { z } from "zod";
import { syncCurrentWeekInDb } from "~/server/week-schedule";

/**
 * Vercel cron handler — hit by the platform's built-in scheduler
 * (configured in `vercel.json`) and by node-cron locally via HTTP.
 *
 * Query params:
 *   action  — "activate" | "deactivate"
 *   week    — the week number the schedule refers to (informational for now)
 *
 * The actual week gating lives in `week-schedule.ts` and is evaluated on
 * every upload request.  This endpoint simply keeps `Config.currentWeek`
 * in sync so the admin panel / UI always reflects the active week.
 */
const querySchema = z.object({
  action: z.enum(["activate", "deactivate"]),
  week: z.coerce.number().int().positive().optional(),
});

export async function GET(request: Request) {
  // Protect the endpoint: only Vercel's cron runner (or a local fetch with
  // the right secret) may call this.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    action: searchParams.get("action"),
    week: searchParams.get("week"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { action, week } = parsed.data;

  try {
    const result = await syncCurrentWeekInDb();

    return NextResponse.json({
      ok: true,
      action,
      week,
      ...result,
    });
  } catch (err) {
    console.error("[cron/toggle-services] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
