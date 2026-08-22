import { CartoonCard } from "@/components/CartoonCard";
import { GoalLimitModal } from "@/components/GoalLimitModal";
import { Hero } from "@/components/Hero";
import { IconPickerModal } from "@/components/IconPickerModal";
import { RecurringReviewModal } from "@/components/RecurringReviewModal";
import { TipJarModal } from "@/components/TipJarModal";
import { getCurrency, parseCurrencyToCents } from "@/constants/currencies";
import { getIconById, ICON_REGISTRY, IconDefinition } from "@/constants/iconRegistry";
import { colors } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { HeroData, TimePeriod } from "@/data/homeData";
import { CardVariant } from "@/services/db/types";
import { canCreateNewGoal } from "@/services/monetization/entitlementGuard";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CardVariantOption {
  id: CardVariant;
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

const CARD_VARIANTS: CardVariantOption[] = [
  {
    id: "card",
    label: "Classic",
    bgClass: "bg-bg-card",
    borderClass: "border-border-card border-b-border-card-dark",
    textClass: "text-text-main",
  },
  {
    id: "subtle",
    label: "Coral",
    bgClass: "bg-coral-subtle",
    borderClass: "border-primary-light border-b-primary-dark",
    textClass: "text-primary",
  },
  {
    id: "gold",
    label: "Gold",
    bgClass: "bg-gold-subtle",
    borderClass: "border-gold-border border-b-gold-border-dark",
    textClass: "text-gold-dark",
  },
  {
    id: "income",
    label: "Emerald",
    bgClass: "bg-emerald-subtle",
    borderClass: "border-emerald-border border-b-emerald-border-dark",
    textClass: "text-emerald-dark",
  },
];

const TAG_SUGGESTIONS = [
  "🎯 Savings",
  "✈️ Travel",
  "💻 Tech",
  "🛡️ Emergency",
  "🏠 Home",
  "🎓 Education",
  "🚗 Vehicle",
  "💍 Special",
];

export default function GoalsHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    goals,
    transactions,
    cashflowSummary,
    pendingRecurringSchedules,
    createGoal,
    currencyCode,
    currencySymbol,
    formatMoney,
  } = useApp();

  const activeCurrency = useMemo(() => getCurrency(currencyCode), [currencyCode]);

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("30D");
  const [isGoalLimitModalVisible, setIsGoalLimitModalVisible] = useState(false);
  const [isTipJarModalVisible, setIsTipJarModalVisible] = useState(false);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [goalLimitInfo, setGoalLimitInfo] = useState({
    currentCount: 0,
    maxLimit: 3,
  });

  // Add Goal Modal State
  const [isAddGoalModalVisible, setIsAddGoalModalVisible] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalCategory, setNewGoalCategory] = useState("🎯 Savings");
  const [newGoalCardVariant, setNewGoalCardVariant] = useState<CardVariant>("card");
  const [isNewGoalFeatured, setIsNewGoalFeatured] = useState(false);
  const [selectedGoalIcon, setSelectedGoalIcon] = useState<IconDefinition>(
    getIconById("milestones-target") || ICON_REGISTRY[0]
  );
  const [isIconPickerVisible, setIsIconPickerVisible] = useState(false);
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);
  const isSubmittingGoalRef = React.useRef(false);

  // Dynamic calculations for Hero and Metrics
  const heroData: HeroData = useMemo(() => {
    // 1. Total Saved and Total Target across active goals
    const totalSavedCents = goals.reduce(
      (sum, g) => sum + (g.current_amount_cents || 0),
      0
    );
    const totalTargetCents = goals.reduce(
      (sum, g) => sum + (g.target_amount_cents || 0),
      0
    );

    // Format currency helpers
    const formatCents = (cents: number): string => {
      return formatMoney(cents, { compact: true });
    };

    // 2. Velocity calculation based on transactions in selected period
    const now = new Date();
    const periodDays =
      selectedPeriod === "7D" ? 7 : selectedPeriod === "30D" ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - periodDays * 86400000);

    const periodIncomeCents = transactions
      .filter(
        (t) => t.type === "income" && new Date(t.transaction_date) >= cutoffDate
      )
      .reduce((sum, t) => sum + t.amount_cents, 0);

    const periodExpenseCents = transactions
      .filter(
        (t) => t.type === "expense" && new Date(t.transaction_date) >= cutoffDate
      )
      .reduce((sum, t) => sum + t.amount_cents, 0);

    const periodNetSavingsCents = periodIncomeCents - periodExpenseCents;

    // 3. Health Score calculation (0-100)
    let healthScore = 75; // Baseline healthy score
    if (cashflowSummary.totalIncomeCents > 0) {
      const savingsRate =
        (cashflowSummary.netSavingsCents / cashflowSummary.totalIncomeCents) *
        100;
      if (savingsRate > 30) healthScore = 92;
      else if (savingsRate > 20) healthScore = 85;
      else if (savingsRate > 10) healthScore = 78;
      else if (savingsRate > 0) healthScore = 65;
      else healthScore = 48;
    } else if (goals.length > 0 && totalSavedCents > 0) {
      healthScore = 80;
    }

    const targetProgressPercent =
      totalTargetCents > 0
        ? Math.round((totalSavedCents / totalTargetCents) * 100)
        : 0;

    let scoreTrendText = "Healthy savings pace";
    let scoreTrendDirection: "up" | "down" | "neutral" = "up";
    if (healthScore >= 80) {
      scoreTrendText = "Excellent savings pace";
      scoreTrendDirection = "up";
    } else if (healthScore >= 65) {
      scoreTrendText = "Moderate savings pace";
      scoreTrendDirection = "neutral";
    } else {
      scoreTrendText = "Savings pace needs attention";
      scoreTrendDirection = "down";
    }

    const totalSavedTrend: "up" | "down" | "neutral" =
      totalSavedCents > 0 ? "up" : "neutral";

    const targetGoalTrend: "up" | "down" | "neutral" =
      targetProgressPercent >= 50
        ? "up"
        : targetProgressPercent > 0
          ? "neutral"
          : "down";

    const velocityTrend: "up" | "down" | "neutral" =
      periodNetSavingsCents > 0
        ? "up"
        : periodNetSavingsCents === 0
          ? "neutral"
          : "down";

    const velocityPrefix =
      periodNetSavingsCents > 0
        ? "+"
        : periodNetSavingsCents < 0
          ? "-"
          : "";

    return {
      title: "Savings Report",
      subtitle: "piggysavings.app",
      healthScore,
      maxHealthScore: 100,
      scoreTrend: {
        text: scoreTrendText,
        direction: scoreTrendDirection,
      },
      metrics: [
        {
          id: "total_saved",
          label: "Total Saved",
          value: formatCents(totalSavedCents),
          change: `${goals.length} Active`,
          trendDirection: totalSavedTrend,
        },
        {
          id: "target_goal",
          label: "Target Goal",
          value: formatCents(totalTargetCents),
          change: `${targetProgressPercent}%`,
          trendDirection: targetGoalTrend,
        },
        {
          id: "velocity",
          label: "Velocity",
          value: `${velocityPrefix}${formatMoney(Math.abs(periodNetSavingsCents), { compact: true })}`,
          change: selectedPeriod,
          trendDirection: velocityTrend,
        },
      ],
    };
  }, [goals, transactions, cashflowSummary, selectedPeriod, formatMoney]);

  // Featured Goal Selection: Prioritizes explicitly pinned featured goal, otherwise first goal
  const featuredGoal = useMemo(() => {
    if (goals.length === 0) return null;
    const explicitFeatured = goals.find((g) => g.priority_label === "Featured Goal");
    return explicitFeatured || goals[0];
  }, [goals]);

  const featuredProgressPercent = featuredGoal
    ? Math.min(
      Math.round(
        ((featuredGoal.current_amount_cents || 0) /
          (featuredGoal.target_amount_cents || 1)) *
        100
      ),
      100
    )
    : 0;

  // Handler for adding a new goal with limit guard
  const handleAddNewGoalPress = async () => {
    try {
      const check = await canCreateNewGoal();
      if (!check.allowed) {
        setGoalLimitInfo({
          currentCount: check.currentCount,
          maxLimit: check.maxLimit,
        });
        setIsGoalLimitModalVisible(true);
        return;
      }
      setIsAddGoalModalVisible(true);
    } catch (err) {
      console.error("Failed to evaluate goal limit:", err);
      setIsAddGoalModalVisible(true);
    }
  };

  // Submit new goal
  const handleSaveGoal = async () => {
    if (isSubmittingGoalRef.current) {
      return;
    }
    isSubmittingGoalRef.current = true;

    try {
      const trimmedTitle = newGoalTitle.trim();

      if (!trimmedTitle) {
        Alert.alert("Goal Title Required", "Please enter a name for your savings goal.");
        return;
      }

      const parsedResult = parseCurrencyToCents(newGoalTarget, currencyCode);
      if (!parsedResult) {
        Alert.alert("Invalid Target", "Please enter a valid positive target amount.");
        return;
      }

      if (parsedResult.error) {
        Alert.alert("Invalid Target", parsedResult.error);
        return;
      }

      setIsSubmittingGoal(true);
      const targetCents = parsedResult.cents;
      await createGoal({
        title: trimmedTitle,
        target_amount_cents: targetCents,
        current_amount_cents: 0,
        category_tag: newGoalCategory.trim() || "🎯 Savings",
        icon_name: selectedGoalIcon.name,
        icon_family: selectedGoalIcon.family,
        card_variant: newGoalCardVariant,
        priority_label: isNewGoalFeatured ? "Featured Goal" : "Active Goal",
      });

      setNewGoalTitle("");
      setNewGoalTarget("");
      setNewGoalCategory("🎯 Savings");
      setNewGoalCardVariant("card");
      setIsNewGoalFeatured(false);
      setSelectedGoalIcon(getIconById("milestones-target") || ICON_REGISTRY[0]);
      setIsAddGoalModalVisible(false);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      isSubmittingGoalRef.current = false;
      setIsSubmittingGoal(false);
    }
  };

  return (
    <View className="flex-1 bg-bg-app">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {/* ─── MODULAR HERO COMPONENT ─── */}
        <Hero
          data={heroData}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
          onNotificationPress={() => router.push("/insights")}
        />

        {/* ─── PENDING RECURRING REVIEW BANNER ─── */}
        {pendingRecurringSchedules.length > 0 && (
          <View className="px-5 mt-6">
            <CartoonCard
              variant="gold"
              interactive
              onPress={() => setIsReviewModalVisible(true)}
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-1 mr-2">
                <View className="flex-row items-center mb-1">
                  <View className="w-5 h-5 rounded-full bg-gold items-center justify-center mr-1.5 shadow-sm">
                    <Ionicons name="flash" size={12} color={colors.white} />
                  </View>
                  <Text className="text-gold-dark text-xs font-black uppercase tracking-wider">
                    ⚡ {pendingRecurringSchedules.length} Recurring Bill{pendingRecurringSchedules.length === 1 ? "" : "s"} Due for Review
                  </Text>
                </View>
                <Text className="text-text-main text-xs font-bold" numberOfLines={1}>
                  Review amounts for {pendingRecurringSchedules[0].title}{pendingRecurringSchedules.length > 1 ? " and more." : "."}
                </Text>
              </View>

              <View className="bg-gold px-3 py-2 rounded-2xl border-2 border-gold-light border-b-4 border-b-gold-dark">
                <Text className="text-white text-xs font-black uppercase tracking-wider">
                  Review ({pendingRecurringSchedules.length})
                </Text>
              </View>
            </CartoonCard>
          </View>
        )}

        {/* ─── SECTION: FEATURED GOAL ─── */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-main text-lg font-black tracking-tight">
              Featured Goal ⭐
            </Text>
            <TouchableOpacity
              onPress={handleAddNewGoalPress}
              activeOpacity={0.8}
              className="bg-coral-subtle px-3 py-1 rounded-full border border-border-card flex-row items-center"
            >
              <Ionicons name="add-circle" size={14} color={colors.primary} />
              <Text className="text-primary text-xs font-black ml-1">
                Add Goal
              </Text>
            </TouchableOpacity>
          </View>

          {featuredGoal ? (
            <CartoonCard variant="subtle" className="p-5 mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <View className="bg-coral-subtle px-2.5 py-0.5 rounded-full border border-border-card">
                  <Text className="text-primary text-[10px] font-black uppercase tracking-wide">
                    {featuredGoal.category_tag || "🎯 Savings"}
                  </Text>
                </View>
                <View className="bg-primary px-3 py-1 rounded-full shadow-sm">
                  <Text className="text-white text-[10px] font-black uppercase tracking-wider">
                    🔥 {featuredGoal.priority_label || "Active"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 rounded-2xl bg-primary items-center justify-center mr-3.5 shadow-sm">
                  {featuredGoal.icon_family === "MaterialCommunityIcons" ? (
                    <MaterialCommunityIcons
                      name={(featuredGoal.icon_name as any) || "piggy-bank"}
                      size={24}
                      color={colors.white}
                    />
                  ) : (
                    <Ionicons
                      name={(featuredGoal.icon_name as any) || "sparkles"}
                      size={24}
                      color={colors.white}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-text-main text-base font-black">
                    {featuredGoal.title}
                  </Text>
                  <Text className="text-text-muted text-xs font-bold mt-0.5">
                    {featuredGoal.target_date
                      ? `Target: ${featuredGoal.target_date}`
                      : "In Progress"}
                  </Text>
                </View>
              </View>

              {/* Progress Bar & Readout */}
              <View className="mb-3">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-text-muted text-xs font-bold">Progress</Text>
                  <Text className="text-primary text-xs font-black">
                    {formatMoney(featuredGoal.current_amount_cents)}{" "}
                    /{" "}
                    {formatMoney(featuredGoal.target_amount_cents)}{" "}
                    ({featuredProgressPercent}%)
                  </Text>
                </View>
                <View className="h-3 bg-bg-app rounded-full overflow-hidden border border-border-card">
                  <View
                    style={{ width: `${featuredProgressPercent}%` }}
                    className="h-full bg-primary rounded-full"
                  />
                </View>
              </View>

              {/* Encouragement Banner */}
              <View className="bg-white-overlay-80 p-2.5 rounded-2xl border border-border-card flex-row items-center">
                <Text className="text-text-main text-xs font-bold flex-1">
                  {featuredProgressPercent >= 100
                    ? "🏆 Goal completed! Congratulations on reaching this milestone!"
                    : featuredProgressPercent >= 75
                      ? "🎉 Almost there! Keep up the great savings pace."
                      : "💪 Every contribution brings you closer to your target!"}
                </Text>
              </View>
            </CartoonCard>
          ) : (
            <CartoonCard variant="card" className="p-6 mb-6 items-center justify-center">
              <View className="w-12 h-12 rounded-full bg-coral-subtle items-center justify-center mb-2">
                <MaterialCommunityIcons name="piggy-bank" size={28} color={colors.primary} />
              </View>
              <Text className="text-text-main text-base font-black mb-1">
                No Savings Goals Yet
              </Text>
              <Text className="text-text-muted text-xs font-bold text-center mb-4">
                Set up your first savings goal to start tracking progress and auto-allocations!
              </Text>
              <TouchableOpacity
                onPress={handleAddNewGoalPress}
                activeOpacity={0.85}
                className="bg-primary border-2 border-primary-light border-b-4 border-b-primary-dark px-5 py-2.5 rounded-2xl"
              >
                <Text className="text-white text-xs font-black uppercase">
                  + Create Your First Goal
                </Text>
              </TouchableOpacity>
            </CartoonCard>
          )}

          {/* ─── SECTION: ACTIVE SAVINGS GOALS ─── */}
          <Text className="text-text-main text-lg font-black tracking-tight mb-4">
            Active Savings Goals ({goals.length}) 🎯
          </Text>

          {goals.length === 0 ? (
            <CartoonCard className="p-5 mb-6 items-center">
              <Text className="text-text-muted text-xs font-bold">
                {'Tap "+ Add Goal" above to create savings goals.'}
              </Text>
            </CartoonCard>
          ) : (
            <View className="flex-row flex-wrap gap-3 mb-6">
              {goals.map((goal) => {
                const progressPercent = Math.min(
                  Math.round(
                    ((goal.current_amount_cents || 0) /
                      (goal.target_amount_cents || 1)) *
                    100
                  ),
                  100
                );

                const variant = goal.card_variant || "card";
                const isGold = variant === "gold";
                const isIncome = variant === "income";
                const isSubtle = variant === "subtle";

                const iconBgClass = isGold
                  ? "will-change-variable bg-gold"
                  : isIncome
                    ? "will-change-variable bg-emerald"
                    : isSubtle
                      ? "will-change-variable bg-bg-accent"
                      : "will-change-variable bg-primary";

                const amountTextClass = isGold
                  ? "will-change-variable text-gold-dark"
                  : isIncome
                    ? "will-change-variable text-emerald-dark"
                    : "will-change-variable text-primary";

                const badgeBorderClass = isGold
                  ? "will-change-variable border-gold-border"
                  : isIncome
                    ? "will-change-variable border-emerald-border"
                    : "will-change-variable border-border-card";

                const progressFillClass = isGold
                  ? "will-change-variable bg-gold-dark"
                  : isIncome
                    ? "will-change-variable bg-emerald"
                    : "will-change-variable bg-primary";

                return (
                  <CartoonCard
                    key={goal.id}
                    variant={variant}
                    className="p-4 flex-1 min-w-[46%]"
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View
                        className={`w-10 h-10 rounded-2xl ${iconBgClass} items-center justify-center shadow-sm`}
                      >
                        {goal.icon_family === "MaterialCommunityIcons" ? (
                          <MaterialCommunityIcons
                            name={(goal.icon_name as any) || "piggy-bank"}
                            size={20}
                            color={colors.white}
                          />
                        ) : (
                          <Ionicons
                            name={(goal.icon_name as any) || "sparkles"}
                            size={20}
                            color={colors.white}
                          />
                        )}
                      </View>

                      <View
                        className={`bg-white-overlay-80 px-2 py-0.5 rounded-lg border ${badgeBorderClass}`}
                      >
                        <Text className={`${amountTextClass} text-[10px] font-black`}>
                          {progressPercent}%
                        </Text>
                      </View>
                    </View>

                    <Text
                      className="text-text-main text-sm font-black mb-0.5"
                      numberOfLines={1}
                    >
                      {goal.title}
                    </Text>
                    <Text className={`${amountTextClass} text-base font-black`}>
                      {formatMoney(goal.current_amount_cents)}
                    </Text>
                    <Text className="text-text-muted text-[11px] font-bold mb-3">
                      of {formatMoney(goal.target_amount_cents)} goal
                    </Text>

                    {/* Playful Progress Bar */}
                    <View className="h-2.5 bg-white-overlay-70 rounded-full overflow-hidden border border-white-overlay-20">
                      <View
                        style={{ width: `${progressPercent}%` }}
                        className={`h-full ${progressFillClass} rounded-full`}
                      />
                    </View>
                  </CartoonCard>
                );
              })}
            </View>
          )}

          {/* ─── PIGGY SMART STREAK NUDGE (Playful Gamification Banner) ─── */}
          <CartoonCard
            variant="accent"
            className="p-5 mb-4 flex-row items-center justify-between"
            interactive
            onPress={() => router.push("/insights")}
          >
            <View className="flex-1 mr-3">
              <View className="flex-row items-center mb-1">
                <Text className="text-white text-xs font-black uppercase tracking-wider">
                  ⚡ Piggy Streak Booster
                </Text>
              </View>
              <Text className="text-white font-black text-sm leading-5">
                Keep logging transactions to power your smart insights and streak! 🔥
              </Text>
            </View>
            <View className="w-9 h-9 rounded-full bg-white-overlay-20 items-center justify-center border border-white-overlay-20">
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            </View>
          </CartoonCard>
        </View>
      </ScrollView>

      {/* ─── GOAL LIMIT INTERCEPTOR MODAL ─── */}
      <GoalLimitModal
        visible={isGoalLimitModalVisible}
        onClose={() => setIsGoalLimitModalVisible(false)}
        currentCount={goalLimitInfo.currentCount}
        maxLimit={goalLimitInfo.maxLimit}
        onUnlockedSlot={() => {
          setIsGoalLimitModalVisible(false);
          setIsAddGoalModalVisible(true);
        }}
        onOpenTipJar={() => {
          setIsGoalLimitModalVisible(false);
          setIsTipJarModalVisible(true);
        }}
      />

      {/* ─── SUPPORTER TIP JAR MODAL ─── */}
      <TipJarModal
        visible={isTipJarModalVisible}
        onClose={() => setIsTipJarModalVisible(false)}
        onSuccess={() => {
          setIsTipJarModalVisible(false);
          setIsAddGoalModalVisible(true);
        }}
      />

      {/* ─── ADD GOAL MODAL ─── */}
      <Modal
        visible={isAddGoalModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddGoalModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-black-overlay-60 justify-end"
        >
          <View
            style={{
              maxHeight: "90%",
              paddingBottom: Math.max(insets.bottom, 16),
            }}
            className="bg-bg-app rounded-t-[36px] border-t-2 border-border-card overflow-hidden"
          >
            {/* Modal Header */}
            <View className="p-4 border-b border-border-card flex-row items-center justify-between bg-bg-card">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center mr-2">
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </View>
                <Text className="text-text-main text-lg font-black tracking-tight">
                  Create Savings Goal
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsAddGoalModalVisible(false)}
                activeOpacity={0.7}
                className="w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center"
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="p-4"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View className="gap-4">
              {/* Goal Name & Icon Picker Row */}
              <View className="mb-2">
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-2">
                  Goal Name & Icon
                </Text>
                <View className="flex-row items-center gap-3">
                  {/* Interactive Icon Trigger Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsIconPickerVisible(true)}
                    className={`will-change-variable w-14 h-14 rounded-2xl items-center justify-center border-2 border-b-4 ${newGoalCardVariant === "gold"
                      ? "bg-gold border-gold-light border-b-gold-dark"
                      : newGoalCardVariant === "income"
                        ? "bg-emerald border-emerald-light border-b-emerald-dark"
                        : newGoalCardVariant === "subtle"
                          ? "bg-bg-accent border-primary-light border-b-primary-dark"
                          : "bg-primary border-primary-light border-b-primary-dark"
                      }`}
                  >
                    {selectedGoalIcon.family === "MaterialCommunityIcons" ? (
                      <MaterialCommunityIcons
                        name={selectedGoalIcon.name as any}
                        size={26}
                        color={colors.white}
                      />
                    ) : (
                      <Ionicons
                        name={selectedGoalIcon.name as any}
                        size={26}
                        color={colors.white}
                      />
                    )}
                  </TouchableOpacity>

                  {/* Goal Title Input */}
                  <View className="flex-1 bg-bg-card rounded-2xl px-3.5 py-3 border-2 border-border-card border-b-4 border-b-border-card-dark justify-center">
                    <TextInput
                      value={newGoalTitle}
                      onChangeText={setNewGoalTitle}
                      placeholder="e.g., Japan Vacation, Emergency Fund"
                      placeholderTextColor={colors.textMuted}
                      className="text-sm text-text-main font-black py-0"
                      maxLength={40}
                    />
                  </View>
                </View>
              </View>

              {/* Target Amount */}
              <View className="mb-2">
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-2">
                  Target Amount ({currencySymbol.trim()})
                </Text>
                <View className="bg-bg-card rounded-2xl p-3 border-2 border-border-card border-b-4 border-b-border-card-dark">
                  <TextInput
                    value={newGoalTarget}
                    onChangeText={setNewGoalTarget}
                    placeholder={activeCurrency.decimal_digits === 0 ? "1000" : "1000.00"}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    className="text-lg text-text-main font-black py-0"
                  />
                </View>
                {(activeCurrency.rounding > 0 || activeCurrency.decimal_digits === 0) && (
                  <Text className="text-text-muted text-[11px] font-bold mt-1">
                    {activeCurrency.rounding > 0
                      ? `Target rounds to nearest ${activeCurrency.rounding} step`
                      : "Zero-decimal currency"}
                  </Text>
                )}
              </View>

              {/* Card Variant Selector (4 tactile swatches) */}
              <View className="mb-2">
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-2">
                  Card Style Variant
                </Text>
                <View className="flex-row justify-between gap-2">
                  {CARD_VARIANTS.map((v) => {
                    const isSelected = newGoalCardVariant === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        activeOpacity={0.8}
                        onPress={() => setNewGoalCardVariant(v.id)}
                        className={`will-change-variable flex-1 p-2.5 rounded-2xl items-center border-2 border-b-4 ${v.bgClass} ${v.borderClass} ${isSelected ? "opacity-100" : "opacity-70"
                          }`}
                      >
                        <Text
                          className={`will-change-variable text-[11px] font-black mb-1 ${v.textClass}`}
                        >
                          {v.label}
                        </Text>
                        <View
                          className={`will-change-variable w-5 h-5 rounded-full items-center justify-center ${isSelected ? "bg-primary" : "bg-bg-app"
                            }`}
                        >
                          {isSelected && (
                            <Ionicons name="checkmark" size={12} color={colors.white} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Category Tag Input with Suggestion Chips */}
              <View className="mb-4">
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-2">
                  Category Tag
                </Text>
                <View className="bg-bg-card rounded-2xl px-3.5 py-2.5 border-2 border-border-card border-b-4 border-b-border-card-dark mb-2.5">
                  <TextInput
                    value={newGoalCategory}
                    onChangeText={setNewGoalCategory}
                    placeholder="e.g., ✈️ Travel, 🏠 Home"
                    placeholderTextColor={colors.textMuted}
                    className="text-sm text-text-main font-bold py-0"
                    maxLength={24}
                  />
                </View>

                {/* Preset Suggestions */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {TAG_SUGGESTIONS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      activeOpacity={0.75}
                      onPress={() => setNewGoalCategory(tag)}
                      className={`will-change-variable px-3 py-1.5 rounded-full border-2 border-b-4 ${newGoalCategory === tag
                        ? "bg-coral-subtle border-primary-light border-b-primary-dark"
                        : "bg-bg-card border-border-card border-b-border-card-dark"
                        }`}
                    >
                      <Text
                        className={`will-change-variable text-xs font-black ${newGoalCategory === tag ? "text-primary" : "text-text-muted"
                          }`}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Set as Featured Goal Toggle */}
              <CartoonCard className="mb-2 p-3.5 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-9 h-9 rounded-xl bg-gold-subtle border border-gold-border items-center justify-center mr-2.5">
                    <Ionicons name="star" size={18} color={colors.goldDark} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-main text-xs font-black">
                      Set as Featured Goal ⭐
                    </Text>
                    <Text className="text-text-muted text-[11px] font-bold">
                      Pins this goal to the top of your dashboard
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isNewGoalFeatured}
                  onValueChange={setIsNewGoalFeatured}
                  trackColor={{ false: colors.mutedTrack, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </CartoonCard>

              {/* Live Goal Card Preview */}
              <View className="mb-2">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-text-muted text-xs font-black uppercase tracking-wider">
                    Live Card Preview
                  </Text>
                  <Text className="text-primary text-[11px] font-bold">
                    What your goal card looks like
                  </Text>
                </View>

                {(() => {
                  const parsed = parseCurrencyToCents(newGoalTarget, currencyCode);
                  const targetCents = parsed?.cents || 100000;
                  const isGold = newGoalCardVariant === "gold";
                  const isIncome = newGoalCardVariant === "income";
                  const isSubtle = newGoalCardVariant === "subtle";

                  const iconBgClass = isGold
                    ? "will-change-variable bg-gold"
                    : isIncome
                    ? "will-change-variable bg-emerald"
                    : isSubtle
                    ? "will-change-variable bg-bg-accent"
                    : "will-change-variable bg-primary";

                  const amountTextClass = isGold
                    ? "will-change-variable text-gold-dark"
                    : isIncome
                    ? "will-change-variable text-emerald-dark"
                    : "will-change-variable text-primary";

                  const badgeBorderClass = isGold
                    ? "will-change-variable border-gold-border"
                    : isIncome
                    ? "will-change-variable border-emerald-border"
                    : "will-change-variable border-border-card";

                  const progressFillClass = isGold
                    ? "will-change-variable bg-gold-dark"
                    : isIncome
                    ? "will-change-variable bg-emerald"
                    : "will-change-variable bg-primary";

                  return (
                    <CartoonCard variant={newGoalCardVariant} className="p-4">
                      <View className="flex-row items-center justify-between mb-3">
                        <View
                          className={`w-10 h-10 rounded-2xl ${iconBgClass} items-center justify-center shadow-sm`}
                        >
                          {selectedGoalIcon.family === "MaterialCommunityIcons" ? (
                            <MaterialCommunityIcons
                              name={selectedGoalIcon.name as any}
                              size={20}
                              color={colors.white}
                            />
                          ) : (
                            <Ionicons
                              name={selectedGoalIcon.name as any}
                              size={20}
                              color={colors.white}
                            />
                          )}
                        </View>

                        <View className="flex-row items-center gap-1.5">
                          {isNewGoalFeatured && (
                            <View className="bg-gold px-2 py-0.5 rounded-lg border border-gold-dark">
                              <Text className="text-white text-[10px] font-black">
                                ⭐ Featured
                              </Text>
                            </View>
                          )}
                          <View
                            className={`bg-white-overlay-80 px-2 py-0.5 rounded-lg border ${badgeBorderClass}`}
                          >
                            <Text className={`${amountTextClass} text-[10px] font-black`}>
                              0%
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Text
                        className="text-text-main text-sm font-black mb-0.5"
                        numberOfLines={1}
                      >
                        {newGoalTitle.trim() || "Your Goal Title"}
                      </Text>
                      <Text className={`${amountTextClass} text-base font-black`}>
                        {formatMoney(0)}
                      </Text>
                      <Text className="text-text-muted text-[11px] font-bold mb-3">
                        of {formatMoney(targetCents)} goal
                      </Text>

                      {/* Playful Progress Bar Preview */}
                      <View className="h-2.5 bg-white-overlay-70 rounded-full overflow-hidden border border-white-overlay-20">
                        <View
                          style={{ width: "6%" }}
                          className={`h-full ${progressFillClass} rounded-full`}
                        />
                      </View>
                    </CartoonCard>
                  );
                })()}
              </View>

              {/* Submit Button */}
              <View className="pt-2 pb-6">
                <TouchableOpacity
                  onPress={handleSaveGoal}
                  disabled={isSubmittingGoal}
                  activeOpacity={0.85}
                  className="bg-primary border-2 border-primary-light border-b-4 border-b-primary-dark rounded-2xl py-3.5 items-center justify-center"
                >
                  <Text className="text-white text-sm font-black uppercase tracking-wider">
                    {isSubmittingGoal ? "Creating..." : "Save Goal 🚀"}
                  </Text>
                </TouchableOpacity>
              </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── ICON PICKER MODAL FOR GOALS ─── */}
      <IconPickerModal
        visible={isIconPickerVisible}
        onClose={() => setIsIconPickerVisible(false)}
        selectedIconName={selectedGoalIcon.name}
        onSelectIcon={(icon) => {
          setSelectedGoalIcon(icon);
          setIsIconPickerVisible(false);
        }}
        title="Choose Goal Icon"
      />

      {/* ─── RECURRING BILLS REVIEW MODAL ─── */}
      <RecurringReviewModal
        visible={isReviewModalVisible}
        onClose={() => setIsReviewModalVisible(false)}
      />
    </View>
  );
}