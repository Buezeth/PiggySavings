import * as Crypto from "expo-crypto";
import { getDatabase, runInExclusiveTransaction } from "../services/db/database";
import {
  TransactionRow,
  TransactionType,
  CategoryRow,
} from "../services/db/types";

export interface InsertTransactionInput {
  id?: string;
  category_id: string;
  type: TransactionType;
  amount_cents: number;
  note?: string | null;
  transaction_date?: string;
  idempotency_key?: string | null;
}

export interface GoalAllocationInput {
  goal_id: string;
  amount_cents: number;
  note?: string | null;
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
 * Insert a transaction and optional goal contribution in an atomic batch (ACID).
 */
export async function insertTransaction(
  tx: InsertTransactionInput,
  goalAllocation?: GoalAllocationInput
): Promise<TransactionRow> {
  const db = await getDatabase();
  const txId = tx.id ?? Crypto.randomUUID();
  const now = new Date().toISOString();
  const txDate = tx.transaction_date ?? now;
  const roundedAmountCents = Math.round(tx.amount_cents);

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
      const contributionId = Crypto.randomUUID();

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
  });

  const inserted = await getTransactionById(txId);
  if (!inserted) {
    throw new Error(`Failed to retrieve inserted transaction with ID: ${txId}`);
  }
  return inserted;
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
