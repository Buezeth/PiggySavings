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
 * @param startDate optional original start date (YYYY-MM-DD or ISO timestamp) to anchor day of month
 */
export function calculateNextOccurrence(
  currentOccurrenceDate: string,
  frequency: RecurringFrequency | "bi_weekly" | "custom_days",
  customIntervalDays?: number | null,
  dayOfMonth?: number | null,
  startDate?: string | null
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
      // Determine original anchor day from dayOfMonth or startDate
      let anchorDay = day;
      if (startDate) {
        const startDayParsed = parseInt(startDate.split("T")[0].split("-")[2], 10);
        if (!isNaN(startDayParsed)) {
          anchorDay = startDayParsed;
        }
      }
      const targetDay = dayOfMonth ?? anchorDay;
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
 * Returns today's date formatted as YYYY-MM-DD using the device's local calendar time.
 */
export function getLocalTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Checks and executes all due recurring transactions and scheduled savings rules.
 * Runs atomically inside an exclusive transaction.
 */
export async function processDueRecurringSchedules(): Promise<ProcessedScheduleResult[]> {
  const db = await getDatabase();
  const results: ProcessedScheduleResult[] = [];
  const todayStr = getLocalTodayStr();

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

    const MAX_OCCURRENCE_ITERATIONS = 365;

    for (const schedule of dueSchedules) {
      let currentOccurrence = schedule.next_occurrence;
      let iterationCount = 0;

      while (currentOccurrence <= todayStr && iterationCount < MAX_OCCURRENCE_ITERATIONS) {
        iterationCount++;
        const txId = Crypto.randomUUID();
        const now = new Date().toISOString();
        const idempotencyKey = `recurring_${schedule.id}_${currentOccurrence}`;

        // 1. Insert transaction with idempotency key
        const insertResult = await txn.runAsync(
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
            currentOccurrence,
            idempotencyKey,
            now,
          ]
        );

        const wasInserted = insertResult.changes > 0;

        // 2. If type === 'income' and transaction was newly inserted, run auto-allocation engine
        let allocationSummary: AutoAllocationSummary | undefined;
        if (wasInserted && schedule.type === "income" && schedule.amount_cents > 0) {
          allocationSummary = await evaluateAutoAllocations(
            schedule.amount_cents,
            schedule.category_id,
            txId,
            txn
          );
        }

        // 3. Compute next occurrence date
        const nextDateStr = calculateNextOccurrence(
          currentOccurrence,
          schedule.frequency,
          schedule.custom_interval_days,
          schedule.day_of_month,
          schedule.start_date
        );

        // Guard against non-advancing dates
        if (nextDateStr <= currentOccurrence) {
          console.warn(`Recurring schedule ${schedule.id} failed to advance past ${currentOccurrence}. Aborting loop.`);
          break;
        }

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
          previousOccurrence: currentOccurrence,
          nextOccurrence: nextDateStr,
          allocationSummary,
        });

        currentOccurrence = nextDateStr;
      }
    }
  });

  return results;
}

/**
 * Queries all active recurring schedules that are currently due for review / execution.
 */
export async function getPendingRecurringSchedules(): Promise<RecurringScheduleRow[]> {
  const db = await getDatabase();
  const todayStr = getLocalTodayStr();
  return await db.getAllAsync<RecurringScheduleRow>(
    `SELECT * FROM recurring_schedules 
     WHERE next_occurrence <= ? AND is_active = 1 
     ORDER BY next_occurrence ASC;`,
    [todayStr]
  );
}

/**
 * Confirms and writes a single due recurring schedule to the ledger, optionally with an adjusted amount or date,
 * and advances the schedule's next_occurrence.
 */
export async function confirmRecurringSchedule(
  scheduleId: string,
  customAmountCents?: number,
  customDate?: string
): Promise<{ transactionId: string; nextOccurrence: string; allocationSummary?: AutoAllocationSummary }> {
  const db = await getDatabase();

  return await runInExclusiveTransaction(db, async (txn) => {
    const schedule = await txn.getFirstAsync<RecurringScheduleRow>(
      `SELECT * FROM recurring_schedules WHERE id = ?;`,
      [scheduleId]
    );

    if (!schedule) {
      throw new Error(`Recurring schedule with ID ${scheduleId} not found.`);
    }

    const txId = Crypto.randomUUID();
    const now = new Date().toISOString();
    const finalAmountCents = customAmountCents !== undefined ? Math.round(customAmountCents) : schedule.amount_cents;
    const finalDate = customDate ?? schedule.next_occurrence;
    const idempotencyKey = `recurring_${schedule.id}_${schedule.next_occurrence}_${Date.now()}`;

    // 1. Insert transaction
    await txn.runAsync(
      `INSERT INTO transactions (
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
        finalAmountCents,
        `Recurring: ${schedule.title}`,
        finalDate,
        idempotencyKey,
        now,
      ]
    );

    // 2. If income and amount > 0, run auto-allocation engine
    let allocationSummary: AutoAllocationSummary | undefined;
    if (schedule.type === "income" && finalAmountCents > 0) {
      allocationSummary = await evaluateAutoAllocations(
        finalAmountCents,
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
      schedule.day_of_month,
      schedule.start_date
    );

    // 4. Update recurring schedule next_occurrence
    await txn.runAsync(
      `UPDATE recurring_schedules 
       SET next_occurrence = ?
       WHERE id = ?;`,
      [nextDateStr, schedule.id]
    );

    return {
      transactionId: txId,
      nextOccurrence: nextDateStr,
      allocationSummary,
    };
  });
}

/**
 * Advances a recurring schedule's next_occurrence without writing a transaction to the ledger.
 */
export async function skipRecurringOccurrence(
  scheduleId: string
): Promise<{ nextOccurrence: string }> {
  const db = await getDatabase();

  return await runInExclusiveTransaction(db, async (txn) => {
    const schedule = await txn.getFirstAsync<RecurringScheduleRow>(
      `SELECT * FROM recurring_schedules WHERE id = ?;`,
      [scheduleId]
    );

    if (!schedule) {
      throw new Error(`Recurring schedule with ID ${scheduleId} not found.`);
    }

    const nextDateStr = calculateNextOccurrence(
      schedule.next_occurrence,
      schedule.frequency,
      schedule.custom_interval_days,
      schedule.day_of_month,
      schedule.start_date
    );

    await txn.runAsync(
      `UPDATE recurring_schedules 
       SET next_occurrence = ?
       WHERE id = ?;`,
      [nextDateStr, schedule.id]
    );

    return {
      nextOccurrence: nextDateStr,
    };
  });
}

/**
 * Clamps custom recurring days string/number to the inclusive 1–365 range.
 * Defaults to 15 if missing, NaN, or non-positive.
 */
export function parseClampedCustomDays(input: string | number | null | undefined, fallback = 15): number {
  if (input === null || input === undefined) return fallback;
  const parsed = typeof input === "number" ? input : parseInt(input, 10);
  if (isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(365, parsed);
}
