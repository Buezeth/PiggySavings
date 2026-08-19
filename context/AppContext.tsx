import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CategoryRow,
  GoalRow,
  UserEntitlementRow,
  GoalContributionRow,
  UserPreferenceRow,
} from "../services/db/types";
import {
  getUserPreferences,
  updatePreferredCurrency as updatePreferredCurrencyInRepo,
} from "../repositories/userPreferenceRepo";
import {
  getCurrencySymbol,
  formatCurrencyCents,
  DEFAULT_CURRENCY_CODE,
} from "../constants/currencies";
import {
  getAllCategories,
  getCategoriesByType,
} from "../repositories/categoryRepo";
import {
  getActiveGoals,
  getAllGoals,
  updateGoal as updateGoalInRepo,
  applyGoalDelta as applyGoalDeltaInRepo,
  getGoalContributions as getGoalContributionsInRepo,
  CreateGoalInput,
  UpdateGoalInput,
} from "../repositories/goalRepo";
import { createGuardedGoal } from "../services/monetization/entitlementGuard";
import {
  getTransactions,
  getCashflowSummary,
  insertTransaction as insertTransactionInRepo,
  EnrichedTransactionRow,
  CashflowSummary,
  InsertTransactionInput,
  GoalAllocationInput,
  TransactionFilterOptions,
} from "../repositories/transactionRepo";
import {
  getUserEntitlements,
  unlockGoalSlot as unlockGoalSlotInRepo,
  setSupporterStatus as setSupporterStatusInRepo,
} from "../repositories/entitlementRepo";
import {
  getRecurringSchedules,
  toggleRecurringSchedule as toggleRecurringScheduleInRepo,
  deleteRecurringSchedule as deleteRecurringScheduleInRepo,
  createRecurringSchedule as createRecurringScheduleInRepo,
  CreateRecurringScheduleInput,
} from "../repositories/recurringRepo";
import { RecurringScheduleRow } from "../services/db/types";

interface AppContextType {
  // Reactive States
  goals: GoalRow[];
  transactions: EnrichedTransactionRow[];
  cashflowSummary: CashflowSummary;
  entitlements: UserEntitlementRow;
  preferences: UserPreferenceRow;
  currencyCode: string;
  currencySymbol: string;
  categories: CategoryRow[];
  recurringSchedules: RecurringScheduleRow[];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;

  // Actions
  refreshData: () => Promise<void>;
  setPreferredCurrency: (code: string) => Promise<void>;
  formatMoney: (cents: number, options?: { compact?: boolean; showSign?: boolean }) => string;
  fetchTransactions: (options?: TransactionFilterOptions) => Promise<EnrichedTransactionRow[]>;
  addTransaction: (
    tx: InsertTransactionInput,
    goalAllocation?: GoalAllocationInput,
    recurringSchedule?: CreateRecurringScheduleInput
  ) => Promise<void>;
  createGoal: (goal: CreateGoalInput) => Promise<GoalRow>;
  updateGoal: (id: string, fields: UpdateGoalInput) => Promise<GoalRow | null>;
  contributeToGoal: (
    goalId: string,
    deltaCents: number,
    transactionId?: string,
    note?: string
  ) => Promise<GoalRow>;
  getGoalContributions: (
    goalId: string,
    options?: { since?: string }
  ) => Promise<GoalContributionRow[]>;
  unlockGoalSlot: () => Promise<void>;
  setSupporterStatus: (isSupporter: boolean, unlockedGoalSlots?: number) => Promise<void>;
  toggleRecurring: (id: string, isActive?: boolean) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  createRecurringSchedule: (input: CreateRecurringScheduleInput) => Promise<RecurringScheduleRow>;
}

const defaultPreferences: UserPreferenceRow = {
  id: "default_user",
  preferred_currency: "USD",
  biometrics_enabled: 0,
  reminders_enabled: 1,
  created_at: new Date().toISOString(),
};

const defaultEntitlements: UserEntitlementRow = {
  id: "default_entitlements",
  unlocked_goal_slots: 3,
  is_supporter: 0,
  ads_watched_count: 0,
};

