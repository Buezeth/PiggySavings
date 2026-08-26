import * as Crypto from "expo-crypto";
import { getDatabase, runInExclusiveTransaction } from "../services/db/database";
import { CategoryRow } from "../services/db/types";

export interface CreateCategoryInput {
  name: string;
  type: "income" | "expense";
  icon_name?: string | null;
  icon_family?: string | null;
  color_code?: string | null;
  monthly_budget_cents?: number | null;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: "income" | "expense";
  icon_name?: string | null;
  icon_family?: string | null;
  color_code?: string | null;
  monthly_budget_cents?: number | null;
}

export interface CategoryUsageCount {
  transactionCount: number;
  scheduleCount: number;
  allocationCount: number;
}

export interface CategoryBudgetSummary {
  categoryId: string;
  categoryName: string;
  type: "income" | "expense";
  iconName?: string | null;
  iconFamily?: string | null;
  colorCode?: string | null;
  budgetCents: number;
  spentCents: number;
  remainingCents: number;
  percentageUsed: number;
  isOverBudget: boolean;
}

export interface DeleteCategoryResult {
  success: boolean;
  reassignedCount: number;
}

/**
 * Fetch all categories ordered by default first, then alphabetically by name.
 */
export async function getAllCategories(): Promise<CategoryRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    `SELECT * FROM categories ORDER BY is_default DESC, name ASC;`
  );
  return rows;
}

/**
 * Fetch categories filtered by type ('income' | 'expense').
 */
export async function getCategoriesByType(
  type: "income" | "expense"
): Promise<CategoryRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    `SELECT * FROM categories WHERE type = ? ORDER BY is_default DESC, name ASC;`,
    [type]
  );
  return rows;
}

/**
 * Fetch a single category by ID.
 */
export async function getCategoryById(id: string): Promise<CategoryRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CategoryRow>(
    `SELECT * FROM categories WHERE id = ?;`,
    [id]
  );
  return row ?? null;
}

/**
 * Creates a custom category (is_default = 0, generates UUID v4 ID).
 */
