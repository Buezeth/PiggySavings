import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  DEFAULT_CURRENCY_CODE,
  formatCurrencyCents,
  getCurrencySymbol,
} from "../constants/currencies";
import {
  CategoryBudgetSummary,
  CreateCategoryInput,
  createCustomCategory as createCustomCategoryInRepo,
  deleteCategory as deleteCategoryInRepo,
  DeleteCategoryResult,
  getAllCategories,
  getCategoryBudgetSummaries,
  UpdateCategoryInput,
  updateCategory as updateCategoryInRepo,
} from "../repositories/categoryRepo";
import {
  getUserEntitlements,
  setSupporterStatus as setSupporterStatusInRepo,
  unlockGoalSlot as unlockGoalSlotInRepo,
} from "../repositories/entitlementRepo";
import {
  applyGoalDelta as applyGoalDeltaInRepo,
  CreateGoalInput,
  getActiveGoals,
  getGoalContributions as getGoalContributionsInRepo,
  UpdateGoalInput,
  updateGoal as updateGoalInRepo,
  withdrawFromGoal as withdrawFromGoalInRepo,
} from "../repositories/goalRepo";
import {
  CreateRecurringScheduleInput,
  UpdateRecurringScheduleInput,
  createRecurringSchedule as createRecurringScheduleInRepo,
  updateRecurringSchedule as updateRecurringScheduleInRepo,
  deleteRecurringSchedule as deleteRecurringScheduleInRepo,
  getRecurringSchedules,
  toggleRecurringSchedule as toggleRecurringScheduleInRepo,
} from "../repositories/recurringRepo";
import {
  confirmRecurringSchedule as confirmRecurringScheduleInEngine,
  getPendingRecurringSchedules,
  processDueRecurringSchedules,
  skipRecurringOccurrence as skipRecurringOccurrenceInEngine,
} from "../services/recurring/recurringEngine";
import {
  CashflowSummary,
  EnrichedTransactionRow,
  getCashflowSummary,
  getTransactions,
  GoalAllocationInput,
  InsertTransactionInput,
  insertTransaction as insertTransactionInRepo,
  deleteTransaction as deleteTransactionInRepo,
  updateTransaction as updateTransactionInRepo,
  TransactionFilterOptions,
} from "../repositories/transactionRepo";
import {
  DEFAULT_USER_PREF_ID,
  getUserPreferences,
  updatePreferredCurrency as updatePreferredCurrencyInRepo,
} from "../repositories/userPreferenceRepo";
import {
  CategoryRow,
  GoalContributionRow,
  GoalRow,
  RecurringScheduleRow,
  TransactionRow,
  UpdateTransactionInput,
  UserEntitlementRow,
  UserPreferenceRow,
} from "../services/db/types";
import { createGuardedGoal } from "../services/monetization/entitlementGuard";

export interface SpendableCashSummary {
  totalIncomeCents: number;
  totalExpenseCents: number;
  totalGoalReservedCents: number;
  unallocatedSpendableCents: number; // Income - Expense - Active Goal Balances
}

