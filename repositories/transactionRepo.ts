import * as Crypto from "expo-crypto";
import { getDatabase, runInExclusiveTransaction } from "../services/db/database";
import {
  TransactionRow,
  TransactionType,
  CategoryRow,
  RecurringScheduleRow,
  GoalRow,
  GoalStatus,
  UpdateTransactionInput,
} from "../services/db/types";
import { CreateRecurringScheduleInput } from "./recurringRepo";
import { calculateNextOccurrence, getLocalTodayStr } from "../services/recurring/recurringEngine";

export interface InsertTransactionInput {
  id?: string;
  category_id: string;
  type: TransactionType;
  amount_cents: number;
  note?: string | null;
  transaction_date?: string;
  idempotency_key: string;
  source_goal_id?: string | null;
  is_refund?: number;
}

export interface GoalAllocationInput {
  goal_id: string;
  amount_cents: number;
  note?: string | null;
  idempotency_key: string;
}

export interface TransactionFilterOptions {
  limit?: number;
  offset?: number;
  type?: "all" | "income" | "expense" | "transfer";
  searchQuery?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export interface EnrichedTransactionRow extends TransactionRow {
  category_name?: string;
  category_icon_name?: string | null;
  category_icon_family?: string | null;
  category_color_code?: string | null;
  source_goal_title?: string | null;
  allocated_goal_id?: string | null;
  allocated_goal_title?: string | null;
  allocated_goal_amount_cents?: number | null;
}

export interface CashflowSummary {
  totalIncomeCents: number;
  totalExpenseCents: number;
  netSavingsCents: number;
}

/**
 * Fetch a single transaction by ID.
 */
export async function getTransactionById(
  id: string
): Promise<TransactionRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TransactionRow>(
    `SELECT * FROM transactions WHERE id = ?;`,
    [id]
  );
  return row ?? null;
}

/**
 * Insert a transaction and optional goal contribution, goal source deduction, and recurring schedule in an atomic batch (ACID).
 */
