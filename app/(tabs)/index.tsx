import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "@/constants/theme";

export default function GoalsHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bg-app">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-6">
          <View>
            <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider">
              PiggySavings
            </Text>
            <Text className="text-text-main text-2xl font-bold mt-0.5">
              My Savings Goals 🎯
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push("/profile")}
            className="w-10 h-10 rounded-full bg-bg-card items-center justify-center border border-border-card shadow-sm"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textMain} />
          </TouchableOpacity>
        </View>

        {/* Hero Card - Total Net Savings */}
        <View className="bg-primary rounded-3xl p-6 mb-6 shadow-md shadow-primary/20">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider">
              Total Saved
            </Text>
            <View className="bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-bold">Auto-Allocating</Text>
            </View>
          </View>
          <Text className="text-white text-4xl font-extrabold mb-4">
            $12,450.00
          </Text>

          <View className="bg-white/10 rounded-2xl p-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="trending-up" size={18} color={colors.white} />
              <Text className="text-white text-xs font-medium ml-2">
                +$450.00 this month
              </Text>
            </View>
            <Text className="text-gold text-xs font-bold">85% of Target</Text>
          </View>
        </View>

        {/* Section Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-text-main text-lg font-bold">
            Featured Goal
          </Text>
          <View>
            <Text className="text-primary text-sm font-semibold">Active Overview</Text>
          </View>
        </View>

        {/* Dream Setup Goal Card */}
        <View className="bg-bg-card rounded-3xl p-5 mb-6 border border-border-card shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                <MaterialCommunityIcons name="laptop" size={24} color={colors.primary} />
              </View>
              <View>
                <Text className="text-text-main text-base font-bold">
                  Dream Studio Setup
                </Text>
                <Text className="text-text-muted text-xs font-medium">
                  Target: Dec 2026
                </Text>
              </View>
            </View>
            <View className="bg-coral-subtle px-3 py-1 rounded-full">
              <Text className="text-primary text-xs font-bold">High Priority</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View className="mb-3">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-text-muted text-xs font-medium">Progress</Text>
              <Text className="text-text-main text-xs font-bold">
                $3,200 / $4,000 (80%)
              </Text>
            </View>
            <View className="h-3 bg-bg-app rounded-full overflow-hidden">
              <View className="h-full bg-primary rounded-full w-[80%]" />
            </View>
          </View>
        </View>

        {/* Secondary Goals Grid */}
        <Text className="text-text-main text-lg font-bold mb-4">
          Active Savings Goals
        </Text>

        <View className="flex-row gap-4 mb-6">
          <View className="flex-1 bg-bg-card rounded-3xl p-4 border border-border-card shadow-sm">
            <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mb-3">
              <Ionicons name="airplane-outline" size={20} color={colors.primary} />
            </View>
            <Text className="text-text-main text-sm font-bold mb-1">
              Japan Trip
            </Text>
            <Text className="text-text-muted text-xs mb-2">$1,800 saved</Text>
            <View className="h-2 bg-bg-app rounded-full overflow-hidden">
              <View className="h-full bg-gold rounded-full w-[60%]" />
            </View>
          </View>

          <View className="flex-1 bg-bg-card rounded-3xl p-4 border border-border-card shadow-sm">
            <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mb-3">
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            </View>
            <Text className="text-text-main text-sm font-bold mb-1">
              Emergency Fund
            </Text>
            <Text className="text-text-muted text-xs mb-2">$7,450 saved</Text>
            <View className="h-2 bg-bg-app rounded-full overflow-hidden">
              <View className="h-full bg-primary rounded-full w-[93%]" />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
