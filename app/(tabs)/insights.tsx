import CartoonCard from "@/components/CartoonCard";
import { colors } from "@/constants/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();

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

        {/* Smart Nudge Banner (Tactile Coral-Subtle CartoonCard) */}
        <CartoonCard variant="subtle" className="mb-6 p-5 flex-row items-start">
          <View className="w-11 h-11 rounded-2xl bg-primary items-center justify-center mr-3.5 mt-0.5 shadow-sm">
            <Ionicons name="sparkles" size={22} color={colors.white} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text className="text-text-brand text-xs font-black uppercase tracking-wider">
                Smart Nudge
              </Text>
              <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                <Text className="text-primary text-[10px] font-black uppercase">
                  Ahead of schedule
                </Text>
              </View>
            </View>
            <Text className="text-text-main text-base font-black mt-1">
              On Track for Dream Setup!
            </Text>
            <Text className="text-text-muted text-xs font-bold mt-1 leading-4">
              At your current velocity, you will reach your goal 14 days earlier than planned.
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
              <Text className="text-primary text-xs font-black">This Month</Text>
            </View>
          </View>

          <View className="flex-row items-baseline mb-3">
            <Text className="text-primary text-3xl font-black">$820.00</Text>
            <Text className="text-text-muted text-xs font-bold ml-2">
              / $1,000 monthly target
            </Text>
          </View>

          {/* Flat Progress Bar */}
          <View className="h-3 bg-bg-app rounded-full overflow-hidden mb-3">
            <View className="h-full bg-primary rounded-full w-[82%]" />
          </View>

          <View className="bg-coral-subtle p-2.5 rounded-2xl flex-row items-center">
            <Text className="text-sm mr-1.5">🔥</Text>
            <Text className="text-text-main text-xs font-bold flex-1">
              You saved <Text className="text-emerald font-black">18% more</Text> than last month. Keep up the streak!
            </Text>
          </View>
        </CartoonCard>

        {/* Financial Health Metrics Grid */}
        <Text className="text-text-main text-lg font-black tracking-tight mb-4">
          Financial Health Metrics
        </Text>

        <View className="flex-row gap-4 mb-6">
          {/* Savings Rate Card (Emerald Mint Variant) */}
          <CartoonCard variant="income" className="flex-1 p-4">
            <View className="w-10 h-10 rounded-2xl bg-emerald items-center justify-center mb-2">
              <MaterialCommunityIcons name="trending-up" size={22} color={colors.white} />
            </View>
            <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-0.5">
              Savings Rate
            </Text>
            <Text className="text-emerald text-2xl font-black">34.2%</Text>
            <View className="bg-white/80 self-start px-2 py-0.5 rounded-md mt-2 border border-emerald-border">
              <Text className="text-emerald-dark text-[10px] font-black">
                Top 10% of savers
              </Text>
            </View>
          </CartoonCard>

          {/* Savings Streak Card (Gold Sunny Variant) */}
          <CartoonCard variant="gold" className="flex-1 p-4">
            <View className="w-10 h-10 rounded-2xl bg-gold items-center justify-center mb-2">
              <Ionicons name="flame" size={22} color={colors.white} />
            </View>
            <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-0.5">
              Savings Streak
            </Text>
            <Text className="text-gold-dark text-2xl font-black">12 Wks</Text>
            <View className="bg-white/80 self-start px-2 py-0.5 rounded-md mt-2 border border-gold-border">
              <Text className="text-gold-dark text-[10px] font-black">
                Personal best! 🔥
              </Text>
            </View>
          </CartoonCard>
        </View>

        {/* Smart Tips / Gamified Challenge Card */}
        <CartoonCard variant="accent" className="p-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="bg-white/20 px-3 py-1 rounded-full border border-white-overlay-20">
              <Text className="text-white text-xs font-black uppercase tracking-wider">
                Weekly Challenge
              </Text>
            </View>
            <Text className="text-white text-xs font-bold">Ends in 2 days</Text>
          </View>
          <Text className="text-white text-lg font-black mt-1 mb-1">
            Zero Takeout Weekend 🍱
          </Text>
          <Text className="text-white-overlay-80 text-xs font-bold leading-4 mb-3">
            Cook at home this weekend to boost your auto-allocation to Japan Trip by $40!
          </Text>
          <View className="h-2.5 bg-white-overlay-20 rounded-full overflow-hidden">
            <View className="h-full bg-white rounded-full w-[65%]" />
          </View>
        </CartoonCard>
      </ScrollView>
    </View>
  );
}

