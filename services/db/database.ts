import * as SQLite from "expo-sqlite";

export const DB_NAME = "piggysavings.db";
export const CURRENT_SCHEMA_VERSION = 1;

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the open SQLiteDatabase singleton instance.
 * Configuration must succeed before dbInstance is assigned.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    const rawDb = await SQLite.openDatabaseAsync(DB_NAME);
    await configurePragmas(rawDb);
    dbInstance = rawDb;
  }
  return dbInstance;
}

/**
 * Configure standard SQLite PRAGMAs for performance and relational integrity.
 */
async function configurePragmas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
}

/**
 * Runs migrations and default seeders.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await getDatabase();
  await migrateDatabase(db);
  await seedDefaultData(db);
  return db;
}

/**
 * Backwards-compatible alias for initDatabase
 */
export const initializeDatabase = initDatabase;

/**
 * Schema migrations for PiggySavings local-first SQLite DB using PRAGMA user_version.
 */
async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionResult = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;"
  );
  const currentVersion = versionResult?.user_version ?? 0;

  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    await db.withExclusiveTransactionAsync(async () => {
      // 1. user_preferences table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id TEXT PRIMARY KEY NOT NULL,
          preferred_currency TEXT NOT NULL DEFAULT 'USD',
          biometrics_enabled INTEGER NOT NULL DEFAULT 0,
          reminders_enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );
      `);

      // 2. categories table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          icon_name TEXT,
          icon_family TEXT,
          color_code TEXT,
          is_default INTEGER NOT NULL DEFAULT 0
        );
      `);

      // 3. goals table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS goals (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          target_amount_cents INTEGER NOT NULL,
          current_amount_cents INTEGER NOT NULL DEFAULT 0,
          target_date TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
          priority_label TEXT,
          category_tag TEXT,
          icon_name TEXT,
          icon_family TEXT,
          card_variant TEXT NOT NULL DEFAULT 'card' CHECK(card_variant IN ('card', 'gold', 'income', 'subtle')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 4. transactions table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY NOT NULL,
          category_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
          amount_cents INTEGER NOT NULL,
          note TEXT,
          transaction_date TEXT NOT NULL,
          idempotency_key TEXT UNIQUE,
          created_at TEXT NOT NULL,
          FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
        );
      `);

      // 5. goal_contributions table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS goal_contributions (
          id TEXT PRIMARY KEY NOT NULL,
          goal_id TEXT NOT NULL,
          transaction_id TEXT,
          amount_cents INTEGER NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE,
          FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE SET NULL
        );
      `);

      // 6. recurring_schedules table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recurring_schedules (
          id TEXT PRIMARY KEY NOT NULL,
          category_id TEXT NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          amount_cents INTEGER NOT NULL,
          frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
          custom_interval_days INTEGER,
          day_of_month INTEGER,
          start_date TEXT NOT NULL,
          next_occurrence TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
        );
      `);

      // 7. allocation_rules table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS allocation_rules (
          id TEXT PRIMARY KEY NOT NULL,
          goal_id TEXT NOT NULL,
          category_id TEXT,
          rule_type TEXT NOT NULL CHECK(rule_type IN ('percentage', 'fixed_cents', 'remainder')),
          value REAL NOT NULL,
          min_income_cents INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
        );
      `);

      // 8. user_entitlements table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_entitlements (
          id TEXT PRIMARY KEY NOT NULL,
          unlocked_goal_slots INTEGER NOT NULL DEFAULT 3,
          is_supporter INTEGER NOT NULL DEFAULT 0,
          ads_watched_count INTEGER NOT NULL DEFAULT 0
        );
      `);

      // Indexes for high-frequency queries
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (transaction_date DESC);
        CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
        CREATE INDEX IF NOT EXISTS idx_contributions_goal ON goal_contributions (goal_id);
        CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_schedules (next_occurrence, is_active);
        CREATE INDEX IF NOT EXISTS idx_allocation_active ON allocation_rules (is_active);
        CREATE INDEX IF NOT EXISTS idx_goals_status ON goals (status);
      `);

      // Update PRAGMA user_version inside the exclusive transaction using CURRENT_SCHEMA_VERSION
      await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`);
    });
  }
}

/**
 * Default categories seeder including Income and Expense categories with icon_family.
 */
export const DEFAULT_CATEGORIES = [
  // Income categories
  {
    id: "cat_salary",
    name: "Salary",
    type: "income",
    icon_name: "cash-outline",
    icon_family: "Ionicons",
    color_code: "emerald",
    is_default: 1,
  },
  {
    id: "cat_freelance",
    name: "Freelance",
    type: "income",
    icon_name: "briefcase-outline",
    icon_family: "Ionicons",
    color_code: "emerald",
    is_default: 1,
  },
  {
    id: "cat_investment",
    name: "Investment",
    type: "income",
    icon_name: "trending-up-outline",
    icon_family: "Ionicons",
    color_code: "emerald",
    is_default: 1,
  },
  {
    id: "cat_gift",
    name: "Gift",
    type: "income",
    icon_name: "gift-outline",
    icon_family: "Ionicons",
    color_code: "emerald",
    is_default: 1,
  },
  // Expense categories
  {
    id: "cat_dining",
    name: "Dining",
    type: "expense",
    icon_name: "restaurant-outline",
    icon_family: "Ionicons",
    color_code: "primary",
    is_default: 1,
  },
  {
    id: "cat_groceries",
    name: "Groceries",
    type: "expense",
    icon_name: "cart-outline",
    icon_family: "Ionicons",
    color_code: "gold",
    is_default: 1,
  },
  {
    id: "cat_rent",
    name: "Rent",
    type: "expense",
    icon_name: "home-outline",
    icon_family: "Ionicons",
    color_code: "rose",
    is_default: 1,
  },
  {
    id: "cat_transport",
    name: "Transport",
    type: "expense",
    icon_name: "car-outline",
    icon_family: "Ionicons",
    color_code: "primary",
    is_default: 1,
  },
  {
    id: "cat_utilities",
    name: "Utilities",
    type: "expense",
    icon_name: "flash-outline",
    icon_family: "Ionicons",
    color_code: "gold",
    is_default: 1,
  },
  {
    id: "cat_entertainment",
    name: "Entertainment",
    type: "expense",
    icon_name: "game-controller-outline",
    icon_family: "Ionicons",
    color_code: "primary",
    is_default: 1,
  },
  {
    id: "cat_health",
    name: "Health",
    type: "expense",
    icon_name: "heart-outline",
    icon_family: "Ionicons",
    color_code: "rose",
    is_default: 1,
  },
] as const;

/**
 * Seeds default categories, user preferences, and entitlements if they do not already exist.
 */
async function seedDefaultData(db: SQLite.SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // 1. Seed categories
    for (const cat of DEFAULT_CATEGORIES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, type, icon_name, icon_family, color_code, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [cat.id, cat.name, cat.type, cat.icon_name, cat.icon_family, cat.color_code, cat.is_default]
      );
    }

    // 2. Seed default user_preferences if not present
    await db.runAsync(
      `INSERT OR IGNORE INTO user_preferences (id, preferred_currency, biometrics_enabled, reminders_enabled, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      ["default_user", "USD", 0, 1, now]
    );

    // 3. Seed default user_entitlements if not present (3 free goals)
    await db.runAsync(
      `INSERT OR IGNORE INTO user_entitlements (id, unlocked_goal_slots, is_supporter, ads_watched_count)
       VALUES (?, ?, ?, ?);`,
      ["default_entitlements", 3, 0, 0]
    );
  });
}
