import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export default function InsightsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-app">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-4 mb-6">
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider">
            Smart Analytics & Alerts
          </Text>
          <Text className="text-text-main text-2xl font-bold mt-0.5">
            Insights & Nudges 📊
          </Text>
        </View>

        {/* Nudge Banner Card */}
        <View className="bg-coral-subtle border border-primary-light/30 rounded-3xl p-5 mb-6 flex-row items-start">
          <View className="w-10 h-10 rounded-2xl bg-primary items-center justify-center mr-3.5 mt-0.5">
            <Ionicons name="sparkles" size={20} color={colors.white} />
          </View>
          <View className="flex-1">
            <Text className="text-text-brand text-xs font-bold uppercase tracking-wider">
              Smart Nudge
            </Text>
            <Text className="text-text-main text-base font-bold mt-1">
              On Track for Dream Setup!
            </Text>
            <Text className="text-text-muted text-xs font-medium mt-1 leading-4">
              At your current velocity, you will reach your goal 14 days earlier than planned.
            </Text>
          </View>
        </View>

        {/* Savings Velocity Card */}
        <View className="bg-bg-card rounded-3xl p-5 mb-6 border border-border-card shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-text-main text-base font-bold">
              Savings Velocity
            </Text>
            <View className="bg-bg-app px-3 py-1 rounded-full">
              <Text className="text-text-muted text-xs font-bold">This Month</Text>
            </View>
          </View>

          <View className="flex-row items-baseline mb-3">
            <Text className="text-primary text-3xl font-extrabold">$820.00</Text>
            <Text className="text-text-muted text-xs font-medium ml-2">
              / $1,000 monthly target
            </Text>
          </View>

          <View className="h-3 bg-bg-app rounded-full overflow-hidden mb-3">
            <View className="h-full bg-primary rounded-full w-[82%]" />
          </View>

          <Text className="text-text-muted text-xs font-medium">
            🔥 You saved 18% more than last month. Keep up the streak!
          </Text>
        </View>

        {/* Behavioral Metrics Grid */}
        <Text className="text-text-main text-lg font-bold mb-4">
          Financial Health Metrics
        </Text>

        <View className="flex-row gap-4">
          <View className="flex-1 bg-bg-card rounded-3xl p-4 border border-border-card shadow-sm">
            <MaterialCommunityIcons name="trending-up" size={24} color={colors.emerald} />
            <Text className="text-text-main text-sm font-bold mt-2 mb-0.5">
              Savings Rate
            </Text>
            <Text className="text-emerald-600 text-xl font-extrabold">34.2%</Text>
            <Text className="text-text-muted text-[11px] mt-1">
              Top 10% of budgeters
            </Text>
          </View>

          <View className="flex-1 bg-bg-card rounded-3xl p-4 border border-border-card shadow-sm">
            <Ionicons name="flame-outline" size={24} color={colors.gold} />
            <Text className="text-text-main text-sm font-bold mt-2 mb-0.5">
              Savings Streak
            </Text>
            <Text className="text-gold text-xl font-extrabold">12 Weeks</Text>
            <Text className="text-text-muted text-[11px] mt-1">
              Personal best streak!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
