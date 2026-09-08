import cron from "node-cron";
import { syncCurrentWeekInDb } from "./week-schedule";

/**
 * Local-only cron scheduler using node-cron.
 *
 * On Vercel, scheduled jobs are handled by the platform's built-in cron
 * (`vercel.json` → `/api/cron/toggle-services`).  For local development and
 * self-hosted instances we replicate the same behaviour with node-cron.
 *
 * The module is a singleton: calling `startLocalCron()` more than once is
 * safe and idempotent.
 */

let started = false;

/**
 * Start the local cron scheduler.  Safe to call multiple times — only the
 * first call has any effect.
 *
 * Schedule: every minute (`* * * * *`).  The job syncs `Config.currentWeek`
 * to match the real-time week schedule.
 */
export function startLocalCron(): void {
  if (started) return;
  started = true;

  // Every minute: reconcile DB with the real-time clock.
  cron.schedule("* * * * *", async () => {
    try {
      const result = await syncCurrentWeekInDb();
      if (result.updated) {
        console.log(
          `[local-cron] currentWeek updated: ${result.previousWeek} → ${result.currentWeek}`,
        );
      }
    } catch (err) {
      console.error("[local-cron] failed to sync currentWeek:", err);
    }
  });

  console.log("[local-cron] scheduler started (every minute)");
}
