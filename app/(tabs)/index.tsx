import { colors } from "@/constants/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GoalsHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState<"7D" | "30D" | "90D">("30D");

  // Health Score & Gauge Calculations
  const healthScore = 82;
  const gaugePercent = healthScore / 100;

  // Arc Gauge Geometry (Radius: 95, Center: 115, 110)
  const radius = 95;
  const centerX = 115;
  const centerY = 110;
  const knobAngleRad = (180 + gaugePercent * 180) * (Math.PI / 180);
  const knobX = centerX + radius * Math.cos(knobAngleRad) - 13;
  const knobY = centerY + radius * Math.sin(knobAngleRad) - 13;

  // Radial tick angles (180 deg to 360 deg)
  const tickAngles = [185, 200, 215, 230, 245, 260, 275, 290, 305, 320, 335, 355];

  return (
    <View className="flex-1 bg-bg-app">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ─── FULL-BLEED HERO SECTION (Flat bottom with straddling stats card) ─── */}
        <View
          style={{ paddingTop: Math.max(insets.top, 14) }}
          className="w-full bg-primary pb-0 mb-8 px-5"
        >
          {/* Top Hero App Bar */}
          <View className="flex-row items-center justify-between mb-3">
            {/* Left Balance spacer */}
            <View className="w-10 h-10" />

            <View className="items-center">
              <Text className="text-white text-base font-extrabold tracking-tight">
                Savings Report
              </Text>
              <Text className="text-white-overlay-80 text-[11px] font-semibold mt-0.5">
                piggysavings.app
              </Text>
            </View>

            {/* Notification Bell Button */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Notifications & Nudges"
              onPress={() => router.push("/insights")}
              className="w-10 h-10 rounded-full bg-white-overlay-20 items-center justify-center border border-white-overlay-10"
            >
              <Ionicons name="notifications-outline" size={19} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Timeframe Segmented Selector */}
          <View className="flex-row justify-center mb-1">
            <View className="bg-white-overlay-20 flex-row p-1 rounded-full border border-white-overlay-10">
              {(["7D", "30D", "90D"] as const).map((period) => {
                const isActive = selectedPeriod === period;
                return (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setSelectedPeriod(period)}
                    activeOpacity={0.85}
                    className={`px-5 py-1.5 rounded-full ${isActive ? "bg-bg-card shadow-sm" : "bg-transparent"
                      }`}
                  >
                    <Text
                      className={`text-xs font-black ${isActive ? "text-primary" : "text-white"
                        }`}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Semicircular Gauge with Center Score */}
          <View className="items-center justify-center my-1">
            <View className="w-[230px] h-[122px] relative items-center justify-end overflow-hidden">
              {/* Outer Radial Ticks */}
              {tickAngles.map((deg) => {
                const rad = deg * (Math.PI / 180);
                const tickRadius = 108;
                const tx = centerX + tickRadius * Math.cos(rad) - 1.5;
                const ty = centerY + tickRadius * Math.sin(rad) - 4;
                return (
                  <View
                    key={deg}
                    style={{
                      position: "absolute",
                      left: tx,
                      top: ty,
                      transform: [{ rotate: `${deg + 90}deg` }],
                    }}
                    className="w-[3px] h-[6px] bg-white-overlay-40 rounded-full"
                  />
                );
              })}

              {/* Gauge Inactive Background Arc */}
              <View
                style={{
                  width: radius * 2,
                  height: radius * 2,
                  borderRadius: radius,
                  borderWidth: 6,
                  borderColor: colors.whiteOverlay20,
                  borderBottomColor: "transparent",
                  borderLeftColor: "transparent",
                  transform: [{ rotate: "-45deg" }],
                  position: "absolute",
                  top: 15,
                }}
              />

              {/* Gauge Active Progress Arc */}
              <View
                style={{
                  width: radius * 2,
                  height: radius * 2,
                  borderRadius: radius,
                  borderWidth: 6,
                  borderColor: colors.white,
                  borderBottomColor: "transparent",
                  borderLeftColor: "transparent",
                  transform: [{ rotate: "-45deg" }],
                  position: "absolute",
                  top: 15,
                }}
              />

              {/* Glowing Indicator Knob */}
              <View
                style={{
                  position: "absolute",
                  left: knobX,
                  top: knobY,
                }}
                className="w-6 h-6 rounded-full bg-white-overlay-30 items-center justify-center"
              >
                <View className="w-3.5 h-3.5 rounded-full bg-bg-card shadow-md shadow-text-main/30" />
              </View>

              {/* Central Metric */}
              <View className="items-center mb-1">
                <View className="flex-row items-baseline">
                  <Text className="text-white text-5xl font-black tracking-tight">
                    {healthScore}
                  </Text>
                  <Text className="text-white-overlay-80 text-sm font-bold ml-0.5">
                    /100
                  </Text>
                </View>
                <Text className="text-white-overlay-80 text-[10px] font-extrabold uppercase tracking-widest mt-0.5">
                  Savings Health
                </Text>
              </View>
            </View>

            {/* Score Trend Pill */}
            <View className="bg-white-overlay-20 px-3 py-1 rounded-full flex-row items-center mt-2 border border-white-overlay-10">
              <Ionicons name="arrow-up" size={11} color={colors.white} />
              <Text className="text-white text-xs font-bold ml-1">
                6 pts vs last month
              </Text>
            </View>
          </View>

          {/* 3-Column Metrics Stats Card (Docked across the bottom seam) */}
          <View className="bg-bg-card rounded-2xl p-4 mt-3 -mb-12 flex-row items-center justify-between border border-border-card shadow-md">
            {/* Column 1 */}
            <View className="flex-1 items-start">
              <Text className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                Total Saved
              </Text>
              <Text className="text-text-main text-lg font-extrabold mb-1">
                $12.4K
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="arrow-up" size={12} color={colors.trendUp} />
                <Text className="text-trend-up text-[11px] font-bold ml-0.5">
                  12%
                </Text>
              </View>
            </View>

            <View className="w-[1px] h-9 bg-border-card mx-2" />

            {/* Column 2 */}
            <View className="flex-1 items-start pl-1">
              <Text className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                Target Goal
              </Text>
              <Text className="text-text-main text-lg font-extrabold mb-1">
                $15.0K
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="arrow-up" size={12} color={colors.trendUp} />
                <Text className="text-trend-up text-[11px] font-bold ml-0.5">
                  85%
                </Text>
              </View>
            </View>

            <View className="w-[1px] h-9 bg-border-card mx-2" />

            {/* Column 3 */}
            <View className="flex-1 items-start pl-1">
              <Text className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                Velocity
              </Text>
              <Text className="text-text-main text-lg font-extrabold mb-1">
                +$820
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="arrow-up" size={12} color={colors.trendUp} />
                <Text className="text-trend-up text-[11px] font-bold ml-0.5">
                  1.2x
                </Text>
              </View>
            </View>
          </View>
        </View>
        {/* ─── END HERO SECTION ─── */}

        {/* Section: Featured Goal */}
        <View className="px-5 mt-10">
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

          <View className="flex-row gap-4">
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
        </View>
      </ScrollView>
    </View>
  );
}