export async function insertTransaction(
  tx: InsertTransactionInput,
  goalAllocation?: GoalAllocationInput,
  recurringSchedule?: CreateRecurringScheduleInput
): Promise<{ transaction: TransactionRow; recurringSchedule?: RecurringScheduleRow }> {
  const db = await getDatabase();
  const txId = tx.id ?? Crypto.randomUUID();
  const now = new Date().toISOString();
  const txDate = tx.transaction_date ?? now;
  const roundedAmountCents = Math.round(tx.amount_cents);
  const scheduleId = recurringSchedule ? Crypto.randomUUID() : undefined;

  await runInExclusiveTransaction(db, async (txn) => {
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
        source_goal_id,
        is_refund,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        txId,
        tx.category_id,
        tx.type,
        roundedAmountCents,
        tx.note ?? null,
        txDate,
        tx.idempotency_key ?? null,
        tx.source_goal_id ?? null,
        tx.is_refund ?? 0,
        now,
      ]
    );

    // 1b. If expense was funded by a goal, deduct from source goal and reconcile status
    if (tx.source_goal_id && tx.type === "expense") {
      const sourceGoal = await txn.getFirstAsync<GoalRow>(
        `SELECT * FROM goals WHERE id = ?;`,
        [tx.source_goal_id]
      );
      if (sourceGoal) {
        const maxDeductibleCents = Math.floor(sourceGoal.current_amount_cents * 0.8);
        if (roundedAmountCents > maxDeductibleCents) {
          throw new Error(
            "Cannot deduct more than 80% of goal funds. At least 20% must remain reserved to protect your savings momentum."
          );
        }
        const newBal = Math.max(0, sourceGoal.current_amount_cents - roundedAmountCents);
        const newStatus: GoalStatus = newBal >= sourceGoal.target_amount_cents ? "completed" : "active";
        await txn.runAsync(
          `UPDATE goals SET current_amount_cents = ?, status = ?, updated_at = ? WHERE id = ?;`,
          [newBal, newStatus, now, tx.source_goal_id]
        );

        const deductionContributionId = Crypto.randomUUID();
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
            deductionContributionId,
            tx.source_goal_id,
            txId,
            -roundedAmountCents,
            tx.note ?? "Goal-funded expense withdrawal",
            now,
          ]
        );
      }
    }

    // 2. If goal allocation specified, update goal balance and insert contribution
    if (goalAllocation && goalAllocation.amount_cents > 0) {
      const roundedGoalCents = Math.round(goalAllocation.amount_cents);
      const contributionId = goalAllocation.idempotency_key;

      const targetGoal = await txn.getFirstAsync<GoalRow>(
        `SELECT * FROM goals WHERE id = ?;`,
        [goalAllocation.goal_id]
      );

      if (!targetGoal) {
        throw new Error(
          `Goal allocation failed: Goal with ID ${goalAllocation.goal_id} not found.`
        );
      }

      const newBal = targetGoal.current_amount_cents + roundedGoalCents;
      const newStatus: GoalStatus = newBal >= targetGoal.target_amount_cents ? "completed" : "active";

      await txn.runAsync(
        `UPDATE goals
         SET current_amount_cents = ?,
             status = ?,
             updated_at = ?
         WHERE id = ?;`,
        [newBal, newStatus, now, goalAllocation.goal_id]
      );

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
          goalAllocation.goal_id,
          txId,
          roundedGoalCents,
          goalAllocation.note ?? tx.note ?? "Auto-allocated from transaction",
          now,
        ]
      );
    }
    // 3. If recurring schedule specified, insert recurring schedule atomically
    if (recurringSchedule && scheduleId) {
      const dateOnly = (recurringSchedule.start_date || txDate || getLocalTodayStr()).split("T")[0];

      // Validate start_date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateOnly) || isNaN(new Date(`${dateOnly}T12:00:00Z`).getTime())) {
        throw new Error(`Invalid recurring schedule start date: "${recurringSchedule.start_date}". Expected YYYY-MM-DD.`);
      }

      // Advance to the NEXT occurrence since today's transaction is already being recorded now
      const rawNextOccurrence =
        recurringSchedule.next_occurrence ??
        calculateNextOccurrence(
          dateOnly,
          recurringSchedule.frequency,
          recurringSchedule.custom_interval_days,
          recurringSchedule.day_of_month,
          dateOnly
        );
      const nextOccurrence = rawNextOccurrence.split("T")[0];

      if (!dateRegex.test(nextOccurrence) || isNaN(new Date(`${nextOccurrence}T12:00:00Z`).getTime())) {
        throw new Error(`Invalid recurring schedule next occurrence date: "${rawNextOccurrence}". Expected YYYY-MM-DD.`);
      }

      const isActive = recurringSchedule.is_active ?? 1;
      const roundedScheduleCents = Math.round(recurringSchedule.amount_cents);

      await txn.runAsync(
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
          scheduleId,
          recurringSchedule.category_id,
          recurringSchedule.title.trim(),
          recurringSchedule.type,
          roundedScheduleCents,
          recurringSchedule.frequency,
          recurringSchedule.custom_interval_days ?? null,
          recurringSchedule.day_of_month ?? null,
          dateOnly,
          nextOccurrence,
          isActive,
          now,
        ]
      );

      // Link auto-allocation rule if goal was selected for recurring income
      if (goalAllocation && goalAllocation.goal_id && recurringSchedule.type === "income") {
        const ruleId = Crypto.randomUUID();
        await txn.runAsync(
          `INSERT INTO allocation_rules (
            id, goal_id, category_id, schedule_id, rule_type, value, min_income_cents, is_active
          ) VALUES (?, ?, ?, ?, 'fixed_cents', ?, 0, ?);`,
          [
            ruleId,
            goalAllocation.goal_id,
            recurringSchedule.category_id,
            scheduleId,
            Math.round(goalAllocation.amount_cents),
            isActive,
          ]
        );
      }
    }
  });

  const inserted = await getTransactionById(txId);
  if (!inserted) {
    throw new Error(`Failed to retrieve inserted transaction with ID: ${txId}`);
  }

  let insertedSchedule: RecurringScheduleRow | undefined;
  if (scheduleId) {
    const row = await db.getFirstAsync<RecurringScheduleRow>(
      `SELECT * FROM recurring_schedules WHERE id = ?;`,
      [scheduleId]
    );
    insertedSchedule = row ?? undefined;
  }

  return { transaction: inserted, recurringSchedule: insertedSchedule };
}

/**
 * Delete a transaction with atomic balance rollbacks:
 * a) If transaction had incoming goal contributions, roll back and subtract from the goal's balance.
 * b) If transaction was an expense funded by a goal (source_goal_id), restore the funds back to the goal.
 * c) Delete the transaction record.
 */
