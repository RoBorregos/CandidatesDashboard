import { NextResponse } from "next/server";
import { syncCurrentWeekInDb } from "~/server/week-schedule";

/**
 * Vercel cron handler — hit once daily by the platform's built-in scheduler
 * (configured in `vercel.json`) and by node-cron locally via HTTP.
 *
 * The actual week gating lives in `week-schedule.ts` and is evaluated on
 * every upload request.  This endpoint simply keeps `Config.currentWeek`
 * in sync so the admin panel / UI always reflects the active week.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncCurrentWeekInDb();

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/toggle-services] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
