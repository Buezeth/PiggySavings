import { getDatabase, runInExclusiveTransaction } from "../services/db/database";
import { UserEntitlementRow } from "../services/db/types";

export const DEFAULT_ENTITLEMENTS_ID = "default_entitlements";

/**
 * Fetch current user entitlements (unlocked slots, supporter status, ads watched).
 */
export async function getUserEntitlements(): Promise<UserEntitlementRow> {
  const db = await getDatabase();
  let row = await db.getFirstAsync<UserEntitlementRow>(
    `SELECT * FROM user_entitlements WHERE id = ?;`,
    [DEFAULT_ENTITLEMENTS_ID]
  );

  if (!row) {
    await db.runAsync(
      `INSERT OR IGNORE INTO user_entitlements (id, unlocked_goal_slots, is_supporter, ads_watched_count)
       VALUES (?, 3, 0, 0);`,
      [DEFAULT_ENTITLEMENTS_ID]
    );
    row = await db.getFirstAsync<UserEntitlementRow>(
      `SELECT * FROM user_entitlements WHERE id = ?;`,
      [DEFAULT_ENTITLEMENTS_ID]
    );
  }

  return (
    row ?? {
      id: DEFAULT_ENTITLEMENTS_ID,
      unlocked_goal_slots: 3,
      is_supporter: 0,
      ads_watched_count: 0,
    }
  );
}

/**
 * Increments unlocked goal slots and records ad watch.
 * Ensures the default entitlement row exists and exactly one row is updated within the transaction.
 */
export async function unlockGoalSlot(): Promise<UserEntitlementRow> {
  const db = await getDatabase();

  await runInExclusiveTransaction(db, async (txn) => {
    // 1. Ensure default entitlement row exists before update
    await txn.runAsync(
      `INSERT OR IGNORE INTO user_entitlements (id, unlocked_goal_slots, is_supporter, ads_watched_count)
       VALUES (?, 3, 0, 0);`,
      [DEFAULT_ENTITLEMENTS_ID]
    );

    // 2. Perform atomic update
    const result = await txn.runAsync(
      `UPDATE user_entitlements
       SET unlocked_goal_slots = unlocked_goal_slots + 1,
           ads_watched_count = ads_watched_count + 1
       WHERE id = ?;`,
      [DEFAULT_ENTITLEMENTS_ID]
    );

    if (result.changes !== 1) {
      throw new Error(`Failed to unlock goal slot: expected 1 row affected, got ${result.changes}`);
    }
  });

  return getUserEntitlements();
}

/**
 * Sets supporter status (e.g. after in-app purchase / tip).
 * Ensures the default entitlement row exists and exactly one row is updated within the transaction.
 */
export async function setSupporterStatus(
  isSupporter: boolean
): Promise<UserEntitlementRow> {
  const db = await getDatabase();

  await runInExclusiveTransaction(db, async (txn) => {
    // 1. Ensure default entitlement row exists before update
    await txn.runAsync(
      `INSERT OR IGNORE INTO user_entitlements (id, unlocked_goal_slots, is_supporter, ads_watched_count)
       VALUES (?, 3, 0, 0);`,
      [DEFAULT_ENTITLEMENTS_ID]
    );

    // 2. Perform atomic update
    const result = await txn.runAsync(
      `UPDATE user_entitlements
       SET is_supporter = ?
       WHERE id = ?;`,
      [isSupporter ? 1 : 0, DEFAULT_ENTITLEMENTS_ID]
    );

    if (result.changes !== 1) {
      throw new Error(`Failed to set supporter status: expected 1 row affected, got ${result.changes}`);
    }
  });

  return getUserEntitlements();
}