export async function deleteTransaction(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  return await runInExclusiveTransaction(db, async (txn) => {
    const tx = await txn.getFirstAsync<TransactionRow>(
      `SELECT * FROM transactions WHERE id = ?;`,
      [id]
    );

    if (!tx) {
      return false;
    }

    // a) Reconcile goal contributions (income allocations to goals)
    const contributions = await txn.getAllAsync<{ id: string; goal_id: string; amount_cents: number }>(
      `SELECT id, goal_id, amount_cents FROM goal_contributions WHERE transaction_id = ?;`,
      [id]
    );

    for (const contrib of contributions) {
      const goal = await txn.getFirstAsync<GoalRow>(
        `SELECT * FROM goals WHERE id = ?;`,
        [contrib.goal_id]
      );
      if (goal) {
        const newBal = Math.max(0, goal.current_amount_cents - contrib.amount_cents);
        const newStatus: GoalStatus = newBal >= goal.target_amount_cents ? "completed" : "active";
        await txn.runAsync(
          `UPDATE goals SET current_amount_cents = ?, status = ?, updated_at = ? WHERE id = ?;`,
          [newBal, newStatus, now, contrib.goal_id]
        );
      }
    }

    if (contributions.length > 0) {
      await txn.runAsync(
        `DELETE FROM goal_contributions WHERE transaction_id = ?;`,
        [id]
      );
    }

    // b) Fallback: If transaction was an expense funded by a goal (source_goal_id) without an audit contribution row
    if (tx.source_goal_id && contributions.length === 0) {
      const goal = await txn.getFirstAsync<GoalRow>(
        `SELECT * FROM goals WHERE id = ?;`,
        [tx.source_goal_id]
      );
      if (goal) {
        const newBal = goal.current_amount_cents + tx.amount_cents;
        const newStatus: GoalStatus = newBal >= goal.target_amount_cents ? "completed" : "active";
        await txn.runAsync(
          `UPDATE goals SET current_amount_cents = ?, status = ?, updated_at = ? WHERE id = ?;`,
          [newBal, newStatus, now, tx.source_goal_id]
        );
      }
    }

    // c) Delete the transaction record
    const result = await txn.runAsync(
      `DELETE FROM transactions WHERE id = ?;`,
      [id]
    );

    return (result.changes ?? 0) > 0;
  });
}

/**
 * Update transaction metadata and reconcile goal balances atomically.
 */
export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput
): Promise<TransactionRow | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  return await runInExclusiveTransaction(db, async (txn) => {
    const existing = await txn.getFirstAsync<TransactionRow>(
      `SELECT * FROM transactions WHERE id = ?;`,
      [id]
    );

    if (!existing) {
      return null;
    }

    const newAmountCents =
      input.amount_cents !== undefined
        ? Math.round(input.amount_cents)
        : existing.amount_cents;
    const newSourceGoalId =
      input.source_goal_id !== undefined
        ? input.source_goal_id
        : existing.source_goal_id;

    // 1. Reconcile source_goal_id changes (expense funded by goal)
    if (existing.source_goal_id !== newSourceGoalId || existing.amount_cents !== newAmountCents) {
      // If previous transaction had a source goal, restore previous amount
      if (existing.source_goal_id) {
        const oldGoal = await txn.getFirstAsync<GoalRow>(
          `SELECT * FROM goals WHERE id = ?;`,
          [existing.source_goal_id]
        );
        if (oldGoal) {
          const restoredBal = oldGoal.current_amount_cents + existing.amount_cents;
          const restoredStatus: GoalStatus = restoredBal >= oldGoal.target_amount_cents ? "completed" : "active";
          await txn.runAsync(
            `UPDATE goals SET current_amount_cents = ?, status = ?, updated_at = ? WHERE id = ?;`,
            [restoredBal, restoredStatus, now, existing.source_goal_id]
          );
        }
      }

      // If new source goal is specified, deduct new amount
      if (newSourceGoalId) {
        const newGoal = await txn.getFirstAsync<GoalRow>(
          `SELECT * FROM goals WHERE id = ?;`,
          [newSourceGoalId]
        );
        if (newGoal) {
          const deductedBal = Math.max(0, newGoal.current_amount_cents - newAmountCents);
          const deductedStatus: GoalStatus = deductedBal >= newGoal.target_amount_cents ? "completed" : "active";
          await txn.runAsync(
            `UPDATE goals SET current_amount_cents = ?, status = ?, updated_at = ? WHERE id = ?;`,
            [deductedBal, deductedStatus, now, newSourceGoalId]
          );
        }
      }
    }

    // 2. Reconcile goal_contributions (income allocated to goal)
    if (existing.amount_cents !== newAmountCents) {
      const contributions = await txn.getAllAsync<{ id: string; goal_id: string; amount_cents: number }>(
        `SELECT id, goal_id, amount_cents FROM goal_contributions WHERE transaction_id = ?;`,
        [id]
      );

      const diff = newAmountCents - existing.amount_cents;
      for (const contrib of contributions) {
        const goal = await txn.getFirstAsync<GoalRow>(
          `SELECT * FROM goals WHERE id = ?;`,
          [contrib.goal_id]
        );
        if (goal) {
          const updatedContrib = Math.max(0, contrib.amount_cents + diff);
          const newBal = Math.max(0, goal.current_amount_cents + diff);
          const newStatus: GoalStatus = newBal >= goal.target_amount_cents ? "completed" : "active";
          await txn.runAsync(
            `UPDATE goals SET current_amount_cents = ?, status = ?, updated_at = ? WHERE id = ?;`,
            [newBal, newStatus, now, contrib.goal_id]
          );
          await txn.runAsync(
            `UPDATE goal_contributions SET amount_cents = ? WHERE id = ?;`,
            [updatedContrib, contrib.id]
          );
        }
      }
    }

    // 3. Update transactions table
    const setClauses: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.category_id !== undefined) {
      setClauses.push("category_id = ?");
      params.push(input.category_id);
    }
    if (input.amount_cents !== undefined) {
      setClauses.push("amount_cents = ?");
      params.push(newAmountCents);
    }
    if (input.note !== undefined) {
      setClauses.push("note = ?");
      params.push(input.note);
    }
    if (input.transaction_date !== undefined) {
      setClauses.push("transaction_date = ?");
      params.push(input.transaction_date);
    }
    if (input.source_goal_id !== undefined) {
      setClauses.push("source_goal_id = ?");
      params.push(input.source_goal_id);
    }

    if (setClauses.length > 0) {
      params.push(id);
      await txn.runAsync(
        `UPDATE transactions SET ${setClauses.join(", ")} WHERE id = ?;`,
        params
      );
    }

    const updated = await txn.getFirstAsync<TransactionRow>(
      `SELECT * FROM transactions WHERE id = ?;`,
      [id]
    );
    return updated ?? null;
  });
}