const defaultCashflowSummary: CashflowSummary = {
  totalIncomeCents: 0,
  totalExpenseCents: 0,
  netSavingsCents: 0,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [transactions, setTransactions] = useState<EnrichedTransactionRow[]>([]);
  const [cashflowSummary, setCashflowSummary] = useState<CashflowSummary>(
    defaultCashflowSummary
  );
  const [entitlements, setEntitlements] =
    useState<UserEntitlementRow>(defaultEntitlements);
  const [preferences, setPreferences] =
    useState<UserPreferenceRow>(defaultPreferences);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringScheduleRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currencyCode = preferences.preferred_currency || DEFAULT_CURRENCY_CODE;
  const currencySymbol = getCurrencySymbol(currencyCode);

  // Monotonically increasing generation ref to track latest refreshData invocation
  const refreshGenerationRef = useRef(0);
  // Monotonically increasing revision ref to track local recurring mutations
  const recurringMutationRevisionRef = useRef(0);

  /**
   * Refreshes all core entities from SQLite asynchronously.
   * Tracks generation to avoid stale overlapping invocations overwriting current data.
   */
  const refreshData = useCallback(async () => {
    const currentGeneration = ++refreshGenerationRef.current;
    const capturedRecurringRevision = recurringMutationRevisionRef.current;

    try {
      setIsLoading(true);
      setError(null);

      const [
        fetchedGoals,
        fetchedTransactions,
        fetchedCashflow,
        fetchedEntitlements,
        fetchedPreferences,
        fetchedCategories,
        fetchedRecurring,
      ] = await Promise.all([
        getActiveGoals(),
        getTransactions({ limit: 50 }),
        getCashflowSummary(),
        getUserEntitlements(),
        getUserPreferences(),
        getAllCategories(),
        getRecurringSchedules(),
      ]);

      // Only update state if this is still the most recent refresh invocation
      if (currentGeneration === refreshGenerationRef.current) {
        setGoals(fetchedGoals);
        setTransactions(fetchedTransactions);
        setCashflowSummary(fetchedCashflow);
        setEntitlements(fetchedEntitlements);
        setPreferences(fetchedPreferences);
        setCategories(fetchedCategories);
        if (recurringMutationRevisionRef.current === capturedRecurringRevision) {
          setRecurringSchedules(fetchedRecurring);
        }
        setIsReady(true);
      }
    } catch (err) {
      console.error("[AppContext] refreshData failed:", err);
      if (currentGeneration === refreshGenerationRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load app data");
      }
    } finally {
      if (currentGeneration === refreshGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  /**
   * Fetch transactions with custom filtering/pagination without overwriting state unless desired
   */
  const fetchTransactions = useCallback(
    async (options?: TransactionFilterOptions) => {
      const rows = await getTransactions(options);
      return rows;
    },
    []
  );

  /**
   * Add a new transaction and update local context optimistically & accurately.
   */
  const addTransaction = useCallback(
    async (
      tx: InsertTransactionInput,
      goalAllocation?: GoalAllocationInput,
      recurringSchedule?: CreateRecurringScheduleInput
    ) => {
      await insertTransactionInRepo(tx, goalAllocation, recurringSchedule);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * Create a new savings goal guarded by user entitlements.
   */
  const createGoal = useCallback(
    async (goalInput: CreateGoalInput): Promise<GoalRow> => {
      const newGoal = await createGuardedGoal(goalInput);
      setGoals((prev) => [newGoal, ...prev]);
      return newGoal;
    },
    []
  );

  /**
   * Update goal metadata.
   */
  const updateGoal = useCallback(
    async (id: string, fields: UpdateGoalInput): Promise<GoalRow | null> => {
      const updated = await updateGoalInRepo(id, fields);
      if (updated) {
        setGoals((prev) =>
          prev.map((g) => (g.id === id ? updated : g))
        );
      }
      return updated;
    },
    []
  );

  /**
   * Contribute / apply delta to a goal balance.
   */
  const contributeToGoal = useCallback(
    async (
      goalId: string,
      deltaCents: number,
      transactionId?: string,
      note?: string
    ): Promise<GoalRow> => {
      const updated = await applyGoalDeltaInRepo(
        goalId,
        deltaCents,
        transactionId,
        note
      );
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? updated : g))
      );
      return updated;
    },
    []
  );

  /**
   * Unlock an extra goal slot (e.g. after watching a rewarded ad).
   */
  const unlockGoalSlot = useCallback(async () => {
    const updated = await unlockGoalSlotInRepo();
    setEntitlements(updated);
  }, []);

  /**
   * Set user supporter status and optional unlocked goal slots.
   */
  const setSupporterStatus = useCallback(
    async (isSupporter: boolean, unlockedGoalSlots?: number) => {
      const updated = await setSupporterStatusInRepo(isSupporter, unlockedGoalSlots);
      setEntitlements(updated);
    },
    []
  );

  /**
   * Toggle a recurring schedule active/inactive.
   */
  const toggleRecurring = useCallback(
    async (id: string, isActive?: boolean) => {
      recurringMutationRevisionRef.current += 1;
      const updated = await toggleRecurringScheduleInRepo(id, isActive);
      if (updated) {
        setRecurringSchedules((prev) =>
          prev.map((s) => (s.id === id ? updated : s))
        );
      }
    },
    []
  );

  /**
   * Delete a recurring schedule.
   */
  const deleteRecurring = useCallback(async (id: string) => {
    recurringMutationRevisionRef.current += 1;
    await deleteRecurringScheduleInRepo(id);
    setRecurringSchedules((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /**
   * Create a new recurring schedule.
   */
  const createRecurringSchedule = useCallback(
    async (input: CreateRecurringScheduleInput) => {
      recurringMutationRevisionRef.current += 1;
      const created = await createRecurringScheduleInRepo(input);
      setRecurringSchedules((prev) => [...prev, created]);
      return created;
    },
    []
  );

  /**
   * Fetch goal contributions for a specific goal.
   */
  const getGoalContributions = useCallback(
    async (goalId: string, options?: { since?: string }) => {
      return getGoalContributionsInRepo(goalId, options);
    },
    []
  );

  /**
   * Updates preferred currency in SQLite and updates local context.
   */
  const setPreferredCurrency = useCallback(async (code: string) => {
    const updated = await updatePreferredCurrencyInRepo(code);
    setPreferences(updated);
  }, []);

  /**
   * Helper to format an amount in cents with active preferred currency.
   */
  const formatMoney = useCallback(
    (cents: number, options?: { compact?: boolean; showSign?: boolean }) => {
      return formatCurrencyCents(cents, currencyCode, options);
    },
    [currencyCode]
  );

  const value: AppContextType = {
    goals,
    transactions,
    cashflowSummary,
    entitlements,
    preferences,
    currencyCode,
    currencySymbol,
    categories,
    recurringSchedules,
    isLoading,
    isReady,
    error,
    refreshData,
    setPreferredCurrency,
    formatMoney,
    fetchTransactions,
    addTransaction,
    createGoal,
    updateGoal,
    contributeToGoal,
    getGoalContributions,
    unlockGoalSlot,
    setSupporterStatus,
    toggleRecurring,
    deleteRecurring,
    createRecurringSchedule,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook to consume the central AppContext.
 */
export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an <AppProvider />");
  }
  return context;
}
