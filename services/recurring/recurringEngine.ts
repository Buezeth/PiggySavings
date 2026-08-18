import * as Crypto from "expo-crypto";
import { getDatabase, runInExclusiveTransaction } from "../db/database";
import { RecurringScheduleRow, RecurringFrequency } from "../db/types";
import { evaluateAutoAllocations, AutoAllocationSummary } from "../allocation/allocationEngine";

export interface ProcessedScheduleResult {
  scheduleId: string;
  title: string;
  type: "income" | "expense";
  amountCents: number;
  transactionId: string;
  previousOccurrence: string;
  nextOccurrence: string;
  allocationSummary?: AutoAllocationSummary;
}

/**
 * Calculates the next occurrence date formatted as YYYY-MM-DD.
 * Handles month-ends (e.g., Jan 31 -> Feb 28/29, Mar 31 -> Apr 30) and leap years gracefully.
 *
 * @param currentOccurrenceDate YYYY-MM-DD string or ISO timestamp
 * @param frequency 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
 * @param customIntervalDays optional integer for custom interval (e.g. 15)
 * @param dayOfMonth optional target day of month (e.g. 31)
 */
export function calculateNextOccurrence(
  currentOccurrenceDate: string,
  frequency: RecurringFrequency | "bi_weekly" | "custom_days",
  customIntervalDays?: number | null,
  dayOfMonth?: number | null
): string {
  // Extract date components from YYYY-MM-DD
  const datePart = currentOccurrenceDate.split("T")[0];
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  const baseDate = new Date(Date.UTC(year, month, day, 12, 0, 0));

  const normalizedFreq = (frequency === "bi_weekly" ? "biweekly" : frequency === "custom_days" ? "custom" : frequency) as RecurringFrequency;

  switch (normalizedFreq) {
    case "daily": {
      baseDate.setUTCDate(baseDate.getUTCDate() + 1);
      return baseDate.toISOString().split("T")[0];
    }
    case "weekly": {
      baseDate.setUTCDate(baseDate.getUTCDate() + 7);
      return baseDate.toISOString().split("T")[0];
    }
    case "biweekly": {
      baseDate.setUTCDate(baseDate.getUTCDate() + 14);
      return baseDate.toISOString().split("T")[0];
    }
    case "custom": {
      const days = customIntervalDays && customIntervalDays > 0 ? customIntervalDays : 1;
      baseDate.setUTCDate(baseDate.getUTCDate() + days);
      return baseDate.toISOString().split("T")[0];
    }
    case "monthly": {
      // Month-end calculation
      const targetDay = dayOfMonth ?? day;
      const targetMonthIndex = baseDate.getUTCMonth() + 1;
      const targetYear = baseDate.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
      const normalizedMonth = targetMonthIndex % 12;

      // Find max days in the target month (day 0 of month + 1 gives total days)
      const maxDaysInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
      const clampedDay = Math.min(targetDay, maxDaysInTargetMonth);

      const nextDate = new Date(Date.UTC(targetYear, normalizedMonth, clampedDay, 12, 0, 0));
      return nextDate.toISOString().split("T")[0];
    }
    default: {
      baseDate.setUTCDate(baseDate.getUTCDate() + 1);
      return baseDate.toISOString().split("T")[0];
    }
  }
}

/**
 * Checks and executes all due recurring transactions and scheduled savings rules.
 * Runs atomically inside an exclusive transaction.
 */
export async function processDueRecurringSchedules(): Promise<ProcessedScheduleResult[]> {
  const db = await getDatabase();
  const results: ProcessedScheduleResult[] = [];
  const todayStr = new Date().toISOString().split("T")[0];

  await runInExclusiveTransaction(db, async (txn) => {
    // 1. Query recurring_schedules where next_occurrence <= today and is_active = 1
    const dueSchedules = (await txn.getAllAsync(
      `SELECT * FROM recurring_schedules 
       WHERE next_occurrence <= ? AND is_active = 1 
       ORDER BY next_occurrence ASC;`,
      [todayStr]
    )) as RecurringScheduleRow[];

    if (!dueSchedules || dueSchedules.length === 0) {
      return;
    }

    for (const schedule of dueSchedules) {
      const txId = Crypto.randomUUID();
      const now = new Date().toISOString();
      const idempotencyKey = `recurring_${schedule.id}_${schedule.next_occurrence}`;

      // 1. Insert transaction with idempotency key
      await txn.runAsync(
        `INSERT OR IGNORE INTO transactions (
          id,
          category_id,
          type,
          amount_cents,
          note,
          transaction_date,
          idempotency_key,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          txId,
          schedule.category_id,
          schedule.type,
          schedule.amount_cents,
          `Recurring: ${schedule.title}`,
          schedule.next_occurrence,
          idempotencyKey,
          now,
        ]
      );

      // 2. If type === 'income', run auto-allocation engine
      let allocationSummary: AutoAllocationSummary | undefined;
      if (schedule.type === "income" && schedule.amount_cents > 0) {
        allocationSummary = await evaluateAutoAllocations(
          schedule.amount_cents,
          schedule.category_id,
          txId,
          txn
        );
      }

      // 3. Compute next occurrence date
      const nextDateStr = calculateNextOccurrence(
        schedule.next_occurrence,
        schedule.frequency,
        schedule.custom_interval_days,
        schedule.day_of_month
      );

      // 4. Update recurring schedule next_occurrence
      await txn.runAsync(
        `UPDATE recurring_schedules 
         SET next_occurrence = ?
         WHERE id = ?;`,
        [nextDateStr, schedule.id]
      );

      results.push({
        scheduleId: schedule.id,
        title: schedule.title,
        type: schedule.type,
        amountCents: schedule.amount_cents,
        transactionId: txId,
        previousOccurrence: schedule.next_occurrence,
        nextOccurrence: nextDateStr,
        allocationSummary,
      });
    }
  });

  return results;
}
