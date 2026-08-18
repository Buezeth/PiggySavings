import * as Crypto from "expo-crypto";
import { getDatabase, runInExclusiveTransaction } from "../db/database";
import {
  DEFAULT_ENTITLEMENTS_ID,
  getUserEntitlements,
} from "../../repositories/entitlementRepo";
import { CreateGoalInput, getGoalById } from "../../repositories/goalRepo";
import {
  CardVariant,
  GoalRow,
  GoalStatus,
  UserEntitlementRow,
} from "../db/types";

export class GoalLimitReachedError extends Error {
  constructor(
    message = "Active goal limit reached. Unlock additional slots or become a supporter."
  ) {
    super(message);
    this.name = "GoalLimitReachedError";
  }
}

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
  const isUnlimited = maxLimit >= 999;

  // 3. Determine if user is permitted to create another goal
  // Honors finite purchased limits (e.g. coffee tier's 5 slots)
  // and requires explicit unlimited entitlement (maxLimit >= 999) for unrestricted access
  const allowed = isUnlimited || currentCount < maxLimit;

  return {
    allowed,
    currentCount,
    maxLimit,
    isSupporter,
  };
}

/**
 * Creates a goal inside an exclusive atomic transaction guarded by entitlement checks.
 * Performs active-goal count, entitlement evaluation, and goal insertion within one exclusive transaction.
 */
export async function createGuardedGoal(
  goal: CreateGoalInput
): Promise<GoalRow> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const currentAmountCents = Math.round(goal.current_amount_cents ?? 0);
  const targetAmountCents = Math.round(goal.target_amount_cents);
  const status: GoalStatus = goal.status ?? "active";
  const cardVariant: CardVariant = goal.card_variant ?? "card";

  await runInExclusiveTransaction(db, async (txn) => {
    // 1. If creating an active goal, verify active goal count against entitlements
    if (status === "active") {
      const countRow = await txn.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM goals WHERE status = 'active';`
      );
      const activeCount = countRow?.count ?? 0;

      let entitlementRow = await txn.getFirstAsync<UserEntitlementRow>(
        `SELECT * FROM user_entitlements WHERE id = ?;`,
        [DEFAULT_ENTITLEMENTS_ID]
      );

      if (!entitlementRow) {
        await txn.runAsync(
          `INSERT OR IGNORE INTO user_entitlements (id, unlocked_goal_slots, is_supporter, ads_watched_count)
           VALUES (?, 3, 0, 0);`,
          [DEFAULT_ENTITLEMENTS_ID]
        );
        entitlementRow = await txn.getFirstAsync<UserEntitlementRow>(
          `SELECT * FROM user_entitlements WHERE id = ?;`,
          [DEFAULT_ENTITLEMENTS_ID]
        );
      }

      const maxLimit = entitlementRow?.unlocked_goal_slots ?? 3;
      const isUnlimited = maxLimit >= 999;

      if (!isUnlimited && activeCount >= maxLimit) {
        throw new GoalLimitReachedError(
          `Goal limit reached (${activeCount}/${maxLimit}). Unlock more slots or become a supporter.`
        );
      }
    }

    // 2. Insert goal within the same exclusive transaction
    await txn.runAsync(
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
  });

  const createdGoal = await getGoalById(id);
  if (!createdGoal) {
    throw new Error(`Failed to retrieve newly created goal with id: ${id}`);
  }
  return createdGoal;
}

export const createGoal = createGuardedGoal;