/**
 * Query transactions with pagination, search, category, and type filters.
 * Returns joined category and goal linkage information for smooth UI rendering.
 */
export async function getTransactions(
  options: TransactionFilterOptions = {}
): Promise<EnrichedTransactionRow[]> {
  const db = await getDatabase();
  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (options.type && options.type !== "all") {
    whereClauses.push("t.type = ?");
    params.push(options.type);
  }

  if (options.categoryId) {
    whereClauses.push("t.category_id = ?");
    params.push(options.categoryId);
  }

  if (options.searchQuery && options.searchQuery.trim().length > 0) {
    whereClauses.push("(t.note LIKE ? OR c.name LIKE ?)");
    const q = `%${options.searchQuery.trim()}%`;
    params.push(q, q);
  }

  if (options.startDate) {
    whereClauses.push("t.transaction_date >= ?");
    params.push(options.startDate);
  }

  if (options.endDate) {
    whereClauses.push("t.transaction_date <= ?");
    params.push(options.endDate);
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  let sql = `
    SELECT 
      t.id,
      t.category_id,
      t.type,
      t.amount_cents,
      t.note,
      t.transaction_date,
      t.idempotency_key,
      t.source_goal_id,
      t.is_refund,
      t.created_at,
      c.name AS category_name,
      c.icon_name AS category_icon_name,
      c.icon_family AS category_icon_family,
      c.color_code AS category_color_code,
      g_src.title AS source_goal_title,
      gc.goal_id AS allocated_goal_id,
      g_alloc.title AS allocated_goal_title,
      gc.amount_cents AS allocated_goal_amount_cents
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN goals g_src ON t.source_goal_id = g_src.id
    LEFT JOIN goal_contributions gc ON gc.transaction_id = t.id
    LEFT JOIN goals g_alloc ON gc.goal_id = g_alloc.id
    ${whereSql}
    ORDER BY t.transaction_date DESC, t.created_at DESC
  `;

  if (options.limit !== undefined) {
    sql += ` LIMIT ?`;
    params.push(options.limit);
    if (options.offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }
  }

  const rows = await db.getAllAsync<EnrichedTransactionRow>(sql, params);
  return rows;
}

/**
 * Returns total income cents, total expense cents, and net savings cents.
 */
export async function getCashflowSummary(): Promise<CashflowSummary> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ type: string; total_cents: number }>(`
    SELECT type, SUM(amount_cents) AS total_cents
    FROM transactions
    WHERE type IN ('income', 'expense')
    GROUP BY type;
  `);

  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  for (const row of rows) {
    if (row.type === "income") {
      totalIncomeCents = Number(row.total_cents) || 0;
    } else if (row.type === "expense") {
      totalExpenseCents = Number(row.total_cents) || 0;
    }
  }

  return {
    totalIncomeCents,
    totalExpenseCents,
    netSavingsCents: totalIncomeCents - totalExpenseCents,
  };
}
