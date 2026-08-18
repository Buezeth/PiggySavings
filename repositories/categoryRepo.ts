import { getDatabase } from "../services/db/database";
import { CategoryRow } from "../services/db/types";

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
