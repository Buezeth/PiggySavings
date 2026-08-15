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
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-text-main text-lg font-bold">
              Featured Goal
            </Text>
            <View>
              <Text className="text-primary text-sm font-semibold">
                Active Overview
              </Text>
            </View>
          </View>

          {/* Featured Goal Card */}
          <View className="bg-bg-card rounded-3xl p-5 mb-6 border border-border-card shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-11 h-11 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                  {featuredGoal.iconFamily === "MaterialCommunityIcons" ? (
                    <MaterialCommunityIcons
                      name={featuredGoal.iconName as any}
                      size={24}
                      color={colors.primary}
                    />
                  ) : (
                    <Ionicons
                      name={featuredGoal.iconName as any}
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </View>
                <View>
                  <Text className="text-text-main text-base font-bold">
                    {featuredGoal.title}
                  </Text>
                  <Text className="text-text-muted text-xs font-medium">
                    {featuredGoal.targetDate}
                  </Text>
                </View>
              </View>
              <View className="bg-coral-subtle px-3 py-1 rounded-full">
                <Text className="text-primary text-xs font-bold">
                  {featuredGoal.priorityLabel}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="mb-3">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-text-muted text-xs font-medium">Progress</Text>
                <Text className="text-text-main text-xs font-bold">
                  {`${featuredGoal.currency}${featuredGoal.currentAmount.toLocaleString()} / ${featuredGoal.currency}${featuredGoal.targetAmount.toLocaleString()} (${featuredProgressPercent}%)`}
                </Text>
              </View>
              <View className="h-3 bg-bg-app rounded-full overflow-hidden">
                <View
                  style={{ width: `${featuredProgressPercent}%` }}
                  className="h-full bg-primary rounded-full"
                />
              </View>
            </View>
          </View>

          {/* ─── SECTION: ACTIVE SAVINGS GOALS ─── */}
          <Text className="text-text-main text-lg font-bold mb-4">
            Active Savings Goals
          </Text>

          <View className="flex-row gap-4">
            {activeGoals.map((goal) => {
              const progressPercent = Math.min(
                Math.round((goal.savedAmount / goal.targetAmount) * 100),
                100
              );
              const progressBgClass =
                goal.progressColorToken === "gold" ? "bg-gold" : "bg-primary";

              return (
                <View
                  key={goal.id}
                  className="flex-1 bg-bg-card rounded-3xl p-4 border border-border-card shadow-sm"
                >
                  <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mb-3">
                    {goal.iconFamily === "MaterialCommunityIcons" ? (
                      <MaterialCommunityIcons
                        name={goal.iconName as any}
                        size={20}
                        color={colors.primary}
                      />
                    ) : (
                      <Ionicons
                        name={goal.iconName as any}
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </View>
                  <Text className="text-text-main text-sm font-bold mb-1">
                    {goal.title}
                  </Text>
                  <Text className="text-text-muted text-xs mb-2">
                    {`${goal.currency}${goal.savedAmount.toLocaleString()} saved`}
                  </Text>
                  <View className="h-2 bg-bg-app rounded-full overflow-hidden">
                    <View
                      style={{ width: `${progressPercent}%` }}
                      className={`h-full ${progressBgClass} rounded-full`}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}