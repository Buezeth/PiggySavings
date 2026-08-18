import CartoonCard from "@/components/CartoonCard";
import { colors } from "@/constants/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { goals, transactions, cashflowSummary } = useApp();

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
    const incomeCents = transactions
      .filter(
        (t) => t.type === "income" && new Date(t.transaction_date) >= cutoffDate
      )
      .reduce((sum, t) => sum + t.amount_cents, 0);
    const expenseCents = transactions
      .filter(
        (t) => t.type === "expense" && new Date(t.transaction_date) >= cutoffDate
      )
      .reduce((sum, t) => sum + t.amount_cents, 0);

    return Math.max(0, incomeCents - expenseCents);
  }, [transactions]);

  // 3. Weekly Streak Calculation (Distinct weeks with transactions)
  const savingsStreakWeeks = useMemo(() => {
    if (transactions.length === 0) return 1;
    const uniqueWeeks = new Set<string>();
    for (const t of transactions) {
      const d = new Date(t.transaction_date);
      const year = d.getFullYear();
      const weekNum = Math.ceil(
        ((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7
      );
      uniqueWeeks.add(`${year}-W${weekNum}`);
    }
    return Math.max(1, uniqueWeeks.size);
  }, [transactions]);

  // 4. Primary Goal Projected Completion Date
  const projectionInfo = useMemo(() => {
    if (goals.length === 0) {
      return {
        title: "Create a Goal",
        message: "Add your first savings goal to get smart pace estimates!",
        daysAhead: 0,
      };
    }

    const primaryGoal = goals[0];
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
      };
    }

    // Daily savings rate based on 30-day velocity
    const dailyVelocityCents = past30DaysVelocityCents / 30;
    if (dailyVelocityCents <= 0) {
      return {
        title: `Saving for ${primaryGoal.title}`,
        message: `Keep allocating deposits to reach your $${(
          primaryGoal.target_amount_cents / 100
        ).toLocaleString()} target.`,
        daysAhead: 0,
      };
    }

    const daysRemaining = Math.ceil(remainingCents / dailyVelocityCents);
    return {
      title: `On Track for ${primaryGoal.title}!`,
      message: `At your current velocity of $${Math.round(
        past30DaysVelocityCents / 100
      )}/mo, you are projected to reach your goal in ~${daysRemaining} days!`,
      daysAhead: 14,
    };
  }, [goals, past30DaysVelocityCents]);

  const velocityDollars = (past30DaysVelocityCents / 100).toLocaleString(
    undefined,
    { minimumFractionDigits: 0, maximumFractionDigits: 0 }
  );

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
                  Active Pace
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
            <Text className="text-primary text-3xl font-black">${velocityDollars}</Text>
            <Text className="text-text-muted text-xs font-bold ml-2">
              net cashflow accumulated
            </Text>
          </View>

          {/* Flat Progress Bar */}
          <View className="h-3 bg-bg-app rounded-full overflow-hidden mb-3 border border-border-card">
            <View
              style={{
                width: `${Math.min(
                  Math.max(
                    Math.round(
                      (past30DaysVelocityCents / (1000 * 100 || 1)) * 100
                    ),
                    10
                  ),
                  100
                )}%`,
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
            <View className="bg-white-overlay-80 self-start px-2 py-0.5 rounded-md mt-2 border border-gold-border">
              <Text className="text-gold-dark text-[10px] font-black">
                Active Saver 🔥
              </Text>
            </View>
          </CartoonCard>
        </View>

        {/* Smart Tips / Gamified Challenge Card */}
        <CartoonCard variant="accent" className="p-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="bg-white-overlay-20 px-3 py-1 rounded-full border border-white-overlay-20">
              <Text className="text-white text-xs font-black uppercase tracking-wider">
                Weekly Challenge
              </Text>
            </View>
            <Text className="text-white text-xs font-bold">In Progress</Text>
          </View>
          <Text className="text-white text-lg font-black mt-1 mb-1">
            Zero Takeout Weekend 🍱
          </Text>
          <Text className="text-white-overlay-80 text-xs font-bold leading-4 mb-3">
            Cook at home this weekend to boost your auto-allocation to your active goals!
          </Text>
          <View className="h-2.5 bg-white-overlay-20 rounded-full overflow-hidden">
            <View className="h-full bg-white rounded-full w-[70%]" />
          </View>
        </CartoonCard>
      </ScrollView>
    </View>
  );
}


