import { colors } from "@/constants/theme";
import { HeroData, TimePeriod } from "@/data/homeData";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

interface HeroProps {
  data: HeroData;
  selectedPeriod?: TimePeriod;
  onSelectPeriod?: (period: TimePeriod) => void;
  onNotificationPress?: () => void;
}

// 21 Outer Radial Ticks spaced evenly across 180° (every 9°)
const TICK_ANGLES = Array.from({ length: 21 }, (_, i) => 180 + i * 9);

export const Hero: React.FC<HeroProps> = ({
  data,
  onNotificationPress,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const healthScore = data.healthScore;
  const maxScore = data.maxHealthScore || 100;
  const gaugePercent = Math.min(Math.max(healthScore / maxScore, 0.01), 1);
  const activeAngle = 180 + gaugePercent * 180;

  // Responsive sizing: 78% of screen width (clamped for comfortable margins)
  const gaugeWidth = Math.min(Math.max(Math.round(screenWidth * 0.78), 270), 340);
  const strokeWidth = 8;
  const radius = Math.round((gaugeWidth - 36) / 2);
  const centerX = gaugeWidth / 2;
  const centerY = radius + strokeWidth + 14;
  const containerHeight = centerY + 14;

  // Start (180°) and End (360°) coordinates for the base semicircular arc
  const startX = centerX - radius;
  const startY = centerY;
  const endX = centerX + radius;
  const endY = centerY;

  // Background full semicircle SVG path: M startX startY A radius radius 0 0 1 endX endY
  const backgroundArcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  // Active progress target point
  const activeAngleRad = activeAngle * (Math.PI / 180);
  const activeEndX = centerX + radius * Math.cos(activeAngleRad);
  const activeEndY = centerY + radius * Math.sin(activeAngleRad);

  // Active arc SVG path (smooth single vector stroke)
  const activeArcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${activeEndX} ${activeEndY}`;

  // Glowing knob coordinates
  const knobSize = 24;
  const knobX = activeEndX - knobSize / 2;
  const knobY = activeEndY - knobSize / 2;

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 16) }}
      className="will-change-variable w-full bg-primary pb-0 mb-8 px-5"
    >
      {/* Top Bar with Notification Icon */}
      <View className="flex-row items-center justify-end mb-1">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Notifications & Nudges"
          onPress={onNotificationPress}
          className="w-10 h-10 rounded-full bg-white-overlay-20 items-center justify-center border border-white-overlay-10"
        >
          <Ionicons name="notifications-outline" size={19} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Semicircular Gauge Section (75%-80% Screen Width) */}
      <View className="items-center justify-center my-2">
        <View
          style={{ width: gaugeWidth, height: containerHeight }}
          className="relative items-center justify-center"
        >
          {/* Outer Radial Ticks */}
          {TICK_ANGLES.map((deg) => {
            const rad = deg * (Math.PI / 180);
            const tickRadius = radius + 15;
            const tx = centerX + tickRadius * Math.cos(rad) - 1.5;
            const ty = centerY + tickRadius * Math.sin(rad) - 3.5;
            const isTickActive = deg <= activeAngle;

            return (
              <View
                key={`tick-${deg}`}
                style={{
                  position: "absolute",
                  left: tx,
                  top: ty,
                  width: 3,
                  height: 7,
                  borderRadius: 2,
                  backgroundColor: isTickActive
                    ? colors.whiteOverlay80
                    : colors.whiteOverlay30,
                  transform: [{ rotate: `${deg + 90}deg` }],
                }}
              />
            );
          })}

          {/* Smooth Vector SVG Arc */}
          <Svg
            width={gaugeWidth}
            height={containerHeight}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            {/* Background Inactive Arc Track */}
            <Path
              d={backgroundArcPath}
              stroke={colors.whiteOverlay20}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
            {/* Active Smooth Progress Arc */}
            <Path
              d={activeArcPath}
              stroke={colors.white}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>

          {/* Glowing Indicator Knob */}
          <View
            style={{
              position: "absolute",
              left: knobX,
              top: knobY,
              width: knobSize,
              height: knobSize,
            }}
            className="rounded-full bg-white-overlay-30 items-center justify-center shadow-lg"
          >
            <View className="w-3.5 h-3.5 rounded-full bg-bg-card shadow-md shadow-text-main/40" />
          </View>

          {/* Inner Chamber: Dedicated Space for Animated PiggyBank SVG */}
          <View
            style={{
              position: "absolute",
              top: 32,
              bottom: 8,
              left: 20,
              right: 20,
            }}
            className="items-center justify-end"
          >
            {/* Place your animated PiggyBank SVG right here */}
            <View className="items-center justify-center mb-1">
              <View className="flex-row items-baseline">
                <Text className="text-white text-5xl font-black tracking-tight">
                  {healthScore}
                </Text>
                <Text className="text-white-overlay-80 text-base font-bold ml-1">
                  /{maxScore}
                </Text>
              </View>
              <Text className="text-white-overlay-80 text-[11px] font-extrabold uppercase tracking-widest mt-0.5">
                Savings Health
              </Text>
            </View>
          </View>
        </View>

        {/* Score Trend Pill */}
        {data.scoreTrend && (
          <View className="bg-white-overlay-20 px-3.5 py-1 rounded-full flex-row items-center mt-2.5 border border-white-overlay-10">
            <Ionicons
              name={data.scoreTrend.direction === "up" ? "arrow-up" : "arrow-down"}
              size={12}
              color={colors.white}
            />
            <Text className="text-white text-xs font-bold ml-1">
              {data.scoreTrend.text}
            </Text>
          </View>
        )}
      </View>

      {/* 3-Column Metrics Stats Card */}
      <View className="bg-bg-card rounded-2xl p-4 mt-3 -mb-12 flex-row items-center justify-between border border-border-card shadow-md">
        {data.metrics.map((metric, index) => {
          const isLast = index === data.metrics.length - 1;
          const isPositive = metric.trendDirection === "up";

          return (
            <React.Fragment key={metric.id}>
              <View className={`flex-1 items-start ${index > 0 ? "pl-1" : ""}`}>
                <Text className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                  {metric.label}
                </Text>
                <Text className="text-text-main text-lg font-extrabold mb-1">
                  {metric.value}
                </Text>
                <View className="flex-row items-center">
                  <Ionicons
                    name={isPositive ? "arrow-up" : "arrow-down"}
                    size={12}
                    color={isPositive ? colors.trendUp : colors.primary}
                  />
                  <Text
                    className={`text-[11px] font-bold ml-0.5 ${isPositive ? "text-trend-up" : "text-primary"
                      }`}
                  >
                    {metric.change}
                  </Text>
                </View>
              </View>

              {!isLast && <View className="w-px h-9 bg-border-card mx-2" />}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

export default Hero;