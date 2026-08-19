import * as Crypto from "expo-crypto";
import { getDatabase, runInExclusiveTransaction } from "../services/db/database";
import {
  TransactionRow,
  TransactionType,
  CategoryRow,
  RecurringScheduleRow,
} from "../services/db/types";
import { CreateRecurringScheduleInput } from "./recurringRepo";

export interface InsertTransactionInput {
  id?: string;
  category_id: string;
  type: TransactionType;
  amount_cents: number;
  note?: string | null;
  transaction_date?: string;
  idempotency_key: string;
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
 * Insert a transaction and optional goal contribution and recurring schedule in an atomic batch (ACID).
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
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        txId,
        tx.category_id,
        tx.type,
        roundedAmountCents,
        tx.note ?? null,
        txDate,
        tx.idempotency_key ?? null,
        now,
      ]
    );

    // 2. If goal allocation specified, update goal balance and insert contribution
    if (goalAllocation && goalAllocation.amount_cents > 0) {
      const roundedGoalCents = Math.round(goalAllocation.amount_cents);
      const contributionId = goalAllocation.idempotency_key;

      const updateResult = await txn.runAsync(
        `UPDATE goals
         SET current_amount_cents = current_amount_cents + ?,
             updated_at = ?
         WHERE id = ?;`,
        [roundedGoalCents, now, goalAllocation.goal_id]
      );

      if (updateResult.changes === 0) {
        throw new Error(
          `Goal allocation failed: Goal with ID ${goalAllocation.goal_id} not found.`
        );
      }

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
      const nextOccurrence =
        recurringSchedule.next_occurrence ?? recurringSchedule.start_date;
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
          recurringSchedule.start_date,
          nextOccurrence,
          isActive,
          now,
        ]
      );
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
 * Query transactions with pagination, search, category, and type filters.
 * Returns joined category information for smooth UI rendering.
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
      t.created_at,
      c.name AS category_name,
      c.icon_name AS category_icon_name,
      c.icon_family AS category_icon_family,
      c.color_code AS category_color_code
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
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
