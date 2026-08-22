import * as Crypto from "expo-crypto";
import { getDatabase, runInExclusiveTransaction } from "../services/db/database";
import { GoalRow, GoalStatus, CardVariant, GoalContributionRow } from "../services/db/types";

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
 * Ensures strict integer cents precision, status transitions, and ACID compliance via platform-aware exclusive transactions.
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
    // 1. Fetch current goal state
    const goal = await txn.getFirstAsync<GoalRow>(
      `SELECT * FROM goals WHERE id = ?;`,
      [goalId]
    );

    if (!goal) {
      throw new Error(`Goal with ID ${goalId} not found.`);
    }

    if (roundedDeltaCents < 0) {
      const maxDeductibleCents = Math.floor(goal.current_amount_cents * 0.8);
      if (Math.abs(roundedDeltaCents) > maxDeductibleCents) {
        throw new Error(
          "Cannot deduct more than 80% of goal funds. At least 20% must remain reserved to protect your savings momentum."
        );
      }
    }

    const newAmountCents = Math.max(0, goal.current_amount_cents + roundedDeltaCents);
    const newStatus: GoalStatus =
      newAmountCents >= goal.target_amount_cents ? "completed" : "active";

    // 2. Atomic SQL update to goal balance & status
    await txn.runAsync(
      `UPDATE goals
       SET current_amount_cents = ?,
           status = ?,
           updated_at = ?
       WHERE id = ?;`,
      [newAmountCents, newStatus, now, goalId]
    );

    // 3. Record contribution audit row
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

/**
 * Withdraws funds from a goal balance, ensuring balance reduction and status reversion if below target.
 */
export async function withdrawFromGoal(
  goalId: string,
  amountCents: number,
  transactionId?: string,
  note?: string
): Promise<GoalRow> {
  const roundedCents = Math.round(Math.abs(amountCents));
  return applyGoalDelta(
    goalId,
    -roundedCents,
    transactionId,
    note ?? "Goal withdrawal"
  );
}

/**
 * Fetch contribution / allocation history for a specific goal.
 */
export async function getGoalContributions(
  goalId: string,
  options?: { since?: string }
): Promise<GoalContributionRow[]> {
  const db = await getDatabase();
  const whereClauses = ["goal_id = ?"];
  const params: string[] = [goalId];

  if (options?.since) {
    whereClauses.push("created_at >= ?");
    params.push(options.since);
  }

  const rows = await db.getAllAsync<GoalContributionRow>(
    `SELECT * FROM goal_contributions WHERE ${whereClauses.join(" AND ")} ORDER BY created_at DESC;`,
    params
  );
  return rows;
}
