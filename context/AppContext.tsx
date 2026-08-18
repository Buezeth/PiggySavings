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
} from "../services/db/types";
import {
  getAllCategories,
  getCategoriesByType,
} from "../repositories/categoryRepo";
import {
  getActiveGoals,
  getAllGoals,
  createGoal as createGoalInRepo,
  updateGoal as updateGoalInRepo,
  applyGoalDelta as applyGoalDeltaInRepo,
  CreateGoalInput,
  UpdateGoalInput,
} from "../repositories/goalRepo";
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

interface AppContextType {
  // Reactive States
  goals: GoalRow[];
  transactions: EnrichedTransactionRow[];
  cashflowSummary: CashflowSummary;
  entitlements: UserEntitlementRow;
  categories: CategoryRow[];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;

  // Actions
  refreshData: () => Promise<void>;
  fetchTransactions: (options?: TransactionFilterOptions) => Promise<EnrichedTransactionRow[]>;
  addTransaction: (
    tx: InsertTransactionInput,
    goalAllocation?: GoalAllocationInput
  ) => Promise<void>;
  createGoal: (goal: CreateGoalInput) => Promise<GoalRow>;
  updateGoal: (id: string, fields: UpdateGoalInput) => Promise<GoalRow | null>;
  contributeToGoal: (
    goalId: string,
    deltaCents: number,
    transactionId?: string,
    note?: string
  ) => Promise<GoalRow>;
  unlockGoalSlot: () => Promise<void>;
  setSupporterStatus: (isSupporter: boolean) => Promise<void>;
}

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
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Monotonically increasing generation ref to track latest refreshData invocation
  const refreshGenerationRef = useRef(0);

  /**
   * Refreshes all core entities from SQLite asynchronously.
   * Tracks generation to avoid stale overlapping invocations overwriting current data.
   */
  const refreshData = useCallback(async () => {
    const currentGeneration = ++refreshGenerationRef.current;

    try {
      setIsLoading(true);
      setError(null);

      const [
        fetchedGoals,
        fetchedTransactions,
        fetchedCashflow,
        fetchedEntitlements,
        fetchedCategories,
      ] = await Promise.all([
        getActiveGoals(),
        getTransactions({ limit: 50 }),
        getCashflowSummary(),
        getUserEntitlements(),
        getAllCategories(),
      ]);

      // Only update state if this is still the most recent refresh invocation
      if (currentGeneration === refreshGenerationRef.current) {
        setGoals(fetchedGoals);
        setTransactions(fetchedTransactions);
        setCashflowSummary(fetchedCashflow);
        setEntitlements(fetchedEntitlements);
        setCategories(fetchedCategories);
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
      goalAllocation?: GoalAllocationInput
    ) => {
      await insertTransactionInRepo(tx, goalAllocation);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * Create a new savings goal.
   */
  const createGoal = useCallback(
    async (goalInput: CreateGoalInput): Promise<GoalRow> => {
      const newGoal = await createGoalInRepo(goalInput);
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
   * Set user supporter status.
   */
  const setSupporterStatus = useCallback(async (isSupporter: boolean) => {
    const updated = await setSupporterStatusInRepo(isSupporter);
    setEntitlements(updated);
  }, []);

  const value: AppContextType = {
    goals,
    transactions,
    cashflowSummary,
    entitlements,
    categories,
    isLoading,
    isReady,
    error,
    refreshData,
    fetchTransactions,
    addTransaction,
    createGoal,
    updateGoal,
    contributeToGoal,
    unlockGoalSlot,
    setSupporterStatus,
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
