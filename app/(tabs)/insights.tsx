import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function InsightsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#FAF4F0]">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-4 mb-6">
          <Text className="text-[#8C7B75] text-xs font-semibold uppercase tracking-wider">
            Smart Analytics & Alerts
          </Text>
          <Text className="text-[#331C14] text-2xl font-bold mt-0.5">
            Insights & Nudges 📊
          </Text>
        </View>

        {/* Nudge Banner Card */}
        <View className="bg-[#FDF3EF] border border-[#F48A64]/30 rounded-3xl p-5 mb-6 flex-row items-start">
          <View className="w-10 h-10 rounded-2xl bg-[#EE6A3B] items-center justify-center mr-3.5 mt-0.5">
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-[#A83B1B] text-xs font-bold uppercase tracking-wider">
              Smart Nudge
            </Text>
            <Text className="text-[#331C14] text-base font-bold mt-1">
              On Track for Dream Setup!
            </Text>
            <Text className="text-[#8C7B75] text-xs font-medium mt-1 leading-4">
              At your current velocity, you will reach your goal 14 days earlier than planned.
            </Text>
          </View>
        </View>

        {/* Savings Velocity Card */}
        <View className="bg-[#FFFFFF] rounded-3xl p-5 mb-6 border border-[#F3ECE7] shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[#331C14] text-base font-bold">
              Savings Velocity
            </Text>
            <View className="bg-[#FAF4F0] px-3 py-1 rounded-full">
              <Text className="text-[#8C7B75] text-xs font-bold">This Month</Text>
            </View>
          </View>

          <View className="flex-row items-baseline mb-3">
            <Text className="text-[#EE6A3B] text-3xl font-extrabold">$820.00</Text>
            <Text className="text-[#8C7B75] text-xs font-medium ml-2">
              / $1,000 monthly target
            </Text>
          </View>

          <View className="h-3 bg-[#FAF4F0] rounded-full overflow-hidden mb-3">
            <View className="h-full bg-[#EE6A3B] rounded-full w-[82%]" />
          </View>

          <Text className="text-[#8C7B75] text-xs font-medium">
            🔥 You saved 18% more than last month. Keep up the streak!
          </Text>
        </View>

        {/* Behavioral Metrics Grid */}
        <Text className="text-[#331C14] text-lg font-bold mb-4">
          Financial Health Metrics
        </Text>

        <View className="flex-row gap-4">
          <View className="flex-1 bg-[#FFFFFF] rounded-3xl p-4 border border-[#F3ECE7] shadow-sm">
            <MaterialCommunityIcons name="trending-up" size={24} color="#10B981" />
            <Text className="text-[#331C14] text-sm font-bold mt-2 mb-0.5">
              Savings Rate
            </Text>
            <Text className="text-[#10B981] text-xl font-extrabold">34.2%</Text>
            <Text className="text-[#8C7B75] text-[11px] mt-1">
              Top 10% of budgeters
            </Text>
          </View>

          <View className="flex-1 bg-[#FFFFFF] rounded-3xl p-4 border border-[#F3ECE7] shadow-sm">
            <Ionicons name="flame-outline" size={24} color="#F5B800" />
            <Text className="text-[#331C14] text-sm font-bold mt-2 mb-0.5">
              Savings Streak
            </Text>
            <Text className="text-[#F5B800] text-xl font-extrabold">12 Weeks</Text>
            <Text className="text-[#8C7B75] text-[11px] mt-1">
              Personal best streak!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
