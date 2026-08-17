import CartoonCard from "@/components/CartoonCard";
import Hero from "@/components/Hero";
import { colors } from "@/constants/theme";
import { homeDashboardData, TimePeriod } from "@/data/homeData";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GoalsHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("30D");

  const { hero, featuredGoal, activeGoals } = homeDashboardData;

  const featuredProgressPercent = Math.min(
    Math.round((featuredGoal.currentAmount / featuredGoal.targetAmount) * 100),
    100
  );

  return (
    <View className="flex-1 bg-bg-app">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {/* ─── MODULAR HERO COMPONENT ─── */}
        <Hero
          data={hero}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
          onNotificationPress={() => router.push("/insights")}
        />

        {/* ─── SECTION: FEATURED GOAL ─── */}
        <View className="px-5 mt-10">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-main text-lg font-black tracking-tight">
              Featured Goal ⭐
            </Text>
            <View className="bg-coral-subtle px-2.5 py-1 rounded-full border border-border-card">
              <Text className="text-primary text-xs font-black">
                Active Overview
              </Text>
            </View>
          </View>

          {/* Featured Goal Card (Tactile Coral-Subtle CartoonCard) */}
          <CartoonCard variant="subtle" className="p-5 mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-coral-subtle px-2.5 py-0.5 rounded-full border border-border-card">
                <Text className="text-primary text-[10px] font-black uppercase tracking-wide">
                  {featuredGoal.categoryTag || "💻 Work Setup"}
                </Text>
              </View>
              <View className="bg-primary px-3 py-1 rounded-full shadow-sm">
                <Text className="text-white text-[10px] font-black uppercase tracking-wider">
                  🔥 {featuredGoal.priorityLabel}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-3">
              <View className="w-12 h-12 rounded-2xl bg-primary items-center justify-center mr-3.5 shadow-sm">
                {featuredGoal.iconFamily === "MaterialCommunityIcons" ? (
                  <MaterialCommunityIcons
                    name={featuredGoal.iconName as any}
                    size={24}
                    color={colors.white}
                  />
                ) : (
                  <Ionicons
                    name={featuredGoal.iconName as any}
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
                  {featuredGoal.targetDate}
                </Text>
              </View>
            </View>

            {/* Progress Bar & Readout */}
            <View className="mb-3">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-text-muted text-xs font-bold">Progress</Text>
                <Text className="text-primary text-xs font-black">
                  {`${featuredGoal.currency}${featuredGoal.currentAmount.toLocaleString()} / ${featuredGoal.currency}${featuredGoal.targetAmount.toLocaleString()} (${featuredProgressPercent}%)`}
                </Text>
              </View>
              <View className="h-3 bg-bg-app rounded-full overflow-hidden border border-border-card">
                <View
                  style={{ width: `${featuredProgressPercent}%` }}
                  className="h-full bg-primary rounded-full"
                />
              </View>
            </View>

            {/* Encouragement / Milestone Banner */}
            <View className="bg-white-overlay-80 p-2.5 rounded-2xl border border-border-card flex-row items-center">
              <Text className="text-text-main text-xs font-bold flex-1">
                {featuredGoal.encouragement || "🎉 Almost there! Keep up the great savings pace."}
              </Text>
            </View>
          </CartoonCard>

          {/* ─── SECTION: ACTIVE SAVINGS GOALS ─── */}
          <Text className="text-text-main text-lg font-black tracking-tight mb-4">
            Active Savings Goals 🎯
          </Text>

          <View className="flex-row gap-3.5 mb-6">
            {activeGoals.map((goal) => {
              const progressPercent = Math.min(
                Math.round((goal.savedAmount / goal.targetAmount) * 100),
                100
              );

              const isGold = goal.cardVariant === "gold";
              const isIncome = goal.cardVariant === "income";

              const iconBgClass = isGold
                ? "bg-gold"
                : isIncome
                ? "bg-emerald"
                : "bg-primary";

              const amountTextClass = isGold
                ? "text-gold-dark"
                : isIncome
                ? "text-emerald-dark"
                : "text-primary";

              const badgeBorderClass = isGold
                ? "border-gold-border"
                : isIncome
                ? "border-emerald-border"
                : "border-border-card";

              const progressFillClass = isGold
                ? "bg-gold-dark"
                : isIncome
                ? "bg-emerald"
                : "bg-primary";

              return (
                <CartoonCard
                  key={goal.id}
                  variant={goal.cardVariant}
                  className="flex-1 p-4"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View
                      className={`w-11 h-11 rounded-2xl ${iconBgClass} items-center justify-center shadow-sm`}
                    >
                      {goal.iconFamily === "MaterialCommunityIcons" ? (
                        <MaterialCommunityIcons
                          name={goal.iconName as any}
                          size={22}
                          color={colors.white}
                        />
                      ) : (
                        <Ionicons
                          name={goal.iconName as any}
                          size={22}
                          color={colors.white}
                        />
                      )}
                    </View>

                    <View
                      className={`bg-white-overlay-80 px-2 py-0.5 rounded-lg border ${badgeBorderClass}`}
                    >
                      <Text
                        className={`${amountTextClass} text-[10px] font-black`}
                      >
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
                    {`${goal.currency}${goal.savedAmount.toLocaleString()}`}
                  </Text>
                  <Text className="text-text-muted text-[11px] font-bold mb-3">
                    {`of ${goal.currency}${goal.targetAmount.toLocaleString()} goal`}
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
                Auto-saving $25 on Friday keeps your 12-week streak alive! 🔥
              </Text>
            </View>
            <View className="w-9 h-9 rounded-full bg-white-overlay-20 items-center justify-center border border-white-overlay-20">
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            </View>
          </CartoonCard>
        </View>
      </ScrollView>
    </View>
  );
}