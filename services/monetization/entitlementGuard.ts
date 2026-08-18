import { getDatabase } from "../db/database";
import { getUserEntitlements } from "../../repositories/entitlementRepo";

export interface GoalLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  isSupporter: boolean;
}

/**
 * Checks if the user is allowed to create a new active goal based on current entitlements.
 * Evaluates active goal count in SQLite against unlocked goal slots and supporter status.
 */
export async function canCreateNewGoal(): Promise<GoalLimitCheckResult> {
  const db = await getDatabase();

  // 1. Fetch active goals count
  const countRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM goals WHERE status = 'active';`
  );
  const currentCount = countRow?.count ?? 0;

  // 2. Fetch user entitlements
  const entitlements = await getUserEntitlements();
  const isSupporter = entitlements.is_supporter === 1;
  const maxLimit = entitlements.unlocked_goal_slots;

  // 3. Determine if user is permitted to create another goal
  // Supporters have unlimited goal slots (or maxLimit >= 999)
  const allowed = isSupporter || currentCount < maxLimit;

  return {
    allowed,
    currentCount,
    maxLimit,
    isSupporter,
  };
}
