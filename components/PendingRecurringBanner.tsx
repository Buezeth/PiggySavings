import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { colors } from "../constants/theme";
import { RecurringScheduleRow } from "../services/db/types";
import { CartoonCard } from "./CartoonCard";

export interface PendingRecurringBannerProps {
  pendingRecurringSchedules: RecurringScheduleRow[];
  onPress: () => void;
}

export const PendingRecurringBanner: React.FC<PendingRecurringBannerProps> = ({
  pendingRecurringSchedules,
  onPress,
}) => {
  if (pendingRecurringSchedules.length === 0) {
    return null;
  }

  const count = pendingRecurringSchedules.length;
  const firstItemTitle = pendingRecurringSchedules[0]?.title || "Recurring Bill";

  return (
    <CartoonCard
      variant="gold"
      interactive
      onPress={onPress}
      className="p-4 flex-row items-center justify-between"
    >
      <View className="flex-1 mr-2">
        <View className="flex-row items-center mb-1">
          <View className="w-5 h-5 rounded-full bg-gold items-center justify-center mr-1.5 shadow-sm">
            <Ionicons name="flash" size={12} color={colors.white} />
          </View>
          <Text className="text-gold-dark text-xs font-black uppercase tracking-wider">
            ⚡ {count} Recurring Bill{count === 1 ? "" : "s"} Due for Review
          </Text>
        </View>
        <Text className="text-text-main text-xs font-bold" numberOfLines={1}>
          Review amounts for {firstItemTitle}
          {count > 1 ? " and more." : "."}
        </Text>
      </View>

      <View className="bg-gold px-3 py-2 rounded-2xl border-2 border-gold-light border-b-4 border-b-gold-dark">
        <Text className="text-white text-xs font-black uppercase tracking-wider">
          Review ({count})
        </Text>
      </View>
    </CartoonCard>
  );
};