export async function createCustomCategory(
  input: CreateCategoryInput
): Promise<CategoryRow> {
  const db = await getDatabase();
  const id = `cat_${Crypto.randomUUID()}`;
  const name = input.name.trim();

  if (!name) {
    throw new Error("Category name cannot be empty.");
  }

  const budgetCents =
    input.monthly_budget_cents !== undefined && input.monthly_budget_cents !== null
      ? Math.max(0, Math.round(input.monthly_budget_cents))
      : null;

  try {
    await db.runAsync(
      `INSERT INTO categories (id, name, type, icon_name, icon_family, color_code, monthly_budget_cents, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
      [
        id,
        name,
        input.type,
        input.icon_name ?? null,
        input.icon_family ?? null,
        input.color_code ?? null,
        budgetCents,
      ]
    );
  } catch (err: any) {
    if (err?.message?.includes("UNIQUE constraint failed") || err?.message?.includes("idx_categories_name_type")) {
      throw new Error(`A ${input.type} category named "${name}" already exists.`);
    }
    throw err;
  }

  const created = await getCategoryById(id);
  if (!created) {
    throw new Error(`Failed to create category with ID: ${id}`);
  }
  return created;
}

/**
 * Updates a category's fields. Rejects modification of system defaults (is_default = 1).
 */
export async function updateCategory(
  id: string,
  fields: UpdateCategoryInput
): Promise<CategoryRow | null> {
  const db = await getDatabase();
  const existing = await getCategoryById(id);

  if (!existing) {
    throw new Error(`Category with ID "${id}" does not exist.`);
  }

  if (existing.is_default === 1 && fields.type !== undefined && fields.type !== existing.type) {
    throw new Error("System default category type cannot be modified.");
  }

  if (existing.is_default === 1) {
    if (fields.name !== undefined && fields.name.trim() !== existing.name) {
      throw new Error("System default category names cannot be modified.");
    }
    if (fields.type !== undefined && fields.type !== existing.type) {
      throw new Error("System default category types cannot be modified.");
    }
    if (fields.icon_name !== undefined && fields.icon_name !== existing.icon_name) {
      throw new Error("System default category icons cannot be modified.");
    }
    if (fields.color_code !== undefined && fields.color_code !== existing.color_code) {
      throw new Error("System default category color themes cannot be modified.");
    }
    if (existing.type === "income" && fields.monthly_budget_cents !== undefined && fields.monthly_budget_cents !== null) {
      throw new Error("Income categories cannot have budget limits.");
    }
  }

  if (fields.type !== undefined && fields.type !== existing.type) {
    const counts = await getCategoryUsageCount(id);
    const totalRefs = counts.transactionCount + counts.scheduleCount + counts.allocationCount;
    if (totalRefs > 0) {
      throw new Error(
        `Cannot change category type for "${existing.name}". It is referenced by ${counts.transactionCount} transaction(s), ${counts.scheduleCount} recurring schedule(s), and ${counts.allocationCount} allocation rule(s).`
      );
    }
  }

  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];

  if (fields.name !== undefined) {
    const trimmed = fields.name.trim();
    if (!trimmed) {
      throw new Error("Category name cannot be empty.");
    }
    setClauses.push("name = ?");
    values.push(trimmed);
  }
  if (fields.type !== undefined) {
    setClauses.push("type = ?");
    values.push(fields.type);
  }
  if (fields.icon_name !== undefined) {
    setClauses.push("icon_name = ?");
    values.push(fields.icon_name);
  }
  if (fields.icon_family !== undefined) {
    setClauses.push("icon_family = ?");
    values.push(fields.icon_family);
  }
  if (fields.color_code !== undefined) {
    setClauses.push("color_code = ?");
    values.push(fields.color_code);
  }
  if (fields.monthly_budget_cents !== undefined) {
    setClauses.push("monthly_budget_cents = ?");
    values.push(
      fields.monthly_budget_cents !== null
        ? Math.max(0, Math.round(fields.monthly_budget_cents))
        : null
    );
  }

  if (setClauses.length === 0) {
    return existing;
  }

  values.push(id);

  try {
    await db.runAsync(
      `UPDATE categories SET ${setClauses.join(", ")} WHERE id = ?;`,
      values
    );
  } catch (err: any) {
    if (err?.message?.includes("UNIQUE constraint failed") || err?.message?.includes("idx_categories_name_type")) {
      const targetName = fields.name !== undefined ? fields.name.trim() : existing.name;
      const targetType = fields.type !== undefined ? fields.type : existing.type;
      throw new Error(`A ${targetType} category named "${targetName}" already exists.`);
    }
    throw err;
  }

  return getCategoryById(id);
}

/**
 * Computes monthly envelope budget progress and pacing summaries for expense categories.
 * Evaluates spending for the given yearMonth ('YYYY-MM', defaults to current local calendar month).
 */
export async function getCategoryBudgetSummaries(
  yearMonth?: string
): Promise<CategoryBudgetSummary[]> {
  const db = await getDatabase();
  const currentYM =
    yearMonth ??
    (() => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    })();

  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    type: "income" | "expense";
    icon_name: string | null;
    icon_family: string | null;
    color_code: string | null;
    monthly_budget_cents: number | null;
    spent_cents: number;
  }>(
    `SELECT 
       c.id, 
       c.name, 
       c.type, 
       c.icon_name, 
       c.icon_family, 
       c.color_code, 
       c.monthly_budget_cents, 
       COALESCE(SUM(t.amount_cents), 0) as spent_cents 
     FROM categories c 
     LEFT JOIN transactions t 
       ON c.id = t.category_id 
       AND t.type = 'expense' 
       AND strftime('%Y-%m', t.transaction_date) = ? 
     WHERE c.type = 'expense' 
     GROUP BY c.id 
     ORDER BY 
       CASE WHEN c.monthly_budget_cents IS NOT NULL AND c.monthly_budget_cents > 0 THEN 0 ELSE 1 END,
       c.monthly_budget_cents DESC, 
       c.name ASC;`,
    [currentYM]
  );

  return rows.map((r) => {
    const budgetCents = r.monthly_budget_cents ?? 0;
    const spentCents = r.spent_cents ?? 0;
    const remainingCents = budgetCents > 0 ? budgetCents - spentCents : 0;
    const percentageUsed = budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : 0;
    const isOverBudget = budgetCents > 0 && spentCents > budgetCents;

    return {
      categoryId: r.id,
      categoryName: r.name,
      type: r.type,
      iconName: r.icon_name,
      iconFamily: r.icon_family,
      colorCode: r.color_code,
      budgetCents,
      spentCents,
      remainingCents,
      percentageUsed,
      isOverBudget,
    };
  });
}

/**
 * High-performance batch aggregation of transaction, schedule, and allocation counts for all categories.
 */
export async function getAllCategoryUsageCounts(): Promise<
  Record<string, CategoryUsageCount>
> {
  const db = await getDatabase();
  const txRows = await db.getAllAsync<{ category_id: string; count: number }>(
    `SELECT category_id, COUNT(*) as count FROM transactions GROUP BY category_id;`
  );
  const schedRows = await db.getAllAsync<{ category_id: string; count: number }>(
    `SELECT category_id, COUNT(*) as count FROM recurring_schedules GROUP BY category_id;`
  );
  const allocRows = await db.getAllAsync<{ category_id: string; count: number }>(
    `SELECT category_id, COUNT(*) as count FROM allocation_rules WHERE category_id IS NOT NULL GROUP BY category_id;`
  );

  const result: Record<string, CategoryUsageCount> = {};
  for (const row of txRows) {
    if (!result[row.category_id]) {
      result[row.category_id] = { transactionCount: 0, scheduleCount: 0, allocationCount: 0 };
    }
    result[row.category_id].transactionCount = row.count;
  }
  for (const row of schedRows) {
    if (!result[row.category_id]) {
      result[row.category_id] = { transactionCount: 0, scheduleCount: 0, allocationCount: 0 };
    }
    result[row.category_id].scheduleCount = row.count;
  }
  for (const row of allocRows) {
    if (!result[row.category_id]) {
      result[row.category_id] = { transactionCount: 0, scheduleCount: 0, allocationCount: 0 };
    }
    result[row.category_id].allocationCount = row.count;
  }
  return result;
}

/**
 * Returns the count of transactions, recurring schedules, and allocation rules referencing a single category.
 */
export async function getCategoryUsageCount(
  id: string
): Promise<CategoryUsageCount> {
  const db = await getDatabase();

  const txRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE category_id = ?;`,
    [id]
  );
  const schedRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM recurring_schedules WHERE category_id = ?;`,
    [id]
  );
  const allocRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM allocation_rules WHERE category_id = ?;`,
    [id]
  );

  return {
    transactionCount: txRow?.count ?? 0,
    scheduleCount: schedRow?.count ?? 0,
    allocationCount: allocRow?.count ?? 0,
  };
}

