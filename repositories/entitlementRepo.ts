import { getDatabase } from "../services/db/database";
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
 */
export async function unlockGoalSlot(): Promise<UserEntitlementRow> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE user_entitlements
     SET unlocked_goal_slots = unlocked_goal_slots + 1,
         ads_watched_count = ads_watched_count + 1
     WHERE id = ?;`,
    [DEFAULT_ENTITLEMENTS_ID]
  );
  return getUserEntitlements();
}

/**
 * Sets supporter status (e.g. after in-app purchase / tip).
 */
export async function setSupporterStatus(
  isSupporter: boolean
): Promise<UserEntitlementRow> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE user_entitlements
     SET is_supporter = ?
     WHERE id = ?;`,
    [isSupporter ? 1 : 0, DEFAULT_ENTITLEMENTS_ID]
  );
  return getUserEntitlements();
}