interface AppContextType {
  // Reactive States
  goals: GoalRow[];
  transactions: EnrichedTransactionRow[];
  cashflowSummary: CashflowSummary;
  spendableCashSummary: SpendableCashSummary;
  entitlements: UserEntitlementRow;
  preferences: UserPreferenceRow;
  currencyCode: string;
  currencySymbol: string;
  categories: CategoryRow[];
  categoryBudgetSummaries: CategoryBudgetSummary[];
  recurringSchedules: RecurringScheduleRow[];
  pendingRecurringSchedules: RecurringScheduleRow[];
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
  deleteTransaction: (id: string) => Promise<boolean>;
  updateTransaction: (id: string, input: UpdateTransactionInput) => Promise<TransactionRow | null>;
  createGoal: (goal: CreateGoalInput) => Promise<GoalRow>;
  updateGoal: (id: string, fields: UpdateGoalInput) => Promise<GoalRow | null>;
  contributeToGoal: (
    goalId: string,
    deltaCents: number,
    transactionId?: string,
    note?: string
  ) => Promise<GoalRow>;
  withdrawFromGoal: (
    goalId: string,
    amountCents: number,
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
  updateRecurringSchedule: (id: string, input: UpdateRecurringScheduleInput) => Promise<RecurringScheduleRow | null>;
  confirmRecurringSchedule: (id: string, amountCents?: number, date?: string) => Promise<void>;
  skipRecurringOccurrence: (id: string) => Promise<void>;
  createCategory: (input: CreateCategoryInput) => Promise<CategoryRow>;
  updateCategory: (id: string, fields: UpdateCategoryInput) => Promise<CategoryRow | null>;
  deleteCategory: (id: string, reassignToCategoryId?: string) => Promise<DeleteCategoryResult>;
}

const createDefaultPreferences = (): UserPreferenceRow => ({
  id: DEFAULT_USER_PREF_ID,
  preferred_currency: DEFAULT_CURRENCY_CODE,
  biometrics_enabled: 0,
  reminders_enabled: 1,
  created_at: new Date().toISOString(),
});

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
    useState<UserPreferenceRow>(createDefaultPreferences);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryBudgetSummaries, setCategoryBudgetSummaries] = useState<CategoryBudgetSummary[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringScheduleRow[]>([]);
  const [pendingRecurringSchedules, setPendingRecurringSchedules] = useState<RecurringScheduleRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currencyCode = preferences.preferred_currency || DEFAULT_CURRENCY_CODE;
  const currencySymbol = useMemo(
    () => getCurrencySymbol(currencyCode),
    [currencyCode]
  );

  const spendableCashSummary = useMemo<SpendableCashSummary>(() => {
    const totalIncomeCents = cashflowSummary.totalIncomeCents;
    const totalExpenseCents = cashflowSummary.totalExpenseCents;
    const totalGoalReservedCents = goals
      .filter((g) => g.status === "active")
      .reduce((acc, g) => acc + (g.current_amount_cents || 0), 0);
    const unallocatedSpendableCents = totalIncomeCents - totalExpenseCents - totalGoalReservedCents;

    return {
      totalIncomeCents,
      totalExpenseCents,
      totalGoalReservedCents,
      unallocatedSpendableCents,
    };
  }, [cashflowSummary, goals]);

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
        fetchedBudgets,
        fetchedRecurring,
        fetchedPendingRecurring,
      ] = await Promise.all([
        getActiveGoals(),
        getTransactions({ limit: 50 }),
        getCashflowSummary(),
        getUserEntitlements(),
        getUserPreferences(),
        getAllCategories(),
        getCategoryBudgetSummaries(),
        getRecurringSchedules(),
        getPendingRecurringSchedules(),
      ]);

      // Only update state if this is still the most recent refresh invocation
      if (currentGeneration === refreshGenerationRef.current) {
        setGoals(fetchedGoals);
        setTransactions(fetchedTransactions);
        setCashflowSummary(fetchedCashflow);
        setEntitlements(fetchedEntitlements);
        setPreferences(fetchedPreferences);
        setCategories(fetchedCategories);
        setCategoryBudgetSummaries(fetchedBudgets);
        setPendingRecurringSchedules(fetchedPendingRecurring);
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
   * Delete a transaction with atomic balance rollbacks and refresh app state.
   */
  const deleteTransaction = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await deleteTransactionInRepo(id);
      if (success) {
        await refreshData();
      }
      return success;
    },
    [refreshData]
  );

  /**
   * Update transaction metadata and reconcile goal balances.
   */
  const updateTransaction = useCallback(
    async (id: string, input: UpdateTransactionInput): Promise<TransactionRow | null> => {
      const updated = await updateTransactionInRepo(id, input);
      if (updated) {
        await refreshData();
      }
      return updated;
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
      await refreshData();
      return updated;
    },
    [refreshData]
  );

  /**
   * Withdraw from a goal balance and refresh app state.
   */
  const withdrawFromGoal = useCallback(
    async (
      goalId: string,
      amountCents: number,
      note?: string
    ): Promise<GoalRow> => {
      const updated = await withdrawFromGoalInRepo(
        goalId,
        amountCents,
        undefined,
        note
      );
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? updated : g))
      );
      await refreshData();
      return updated;
    },
    [refreshData]
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
   * Update an existing recurring schedule.
   */
  const updateRecurring = useCallback(
    async (id: string, input: UpdateRecurringScheduleInput) => {
      recurringMutationRevisionRef.current += 1;
      const updated = await updateRecurringScheduleInRepo(id, input);
      if (updated) {
        setRecurringSchedules((prev) =>
          prev.map((s) => (s.id === id ? updated : s))
        );
      }
      return updated;
    },
    []
  );

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
   * Foreground listener to refresh pending recurring schedules without silent auto-insertion
   */
  const isRefreshingForegroundRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (state: AppStateStatus) => {
        if (state === "active" && !isRefreshingForegroundRef.current) {
          isRefreshingForegroundRef.current = true;
          try {
            await refreshData();
          } catch (err) {
            console.error("Foreground refresh error:", err);
          } finally {
            isRefreshingForegroundRef.current = false;
          }
        }
      }
    );
    return () => subscription.remove();
  }, [refreshData]);

  /**
   * Confirms a due recurring schedule and logs the transaction.
   */
  const confirmRecurringSchedule = useCallback(
    async (id: string, amountCents?: number, date?: string) => {
      await confirmRecurringScheduleInEngine(id, amountCents, date);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * Skips a due recurring occurrence without logging a transaction.
   */
  const skipRecurringOccurrence = useCallback(
    async (id: string) => {
      await skipRecurringOccurrenceInEngine(id);
      await refreshData();
    },
    [refreshData]
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

  /**
   * Create a new custom category.
   */
  const createCategory = useCallback(
    async (input: CreateCategoryInput): Promise<CategoryRow> => {
      const created = await createCustomCategoryInRepo(input);
      setCategories((prev) => [...prev, created]);
      return created;
    },
    []
  );

  /**
   * Update an existing custom category.
   */
  const updateCategory = useCallback(
    async (id: string, fields: UpdateCategoryInput): Promise<CategoryRow | null> => {
      const updated = await updateCategoryInRepo(id, fields);
      if (updated) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? updated : c))
        );
        await refreshData();
      }
      return updated;
    },
    [refreshData]
  );

  /**
   * Delete a category with optional reassignment of associated records.
   */
  const deleteCategory = useCallback(
    async (
      id: string,
      reassignToCategoryId?: string
    ): Promise<DeleteCategoryResult> => {
      const result = await deleteCategoryInRepo(id, reassignToCategoryId);
      if (result.success) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        await refreshData();
      }
      return result;
    },
    [refreshData]
  );

  const value = useMemo<AppContextType>(
    () => ({
      goals,
      transactions,
      cashflowSummary,
      spendableCashSummary,
      entitlements,
      preferences,
      currencyCode,
      currencySymbol,
      categories,
      categoryBudgetSummaries,
      recurringSchedules,
      pendingRecurringSchedules,
      isLoading,
      isReady,
      error,
      refreshData,
      setPreferredCurrency,
      formatMoney,
      fetchTransactions,
      addTransaction,
      deleteTransaction,
      updateTransaction,
      createGoal,
      updateGoal,
      contributeToGoal,
      withdrawFromGoal,
      getGoalContributions,
      unlockGoalSlot,
      setSupporterStatus,
      toggleRecurring,
      deleteRecurring,
      createRecurringSchedule,
      updateRecurringSchedule: updateRecurring,
      confirmRecurringSchedule,
      skipRecurringOccurrence,
      createCategory,
      updateCategory,
      deleteCategory,
    }),
    [
      goals,
      transactions,
      cashflowSummary,
      spendableCashSummary,
      entitlements,
      preferences,
      currencyCode,
      currencySymbol,
      categories,
      categoryBudgetSummaries,
      recurringSchedules,
      pendingRecurringSchedules,
      isLoading,
      isReady,
      error,
      refreshData,
      setPreferredCurrency,
      formatMoney,
      fetchTransactions,
      addTransaction,
      deleteTransaction,
      updateTransaction,
      createGoal,
      updateGoal,
      contributeToGoal,
      withdrawFromGoal,
      getGoalContributions,
      unlockGoalSlot,
      setSupporterStatus,
      toggleRecurring,
      deleteRecurring,
      createRecurringSchedule,
      updateRecurring,
      confirmRecurringSchedule,
      skipRecurringOccurrence,
      createCategory,
      updateCategory,
      deleteCategory,
    ]
  );

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
