import * as Crypto from "expo-crypto";
import { getDatabase, runInExclusiveTransaction } from "../services/db/database";
import { GoalRow, GoalStatus, CardVariant } from "../services/db/types";

export interface CreateGoalInput {
  title: string;
  target_amount_cents: number;
  current_amount_cents?: number;
  target_date?: string | null;
  status?: GoalStatus;
  priority_label?: string | null;
  category_tag?: string | null;
  icon_name?: string | null;
  icon_family?: string | null;
  card_variant?: CardVariant;
}

export interface UpdateGoalInput {
  title?: string;
  target_amount_cents?: number;
  current_amount_cents?: number;
  target_date?: string | null;
  status?: GoalStatus;
  priority_label?: string | null;
  category_tag?: string | null;
  icon_name?: string | null;
  icon_family?: string | null;
  card_variant?: CardVariant;
}

/**
 * Fetch all active goals ordered by created date descending.
 */
export async function getActiveGoals(): Promise<GoalRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT * FROM goals WHERE status = 'active' ORDER BY created_at DESC;`
  );
  return rows;
}

/**
 * Fetch all goals regardless of status.
 */
export async function getAllGoals(): Promise<GoalRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT * FROM goals ORDER BY created_at DESC;`
  );
  return rows;
}

/**
 * Fetch a single goal by its ID.
 */
export async function getGoalById(id: string): Promise<GoalRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GoalRow>(
    `SELECT * FROM goals WHERE id = ?;`,
    [id]
  );
  return row ?? null;
}

/**
 * Insert a new savings goal with integer cents.
 */
export async function createGoal(goal: CreateGoalInput): Promise<GoalRow> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const currentAmountCents = Math.round(goal.current_amount_cents ?? 0);
  const targetAmountCents = Math.round(goal.target_amount_cents);
  const status: GoalStatus = goal.status ?? "active";
  const cardVariant: CardVariant = goal.card_variant ?? "card";

  await db.runAsync(
    `INSERT INTO goals (
      id,
      title,
      target_amount_cents,
      current_amount_cents,
      target_date,
      status,
      priority_label,
      category_tag,
      icon_name,
      icon_family,
      card_variant,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      goal.title.trim(),
      targetAmountCents,
      currentAmountCents,
      goal.target_date ?? null,
      status,
      goal.priority_label ?? null,
      goal.category_tag ?? null,
      goal.icon_name ?? null,
      goal.icon_family ?? null,
      cardVariant,
      now,
      now,
    ]
  );

  const createdGoal = await getGoalById(id);
  if (!createdGoal) {
    throw new Error(`Failed to retrieve newly created goal with id: ${id}`);
  }
  return createdGoal;
}

/**
 * Update metadata and fields for a goal.
 */
export async function updateGoal(
  id: string,
  fields: UpdateGoalInput
): Promise<GoalRow | null> {
  const db = await getDatabase();
  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];

  if (fields.title !== undefined) {
    setClauses.push("title = ?");
    values.push(fields.title.trim());
  }
  if (fields.target_amount_cents !== undefined) {
    setClauses.push("target_amount_cents = ?");
    values.push(Math.round(fields.target_amount_cents));
  }
  if (fields.current_amount_cents !== undefined) {
    setClauses.push("current_amount_cents = ?");
    values.push(Math.round(fields.current_amount_cents));
  }
  if (fields.target_date !== undefined) {
    setClauses.push("target_date = ?");
    values.push(fields.target_date);
  }
  if (fields.status !== undefined) {
    setClauses.push("status = ?");
    values.push(fields.status);
  }
  if (fields.priority_label !== undefined) {
    setClauses.push("priority_label = ?");
    values.push(fields.priority_label);
  }
  if (fields.category_tag !== undefined) {
    setClauses.push("category_tag = ?");
    values.push(fields.category_tag);
  }
  if (fields.icon_name !== undefined) {
    setClauses.push("icon_name = ?");
    values.push(fields.icon_name);
  }
  if (fields.icon_family !== undefined) {
    setClauses.push("icon_family = ?");
    values.push(fields.icon_family);
  }
  if (fields.card_variant !== undefined) {
    setClauses.push("card_variant = ?");
    values.push(fields.card_variant);
  }

  if (setClauses.length === 0) {
    return getGoalById(id);
  }

  const now = new Date().toISOString();
  setClauses.push("updated_at = ?");
  values.push(now);

  values.push(id);

  await db.runAsync(
    `UPDATE goals SET ${setClauses.join(", ")} WHERE id = ?;`,
    values
  );

  return getGoalById(id);
}

/**
 * Apply atomic delta to a goal balance and record an audit row in goal_contributions.
 * Ensures strict integer cents precision and ACID compliance via platform-aware exclusive transactions.
 */
export async function applyGoalDelta(
  goalId: string,
  deltaCents: number,
  transactionId?: string,
  note?: string
): Promise<GoalRow> {
  const db = await getDatabase();
  const roundedDeltaCents = Math.round(deltaCents);
  const contributionId = Crypto.randomUUID();
  const now = new Date().toISOString();

  await runInExclusiveTransaction(db, async (txn) => {
    // 1. Atomic SQL update to goal balance
    const result = await txn.runAsync(
      `UPDATE goals
       SET current_amount_cents = current_amount_cents + ?,
           updated_at = ?
       WHERE id = ?;`,
      [roundedDeltaCents, now, goalId]
    );

    if (result.changes === 0) {
      throw new Error(`Goal with ID ${goalId} not found.`);
    }

    // 2. Record contribution row
    await txn.runAsync(
      `INSERT INTO goal_contributions (
        id,
        goal_id,
        transaction_id,
        amount_cents,
        note,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?);`,
      [
        contributionId,
        goalId,
        transactionId ?? null,
        roundedDeltaCents,
        note ?? null,
        now,
      ]
    );
  });

  const updatedGoal = await getGoalById(goalId);
  if (!updatedGoal) {
    throw new Error(`Failed to fetch updated goal with ID: ${goalId}`);
  }
  return updatedGoal;
}
