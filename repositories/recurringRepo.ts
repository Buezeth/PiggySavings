import * as Crypto from "expo-crypto";
import { getDatabase, runInExclusiveTransaction } from "../services/db/database";
import {
  RecurringScheduleRow,
  RecurringFrequency,
} from "../services/db/types";

export interface CreateRecurringScheduleInput {
  category_id: string;
  title: string;
  type: "income" | "expense";
  amount_cents: number;
  frequency: RecurringFrequency;
  custom_interval_days?: number | null;
  day_of_month?: number | null;
  start_date: string;
  next_occurrence?: string;
  is_active?: 0 | 1;
}

/**
 * Fetch all recurring schedules.
 */
export async function getRecurringSchedules(
  onlyActive = false
): Promise<RecurringScheduleRow[]> {
  const db = await getDatabase();
  const sql = onlyActive
    ? `SELECT * FROM recurring_schedules WHERE is_active = 1 ORDER BY next_occurrence ASC;`
    : `SELECT * FROM recurring_schedules ORDER BY next_occurrence ASC;`;
  return db.getAllAsync<RecurringScheduleRow>(sql);
}

/**
 * Fetch a single recurring schedule by ID.
 */
export async function getRecurringScheduleById(
  id: string
): Promise<RecurringScheduleRow | null> {
  const db = await getDatabase();
  return db.getFirstAsync<RecurringScheduleRow>(
    `SELECT * FROM recurring_schedules WHERE id = ?;`,
    [id]
  );
}

/**
 * Inserts a new recurring schedule.
 */
export async function createRecurringSchedule(
  input: CreateRecurringScheduleInput
): Promise<RecurringScheduleRow> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const nextOccurrence = input.next_occurrence ?? input.start_date;
  const isActive = input.is_active ?? 1;
  const roundedAmountCents = Math.round(input.amount_cents);

  await db.runAsync(
    `INSERT INTO recurring_schedules (
      id,
      category_id,
      title,
      type,
      amount_cents,
      frequency,
      custom_interval_days,
      day_of_month,
      start_date,
      next_occurrence,
      is_active,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.category_id,
      input.title.trim(),
      input.type,
      roundedAmountCents,
      input.frequency,
      input.custom_interval_days ?? null,
      input.day_of_month ?? null,
      input.start_date,
      nextOccurrence,
      isActive,
      now,
    ]
  );

  const created = await getRecurringScheduleById(id);
  if (!created) {
    throw new Error(`Failed to retrieve newly created recurring schedule with ID: ${id}`);
  }
  return created;
}

/**
 * Toggles the is_active status of a recurring schedule.
 */
export async function toggleRecurringSchedule(
  id: string,
  isActive?: boolean
): Promise<RecurringScheduleRow | null> {
  const db = await getDatabase();

  if (isActive !== undefined) {
    await db.runAsync(
      `UPDATE recurring_schedules SET is_active = ? WHERE id = ?;`,
      [isActive ? 1 : 0, id]
    );
  } else {
    await db.runAsync(
      `UPDATE recurring_schedules SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?;`,
      [id]
    );
  }

  return getRecurringScheduleById(id);
}

/**
 * Deletes a recurring schedule by ID.
 */
export async function deleteRecurringSchedule(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `DELETE FROM recurring_schedules WHERE id = ?;`,
    [id]
  );
  return result.changes > 0;
}
