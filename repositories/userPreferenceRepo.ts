import { DEFAULT_CURRENCY_CODE, SUPPORTED_CURRENCIES } from "../constants/currencies";
import { getDatabase, runInExclusiveTransaction } from "../services/db/database";
import { UserPreferenceRow } from "../services/db/types";

export const DEFAULT_USER_PREF_ID = "default_user";

/**
 * Validates that a currency code is present in SUPPORTED_CURRENCIES.
 * Falls back to DEFAULT_CURRENCY_CODE if invalid, empty, or unsupported.
 */
function sanitizeCurrencyCode(code?: string | null): string {
  if (!code || typeof code !== "string") {
    return DEFAULT_CURRENCY_CODE;
  }
  const normalized = code.trim().toUpperCase();
  const isSupported = SUPPORTED_CURRENCIES.some((c) => c.code.toUpperCase() === normalized);
  return isSupported ? normalized : DEFAULT_CURRENCY_CODE;
}

/**
 * Fetch current user preferences (preferred_currency, biometrics_enabled, reminders_enabled).
 */
export async function getUserPreferences(): Promise<UserPreferenceRow> {
  const db = await getDatabase();
  let row = await db.getFirstAsync<UserPreferenceRow>(
    `SELECT * FROM user_preferences WHERE id = ?;`,
    [DEFAULT_USER_PREF_ID]
  );

  if (!row) {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR IGNORE INTO user_preferences (id, preferred_currency, biometrics_enabled, reminders_enabled, created_at)
       VALUES (?, ?, 0, 1, ?);`,
      [DEFAULT_USER_PREF_ID, DEFAULT_CURRENCY_CODE, now]
    );
    row = await db.getFirstAsync<UserPreferenceRow>(
      `SELECT * FROM user_preferences WHERE id = ?;`,
      [DEFAULT_USER_PREF_ID]
    );
  }

  return (
    row ?? {
      id: DEFAULT_USER_PREF_ID,
      preferred_currency: DEFAULT_CURRENCY_CODE,
      biometrics_enabled: 0,
      reminders_enabled: 1,
      created_at: new Date().toISOString(),
    }
  );
}

/**
 * Updates the user's preferred currency code.
 */
export async function updatePreferredCurrency(
  currencyCode: string
): Promise<UserPreferenceRow> {
  const db = await getDatabase();
  const validCode = sanitizeCurrencyCode(currencyCode);

  await runInExclusiveTransaction(db, async (txn) => {
    const now = new Date().toISOString();
    await txn.runAsync(
      `INSERT OR IGNORE INTO user_preferences (id, preferred_currency, biometrics_enabled, reminders_enabled, created_at)
       VALUES (?, ?, 0, 1, ?);`,
      [DEFAULT_USER_PREF_ID, DEFAULT_CURRENCY_CODE, now]
    );

    await txn.runAsync(
      `UPDATE user_preferences
       SET preferred_currency = ?
       WHERE id = ?;`,
      [validCode, DEFAULT_USER_PREF_ID]
    );
  });

  return getUserPreferences();
}

/**
 * Updates biometrics and/or reminders preferences.
 */
export async function updateUserPreferences(fields: {
  preferred_currency?: string;
  biometrics_enabled?: number;
  reminders_enabled?: number;
}): Promise<UserPreferenceRow> {
  const db = await getDatabase();
  const setClauses: string[] = [];
  const params: (string | number)[] = [];

  if (fields.preferred_currency !== undefined) {
    setClauses.push("preferred_currency = ?");
    params.push(sanitizeCurrencyCode(fields.preferred_currency));
  }
  if (fields.biometrics_enabled !== undefined) {
    setClauses.push("biometrics_enabled = ?");
    params.push(fields.biometrics_enabled ? 1 : 0);
  }
  if (fields.reminders_enabled !== undefined) {
    setClauses.push("reminders_enabled = ?");
    params.push(fields.reminders_enabled ? 1 : 0);
  }

  if (setClauses.length > 0) {
    const updateParams = [...params, DEFAULT_USER_PREF_ID];
    await runInExclusiveTransaction(db, async (txn) => {
      const now = new Date().toISOString();
      await txn.runAsync(
        `INSERT OR IGNORE INTO user_preferences (id, preferred_currency, biometrics_enabled, reminders_enabled, created_at)
         VALUES (?, ?, 0, 1, ?);`,
        [DEFAULT_USER_PREF_ID, DEFAULT_CURRENCY_CODE, now]
      );

      await txn.runAsync(
        `UPDATE user_preferences SET ${setClauses.join(", ")} WHERE id = ?;`,
        updateParams
      );
    });
  }

  return getUserPreferences();
}