/**
 * Deletes a category with foreign key safeguards and atomic record migration.
 */
export async function deleteCategory(
  id: string,
  reassignToCategoryId?: string
): Promise<DeleteCategoryResult> {
  const db = await getDatabase();

  return await runInExclusiveTransaction(db, async (txn) => {
    const existing = await txn.getFirstAsync<CategoryRow>(
      `SELECT * FROM categories WHERE id = ?;`,
      [id]
    );

    if (!existing) {
      throw new Error(`Category with ID "${id}" does not exist.`);
    }

    if (existing.is_default === 1) {
      throw new Error("System default categories cannot be deleted.");
    }

    if (reassignToCategoryId) {
      if (reassignToCategoryId === id) {
        throw new Error("Cannot reassign category to itself.");
      }
      const targetCategory = await txn.getFirstAsync<CategoryRow>(
        `SELECT * FROM categories WHERE id = ?;`,
        [reassignToCategoryId]
      );
      if (!targetCategory) {
        throw new Error(
          `Target category for reassignment "${reassignToCategoryId}" does not exist.`
        );
      }
    }

    let reassignedCount = 0;

    if (reassignToCategoryId) {
      const txResult = await txn.runAsync(
        `UPDATE transactions SET category_id = ? WHERE category_id = ?;`,
        [reassignToCategoryId, id]
      );
      const schedResult = await txn.runAsync(
        `UPDATE recurring_schedules SET category_id = ? WHERE category_id = ?;`,
        [reassignToCategoryId, id]
      );
      const allocResult = await txn.runAsync(
        `UPDATE allocation_rules SET category_id = ? WHERE category_id = ?;`,
        [reassignToCategoryId, id]
      );

      reassignedCount =
        (txResult.changes ?? 0) +
        (schedResult.changes ?? 0) +
        (allocResult.changes ?? 0);
    } else {
      const txCountRow = await txn.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM transactions WHERE category_id = ?;`,
        [id]
      );
      const schedCountRow = await txn.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM recurring_schedules WHERE category_id = ?;`,
        [id]
      );
      const allocCountRow = await txn.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM allocation_rules WHERE category_id = ?;`,
        [id]
      );

      const totalReferences =
        (txCountRow?.count ?? 0) + (schedCountRow?.count ?? 0) + (allocCountRow?.count ?? 0);
      if (totalReferences > 0) {
        throw new Error(
          `Cannot delete category "${existing.name}". It is referenced by ${txCountRow?.count ?? 0} transaction(s), ${schedCountRow?.count ?? 0} recurring schedule(s), and ${allocCountRow?.count ?? 0} allocation rule(s). Please specify a category to reassign these records to.`
        );
      }
    }

    const deleteResult = await txn.runAsync(
      `DELETE FROM categories WHERE id = ?;`,
      [id]
    );

    if (deleteResult.changes === 0) {
      throw new Error(`Failed to delete category "${id}".`);
    }

    return {
      success: true,
      reassignedCount,
    };
  });
}