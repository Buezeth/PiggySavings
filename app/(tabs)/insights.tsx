import { CartoonCard } from "@/components/CartoonCard";
import { CategoryManagerModal } from "@/components/CategoryManagerModal";
import { getCurrency } from "@/constants/currencies";
import { PALETTE_CONFIG, PaletteToken } from "@/constants/iconRegistry";
import { colors } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const {
    goals,
    transactions,
    cashflowSummary,
    spendableCashSummary,
    categoryBudgetSummaries,
    currencyCode,
    getGoalContributions,
    fetchTransactions,
    formatMoney,
  } = useApp();

  const [isCategoryManagerVisible, setIsCategoryManagerVisible] = useState(false);

  // Metrics Transaction History (Complete date-bounded window, not limited to 50 items)
  const [historyTransactions, setHistoryTransactions] = React.useState(transactions);

  React.useEffect(() => {
    let isMounted = true;
    // Fetch last 180 days of transactions for comprehensive streak and velocity accuracy with full pagination
    const startDate = new Date(Date.now() - 180 * 86400000).toISOString();
    const pageSize = 500;

    async function loadAllInsightsTransactions() {
      try {
        const accumulated: typeof transactions = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const page = await fetchTransactions({
            startDate,
            limit: pageSize,
            offset,
          });

          if (!isMounted) return;
          accumulated.push(...page);

          if (page.length < pageSize) {
            hasMore = false;
          } else {
            offset += pageSize;
          }
        }

        if (isMounted) {
          setHistoryTransactions(accumulated);
        }
      } catch (err) {
        console.error("Failed to fetch transactions for insights:", err);
      }
    }

    loadAllInsightsTransactions();

    return () => {
      isMounted = false;
    };
  }, [fetchTransactions, transactions]);

  // 1. Savings Rate Calculation
  const savingsRatePercent = useMemo(() => {
    if (cashflowSummary.totalIncomeCents <= 0) return 0;
    const rate =
      (cashflowSummary.netSavingsCents / cashflowSummary.totalIncomeCents) * 100;
    return Math.max(0, Math.min(100, Math.round(rate * 10) / 10));
  }, [cashflowSummary]);

  // 2. Velocity Calculation (Past 30 Days)
  const past30DaysVelocityCents = useMemo(() => {
    const cutoffDate = new Date(Date.now() - 30 * 86400000);
    const incomeCents = historyTransactions
      .filter(
        (t) => t.type === "income" && new Date(t.transaction_date) >= cutoffDate
      )
      .reduce((sum, t) => sum + t.amount_cents, 0);
    const expenseCents = historyTransactions
      .filter(
        (t) => t.type === "expense" && new Date(t.transaction_date) >= cutoffDate
      )
      .reduce((sum, t) => sum + t.amount_cents, 0);

    return incomeCents - expenseCents;
  }, [historyTransactions]);

  // 3. Weekly Streak Calculation (Consecutive active weeks counting backward from current week)
  const savingsStreakWeeks = useMemo(() => {
    if (historyTransactions.length === 0) return 0;

    const getWeekKey = (date: Date): string => {
      // Normalize to Monday-based ISO week
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${d.getUTCFullYear()}-W${weekNo}`;
    };

    const parseLocalDate = (dateStr: string): Date => {
      // If YYYY-MM-DD date-only format, construct local calendar date to avoid timezone day shifts
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split("-").map(Number);
        return new Date(y, m - 1, d);
      }
      return new Date(dateStr);
    };

    const activeWeeks = new Set<string>();
    for (const t of historyTransactions) {
      const d = parseLocalDate(t.transaction_date);
      if (!isNaN(d.getTime())) {
        activeWeeks.add(getWeekKey(d));
      }
    }

    const checkDate = new Date();
    let streak = 0;

    // Check consecutive weeks backward starting from current week
    while (activeWeeks.has(getWeekKey(checkDate))) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 7);
    }

    return streak;
  }, [historyTransactions]);

  // 4. Primary Goal Projected Completion Date
  const [primaryGoalContributions30DCents, setPrimaryGoalContributions30DCents] =
    React.useState<number>(0);

  const primaryGoal = goals.length > 0 ? goals[0] : null;
  const primaryGoalId = primaryGoal?.id;

  React.useEffect(() => {
    let isMounted = true;
    setPrimaryGoalContributions30DCents(0);

    if (!primaryGoalId) {
      return;
    }

    const cutoffDate = new Date(Date.now() - 30 * 86400000).toISOString();
    getGoalContributions(primaryGoalId, { since: cutoffDate })
      .then((rows) => {
        if (!isMounted) return;
        const totalCents = rows.reduce(
          (sum, r) => sum + (r.amount_cents > 0 ? r.amount_cents : 0),
          0
        );
        setPrimaryGoalContributions30DCents(totalCents);
      })
      .catch((err) => {
        console.error("Failed to load goal contributions:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [primaryGoalId, getGoalContributions, transactions]);

  const projectionInfo = useMemo(() => {
    if (!primaryGoal) {
      return {
        title: "Create a Goal",
        message: "Add your first savings goal to get smart pace estimates!",
        daysAhead: 0,
        hasPace: false,
        paceLabel: "No Active Goal",
      };
    }

    const remainingCents = Math.max(
      0,
      (primaryGoal.target_amount_cents || 0) -
        (primaryGoal.current_amount_cents || 0)
    );

    if (remainingCents === 0) {
      return {
        title: `${primaryGoal.title} Completed! 🏆`,
        message: "You've successfully reached 100% of your target amount!",
        daysAhead: 0,
        hasPace: false,
        paceLabel: "Goal Completed",
      };
    }

    // Daily savings rate based on 30-day contributions to this specific goal
    const dailyGoalRateCents = primaryGoalContributions30DCents / 30;
    if (dailyGoalRateCents <= 0) {
      return {
        title: `Saving for ${primaryGoal.title}`,
        message: `Keep allocating deposits to reach your ${formatMoney(
          primaryGoal.target_amount_cents
        )} target.`,
        daysAhead: 0,
        hasPace: false,
        paceLabel: "Needs Deposits",
      };
    }

    const daysRemaining = Math.ceil(remainingCents / dailyGoalRateCents);
    return {
      title: `On Track for ${primaryGoal.title}!`,
      message: `At your current velocity of ${formatMoney(
        primaryGoalContributions30DCents
      )}/mo, you are projected to reach your goal in ~${daysRemaining} days!`,
      daysAhead: 14,
      hasPace: true,
      paceLabel: "Active Pace",
    };
  }, [primaryGoal, primaryGoalContributions30DCents, formatMoney]);

  const velocityFormatted = formatMoney(past30DaysVelocityCents);

  const dynamicBenchmarkCents = useMemo(() => {
    const totalGoalTargets = goals.reduce((sum, g) => sum + (g.target_amount_cents || 0), 0);
    const monthlyGoalTarget = Math.round(totalGoalTargets / 12);
    const monthlyIncome = cashflowSummary.totalIncomeCents;
    const activeCurrency = getCurrency(currencyCode);

    // Minimum baseline of 500 main currency units (50,000 cents or 500 for zero-decimal)
    const minBaseline = activeCurrency.decimal_digits === 0 ? 500 : 50000;
    return Math.max(monthlyIncome, monthlyGoalTarget, minBaseline);
  }, [goals, cashflowSummary, currencyCode]);

  const velocityPercent = Math.min(
    100,
    Math.max(0, Math.round((Math.max(0, past30DaysVelocityCents) / dynamicBenchmarkCents) * 100))
  );

  const budgetedCategories = useMemo(() => {
    return categoryBudgetSummaries.filter((b) => b.budgetCents > 0);
  }, [categoryBudgetSummaries]);

  return (
    <View style={{ paddingTop: Math.max(insets.top, 16) }} className="flex-1 bg-bg-app">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-4 mb-6">
          <Text className="text-text-muted text-xs font-bold uppercase tracking-wider">
            Smart Analytics & Alerts
          </Text>
          <Text className="text-text-main text-2xl font-black mt-0.5">
            Insights & Nudges 📊
          </Text>
        </View>

        {/* ─── SECTION 1: SPENDABLE CASH BREAKDOWN CARD ─── */}
        <CartoonCard className="mb-6 p-5">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-xl bg-coral-subtle items-center justify-center mr-2">
                <Ionicons name="wallet-outline" size={16} color={colors.primary} />
              </View>
              <Text className="text-text-main text-base font-black">
                Spendable Cash Breakdown
              </Text>
            </View>
            <View className="bg-coral-subtle px-2.5 py-0.5 rounded-full border border-border-card">
              <Text className="text-primary text-[11px] font-black uppercase">Live</Text>
            </View>
          </View>

          <View className="flex-row gap-2.5 pt-1">
            <View className="flex-1 bg-emerald-subtle p-3 rounded-2xl border border-emerald-border">
              <Text className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                Total Inflow
              </Text>
              <Text className="text-emerald text-sm font-black" numberOfLines={1}>
                {formatMoney(spendableCashSummary.totalIncomeCents)}
              </Text>
            </View>

            <View className="flex-1 bg-gold-subtle p-3 rounded-2xl border border-gold-border">
              <Text className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                Goal Reserved
              </Text>
              <Text className="text-gold-dark text-sm font-black" numberOfLines={1}>
                {formatMoney(spendableCashSummary.totalGoalReservedCents)}
              </Text>
            </View>

            <View className="flex-1 bg-coral-subtle p-3 rounded-2xl border border-primary-light">
              <Text className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                Free Spendable
              </Text>
              <Text className="text-primary text-sm font-black" numberOfLines={1}>
                {formatMoney(spendableCashSummary.unallocatedSpendableCents)}
              </Text>
            </View>
          </View>
        </CartoonCard>

        {/* Smart Nudge Banner */}
        <CartoonCard variant="subtle" className="mb-6 p-5 flex-row items-start">
          <View className="w-11 h-11 rounded-2xl bg-primary items-center justify-center mr-3.5 mt-0.5 shadow-sm">
            <Ionicons name="sparkles" size={22} color={colors.white} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text className="text-text-brand text-xs font-black uppercase tracking-wider">
                Smart Nudge
              </Text>
              <View className="bg-coral-subtle px-2 py-0.5 rounded-full border border-border-card">
                <Text className="text-primary text-[10px] font-black uppercase">
                  {projectionInfo.paceLabel}
                </Text>
              </View>
            </View>
            <Text className="text-text-main text-base font-black mt-1">
              {projectionInfo.title}
            </Text>
            <Text className="text-text-muted text-xs font-bold mt-1 leading-4">
              {projectionInfo.message}
            </Text>
          </View>
        </CartoonCard>

        {/* Savings Velocity Card */}
        <CartoonCard className="mb-6 p-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-text-main text-base font-black">
              Savings Velocity
            </Text>
            <View className="bg-coral-subtle px-3 py-1 rounded-full border border-border-card">
              <Text className="text-primary text-xs font-black">Past 30 Days</Text>
            </View>
          </View>

          <View className="flex-row items-baseline mb-3">
            <Text className="text-primary text-3xl font-black">{velocityFormatted}</Text>
            <Text className="text-text-muted text-xs font-bold ml-2">
              net cashflow accumulated
            </Text>
          </View>

          {/* Flat Progress Bar */}
          <View className="h-3 bg-bg-app rounded-full overflow-hidden mb-3 border border-border-card">
            <View
              style={{
                width: `${velocityPercent}%`,
              }}
              className="h-full bg-primary rounded-full"
            />
          </View>

          <View className="bg-coral-subtle p-2.5 rounded-2xl flex-row items-center border border-border-card">
            <Text className="text-sm mr-1.5">🔥</Text>
            <Text className="text-text-main text-xs font-bold flex-1">
              {past30DaysVelocityCents > 0
                ? "You are maintaining positive net cashflow towards your targets!"
                : "Record new income and allocate savings to boost your velocity score."}
            </Text>
          </View>
        </CartoonCard>

        {/* Financial Health Metrics Grid */}
        <Text className="text-text-main text-lg font-black tracking-tight mb-4">
          Financial Health Metrics
        </Text>

        <View className="flex-row gap-4 mb-6">
          {/* Savings Rate Card */}
          <CartoonCard variant="income" className="flex-1 p-4">
            <View className="w-10 h-10 rounded-2xl bg-emerald items-center justify-center mb-2">
              <MaterialCommunityIcons name="trending-up" size={22} color={colors.white} />
            </View>
            <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-0.5">
              Savings Rate
            </Text>
            <Text className="text-emerald text-2xl font-black">
              {savingsRatePercent}%
            </Text>
            <View className="bg-white-overlay-80 self-start px-2 py-0.5 rounded-md mt-2 border border-emerald-border">
              <Text className="text-emerald-dark text-[10px] font-black">
                {savingsRatePercent >= 20 ? "Super Saver 🚀" : "Building Momentum"}
              </Text>
            </View>
          </CartoonCard>

          {/* Savings Streak Card */}
          <CartoonCard variant="gold" className="flex-1 p-4">
            <View className="w-10 h-10 rounded-2xl bg-gold items-center justify-center mb-2">
              <Ionicons name="flame" size={22} color={colors.white} />
            </View>
            <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-0.5">
              Savings Streak
            </Text>
            <Text className="text-gold-dark text-2xl font-black">
              {savingsStreakWeeks} Wks
            </Text>
            <View className={`self-start px-2 py-0.5 rounded-md mt-2 border ${
              savingsStreakWeeks > 0
                ? "bg-white-overlay-80 border-gold-border"
                : "bg-bg-app border-border-card"
            }`}>
              <Text className={`text-[10px] font-black ${
                savingsStreakWeeks > 0 ? "text-gold-dark" : "text-text-muted"
              }`}>
                {savingsStreakWeeks > 0 ? "Active Saver 🔥" : "No Active Streak"}
              </Text>
            </View>
          </CartoonCard>
        </View>

        {/* ─── SECTION 2: MONTHLY CATEGORY BUDGETS (ENVELOPE VIEW) ─── */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-xl bg-coral-subtle items-center justify-center mr-2">
                <Ionicons name="pricetags-outline" size={16} color={colors.primary} />
              </View>
              <Text className="text-text-main text-lg font-black tracking-tight">
                Monthly Category Budgets 🏷️
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsCategoryManagerVisible(true)}
              className="bg-coral-subtle px-3 py-1.5 rounded-full border border-border-card flex-row items-center"
            >
              <Ionicons name="settings-outline" size={12} color={colors.primary} />
              <Text className="text-primary text-xs font-black ml-1">
                Manage
              </Text>
            </TouchableOpacity>
          </View>

          {budgetedCategories.length === 0 ? (
            <CartoonCard className="p-5 items-center">
              <View className="w-12 h-12 rounded-2xl bg-coral-subtle items-center justify-center mb-2">
                <Ionicons name="pie-chart-outline" size={24} color={colors.primary} />
              </View>
              <Text className="text-text-main text-sm font-black mb-1">
                No Category Budgets Set
              </Text>
              <Text className="text-text-muted text-xs font-bold text-center mb-4">
                Set monthly spending limits for expense categories to track your envelopes in real-time.
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsCategoryManagerVisible(true)}
                className="bg-primary px-4 py-2.5 rounded-2xl border-2 border-primary-light border-b-4 border-b-primary-dark flex-row items-center"
              >
                <Ionicons name="add-circle" size={16} color={colors.white} />
                <Text className="text-white text-xs font-black ml-1.5 uppercase">
                  + Set Category Budgets
                </Text>
              </TouchableOpacity>
            </CartoonCard>
          ) : (
            <View style={{ gap: 12 }}>
              {budgetedCategories.map((budget) => {
                const paletteToken = (budget.colorCode as PaletteToken) || "primary";
                const palette = PALETTE_CONFIG[paletteToken] || PALETTE_CONFIG.primary;
                const percentage = budget.percentageUsed;
                const isOver = budget.isOverBudget;
                const overAmount = budget.spentCents - budget.budgetCents;

                let pacingBarClass = "bg-emerald";
                let pacingTextClass = "text-emerald";
                if (percentage >= 100) {
                  pacingBarClass = "bg-rose";
                  pacingTextClass = "text-rose";
                } else if (percentage >= 75) {
                  pacingBarClass = "bg-gold";
                  pacingTextClass = "text-gold-dark";
                }

                return (
                  <CartoonCard key={budget.categoryId} className="p-4">
                    <View className="flex-row items-center justify-between mb-2.5">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View
                          className={`will-change-variable w-10 h-10 rounded-2xl items-center justify-center mr-3 border-2 border-b-4 ${palette.bgSubtleClass} ${palette.borderClass}`}
                        >
                          {budget.iconFamily === "MaterialCommunityIcons" ? (
                            <MaterialCommunityIcons
                              name={(budget.iconName as any) || "tag-outline"}
                              size={18}
                              color={palette.colorCode}
                            />
                          ) : (
                            <Ionicons
                              name={(budget.iconName as any) || "pricetag-outline"}
                              size={18}
                              color={palette.colorCode}
                            />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-text-main text-sm font-black">
                            {budget.categoryName}
                          </Text>
                          <Text className="text-text-muted text-xs font-bold mt-0.5">
                            Spent {formatMoney(budget.spentCents)} of {formatMoney(budget.budgetCents)}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className={`will-change-variable text-sm font-black ${pacingTextClass}`}>
                          {percentage}%
                        </Text>
                        <Text className="text-text-muted text-[10px] font-bold">
                          {isOver ? "Over Limit" : `${formatMoney(budget.remainingCents)} left`}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View className="h-2.5 bg-bg-app rounded-full overflow-hidden mb-1 border border-border-card">
                      <View
                        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                        className={`will-change-variable h-full rounded-full ${pacingBarClass}`}
                      />
                    </View>

                    {/* Over Budget Banner */}
                    {isOver && (
                      <View className="mt-2 bg-rose-subtle px-3 py-1.5 rounded-xl border border-rose-border flex-row items-center">
                        <Ionicons name="warning" size={14} color={colors.rose} />
                        <Text className="text-rose-dark text-xs font-black ml-1.5">
                          ⚠️ Over budget by {formatMoney(overAmount)}
                        </Text>
                      </View>
                    )}
                  </CartoonCard>
                );
              })}
            </View>
          )}
        </View>

        {/* Smart Tips / Gamified Challenge Card */}
        <CartoonCard variant="accent" className="p-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="bg-white-overlay-20 px-3 py-1 rounded-full border border-white-overlay-20">
              <Text className="text-white text-xs font-black uppercase tracking-wider">
                Weekly Challenge
              </Text>
            </View>
            <Text className="text-white text-xs font-bold">Coming Soon</Text>
          </View>
          <Text className="text-white text-lg font-black mt-1 mb-1">
            Zero Takeout Weekend 🍱
          </Text>
          <Text className="text-white-overlay-80 text-xs font-bold leading-4 mb-1">
            Cook at home this weekend to boost your auto-allocation to your active goals!
          </Text>
        </CartoonCard>
      </ScrollView>

      {/* Category Manager Modal Sibling */}
      <CategoryManagerModal
        visible={isCategoryManagerVisible}
        onClose={() => setIsCategoryManagerVisible(false)}
      />
    </View>
  );
}


