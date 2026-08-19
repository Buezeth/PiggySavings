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
import CartoonCard from "./CartoonCard";
import { PiggyBank } from "./PiggyBank";

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
  selectedPeriod = "30D",
  onSelectPeriod,
  onNotificationPress,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const periods: TimePeriod[] = ["7D", "30D", "90D"];

  const healthScore = data.healthScore;
  const maxScore = data.maxHealthScore || 100;
  const gaugePercent = Math.min(Math.max(healthScore / maxScore, 0.01), 1);
  const activeAngle = 180 + gaugePercent * 180;

  // Responsive sizing: 80% screen width
  const gaugeWidth = Math.min(Math.max(Math.round(screenWidth * 0.8), 280), 345);
  const strokeWidth = 8;
  const radius = Math.round((gaugeWidth - 36) / 2);
  const centerX = gaugeWidth / 2;
  const centerY = radius + strokeWidth + 16;
  const containerHeight = centerY + 22;

  // Semicircular Arc Path Coordinates
  const startX = centerX - radius;
  const startY = centerY;
  const endX = centerX + radius;
  const endY = centerY;

  const backgroundArcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  // Active progress target point
  const activeAngleRad = activeAngle * (Math.PI / 180);
  const activeEndX = centerX + radius * Math.cos(activeAngleRad);
  const activeEndY = centerY + radius * Math.sin(activeAngleRad);

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
      {/* Top Bar with Period Selector & Notification Icon */}
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row bg-white-overlay-20 p-1 rounded-full border border-white-overlay-10">
          {periods.map((p) => {
            const isSelected = selectedPeriod === p;
            return (
              <TouchableOpacity
                key={p}
                accessibilityRole="button"
                accessibilityLabel={`Select ${p} period`}
                onPress={() => onSelectPeriod?.(p)}
                className={`will-change-variable px-3 py-1 rounded-full ${isSelected ? "bg-bg-card shadow-sm" : "bg-transparent"
                  }`}
              >
                <Text
                  className={`will-change-variable text-xs font-black ${isSelected ? "text-primary" : "text-white"
                    }`}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Notifications & Nudges"
          onPress={onNotificationPress}
          className="w-10 h-10 rounded-full bg-white-overlay-20 items-center justify-center border border-white-overlay-10"
        >
          <Ionicons name="notifications-outline" size={19} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Semicircular Gauge Section with 3D Piggy Bank */}
      <View className="items-center justify-center my-1">
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

          {/* Smooth Vector SVG Arc Track */}
          <Svg
            width={gaugeWidth}
            height={containerHeight}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            {/* Inactive Track */}
            <Path
              d={backgroundArcPath}
              stroke={colors.whiteOverlay20}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
            {/* Active Track */}
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

          {/* Center Chamber: 3D Piggy Bank & Score Readout */}
          <View
            style={{
              position: "absolute",
              top: 14,
              bottom: 4,
              left: 10,
              right: 10,
            }}
            className="items-center justify-center"
          >
            {/* 3D Piggy Character */}
            <PiggyBank size={110} />

            {/* Health Score Readout */}
            <View className="items-center mt-1">
              <View className="flex-row items-baseline">
                <Text className="text-white text-3xl font-black tracking-tight">
                  {healthScore}
                </Text>
                <Text className="text-white-overlay-80 text-sm font-bold ml-1">
                  /{maxScore}
                </Text>
              </View>
              <Text className="text-white-overlay-80 text-[10px] font-extrabold uppercase tracking-widest mt-0.5">
                Savings Health
              </Text>
            </View>
          </View>
        </View>

        {/* Score Trend Pill */}
        {data.scoreTrend && (
          <View className="bg-white-overlay-20 px-3.5 py-1 rounded-full flex-row items-center mt-2.5 border border-white-overlay-10">
            <Ionicons
              name={
                data.scoreTrend.direction === "up"
                  ? "arrow-up"
                  : data.scoreTrend.direction === "down"
                  ? "arrow-down"
                  : "remove"
              }
              size={12}
              color={colors.white}
            />
            <Text className="text-white text-xs font-bold ml-1">
              {data.scoreTrend.text}
            </Text>
          </View>
        )}
      </View>

      {/* 3-Column Metrics Stats Card (Chunky Duolingo/Playful Style) */}
      <CartoonCard
        variant="card"
        className="mt-3 -mb-12 flex-row items-center justify-between"
      >
        {data.metrics.map((metric, index) => {
          const isLast = index === data.metrics.length - 1;
          const direction = metric.trendDirection;

          const pillBgBorder =
            direction === "up"
              ? "bg-emerald-subtle border-emerald-border"
              : direction === "down"
              ? "bg-rose-subtle border-rose-border"
              : "bg-bg-app border-border-card";

          const iconName: keyof typeof Ionicons.glyphMap =
            direction === "up"
              ? "arrow-up"
              : direction === "down"
              ? "arrow-down"
              : "remove";

          const iconColor =
            direction === "up"
              ? colors.emeraldDark
              : direction === "down"
              ? colors.roseDark
              : colors.textMuted;

          const textColor =
            direction === "up"
              ? "text-emerald-dark"
              : direction === "down"
              ? "text-rose-dark"
              : "text-text-muted";

          return (
            <React.Fragment key={metric.id}>
              <View className={`flex-1 items-start ${index > 0 ? "pl-1.5" : ""}`}>
                <Text className="text-text-muted text-[10px] font-black uppercase tracking-wider mb-1">
                  {metric.label}
                </Text>
                <Text className="text-text-main text-lg font-black tracking-tight mb-1.5">
                  {metric.value}
                </Text>
                <View
                  className={`flex-row items-center px-1.5 py-0.5 rounded-md border ${pillBgBorder}`}
                >
                  <Ionicons
                    name={iconName}
                    size={11}
                    color={iconColor}
                  />
                  <Text
                    className={`text-[10px] font-black ml-0.5 ${textColor}`}
                  >
                    {metric.change}
                  </Text>
                </View>
              </View>

              {!isLast && <View className="w-px h-10 bg-border-card mx-2" />}
            </React.Fragment>
          );
        })}
      </CartoonCard>
    </View>
  );
};

export default Hero;