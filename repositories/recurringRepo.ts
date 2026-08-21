import * as Crypto from "expo-crypto";
import { getDatabase } from "../services/db/database";
import {
  RecurringScheduleRow,
  RecurringFrequency,
} from "../services/db/types";
import { calculateNextOccurrence, getLocalTodayStr } from "../services/recurring/recurringEngine";

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

export interface UpdateRecurringScheduleInput {
  category_id?: string;
  title?: string;
  type?: "income" | "expense";
  amount_cents?: number;
  frequency?: RecurringFrequency;
  custom_interval_days?: number | null;
  day_of_month?: number | null;
  start_date?: string;
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
  const dateOnly = (input.start_date || getLocalTodayStr()).split("T")[0];
  const nextOccurrence = (input.next_occurrence ? input.next_occurrence.split("T")[0] : dateOnly);
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
      dateOnly,
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
 * Updates an existing recurring schedule.
 */
export async function updateRecurringSchedule(
  id: string,
  input: UpdateRecurringScheduleInput
): Promise<RecurringScheduleRow | null> {
  const db = await getDatabase();
  const existing = await getRecurringScheduleById(id);
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.title !== undefined) {
    updates.push("title = ?");
    params.push(input.title.trim());
  }
  if (input.category_id !== undefined) {
    updates.push("category_id = ?");
    params.push(input.category_id);
  }
  if (input.type !== undefined) {
    updates.push("type = ?");
    params.push(input.type);
  }
  if (input.amount_cents !== undefined) {
    updates.push("amount_cents = ?");
    params.push(Math.round(input.amount_cents));
  }
  if (input.frequency !== undefined) {
    updates.push("frequency = ?");
    params.push(input.frequency);
  }
  if (input.custom_interval_days !== undefined) {
    updates.push("custom_interval_days = ?");
    params.push(input.custom_interval_days ?? null);
  }
  if (input.day_of_month !== undefined) {
    updates.push("day_of_month = ?");
    params.push(input.day_of_month ?? null);
  }
  if (input.start_date !== undefined) {
    updates.push("start_date = ?");
    params.push(input.start_date.split("T")[0]);
  }
  if (input.next_occurrence !== undefined) {
    updates.push("next_occurrence = ?");
    params.push(input.next_occurrence.split("T")[0]);
  }
  if (input.is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(input.is_active);
  }

  if (updates.length === 0) {
    return existing;
  }

  params.push(id);
  await db.runAsync(
    `UPDATE recurring_schedules SET ${updates.join(", ")} WHERE id = ?;`,
    params
  );

  return getRecurringScheduleById(id);
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

