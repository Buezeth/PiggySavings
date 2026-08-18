import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CartoonCard } from "./CartoonCard";
import { colors } from "../constants/theme";
import { showRewardedGoalUnlockAd } from "../services/monetization/adService";
import { useApp } from "../context/AppContext";

export interface GoalLimitModalProps {
  visible: boolean;
  onClose: () => void;
  currentCount?: number;
  maxLimit?: number;
  onUnlockedSlot?: () => void;
  onOpenTipJar?: () => void;
}

/**
 * GoalLimitModal:
 * Playful gamified interceptor displayed when a user reaches their maximum active goal capacity (3 free goals).
 * Offers:
 * 1. Rewarded Ad: Watch video to unlock +1 goal slot.
 * 2. Supporter Tip Jar: One-time tip to unlock permanent unlimited goals.
 */
export const GoalLimitModal: React.FC<GoalLimitModalProps> = ({
  visible,
  onClose,
  currentCount = 3,
  maxLimit = 3,
  onUnlockedSlot,
  onOpenTipJar,
}) => {
  const { refreshData } = useApp();
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adSuccessMessage, setAdSuccessMessage] = useState<string | null>(null);

  const handleWatchAd = async () => {
    setIsWatchingAd(true);
    setAdSuccessMessage(null);

    const result = await showRewardedGoalUnlockAd(async () => {
      await refreshData();
    });

    setIsWatchingAd(false);

    if (result.success && result.rewardEarned) {
      setAdSuccessMessage("🎉 +1 Goal Slot Unlocked!");
      if (onUnlockedSlot) {
        onUnlockedSlot();
      }
      setTimeout(() => {
        setAdSuccessMessage(null);
        onClose();
      }, 1200);
    }
  };

  const handleBecomeSupporter = () => {
    onClose();
    if (onOpenTipJar) {
      onOpenTipJar();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/60 items-center justify-center p-5"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm"
        >
          <CartoonCard variant="card" className="p-6 relative">
            {/* Close Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center z-10"
              accessibilityLabel="Close goal limit dialog"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Header Icon / Badge */}
            <View className="items-center mb-4 mt-2">
              <View className="w-16 h-16 rounded-3xl bg-gold-subtle border-2 border-gold-border border-b-4 border-b-gold-border-dark items-center justify-center mb-3 shadow-sm">
                <MaterialCommunityIcons
                  name="target-variant"
                  size={34}
                  color={colors.goldDark}
                />
              </View>

              {/* Title */}
              <Text className="text-text-main text-xl font-black text-center tracking-tight">
                Goal Limit Reached ({currentCount}/{maxLimit}) 🎯
              </Text>
            </View>

            {/* Body */}
            <Text className="text-text-muted text-sm font-bold text-center leading-5 mb-5">
              Keep your focus sharp, or unlock additional goal slots to supercharge your savings journey!
            </Text>

            {/* Slots visualization meter */}
            <View className="bg-coral-subtle p-3 rounded-2xl border border-border-card mb-5">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-text-muted text-xs font-bold uppercase tracking-wider">
                  Active Goal Slots
                </Text>
                <Text className="text-primary text-xs font-black">
                  {currentCount} / {maxLimit} Used
                </Text>
              </View>
              <View className="h-2.5 bg-muted-track rounded-full overflow-hidden">
                <View
                  style={{
                    width: `${Math.min(100, (currentCount / maxLimit) * 100)}%`,
                  }}
                  className="h-full bg-primary rounded-full"
                />
              </View>
            </View>

            {/* Success message banner */}
            {adSuccessMessage ? (
              <View className="bg-emerald-subtle p-3 rounded-2xl border-2 border-emerald-border mb-4 items-center">
                <Text className="text-emerald-dark font-black text-sm">
                  {adSuccessMessage}
                </Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View className="space-y-3">
              {/* Action A: Watch Video Ad (+1 Slot) */}
              <CartoonCard
                variant="accent"
                interactive
                onPress={isWatchingAd ? undefined : handleWatchAd}
                className="p-3.5 mb-3 items-center flex-row justify-center"
              >
                {isWatchingAd ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name="play-circle"
                      size={20}
                      color={colors.white}
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-black text-sm tracking-wide">
                      Watch a Quick Video (+1 Slot)
                    </Text>
                  </>
                )}
              </CartoonCard>

              {/* Action B: Become a Supporter ($2.99 / Unlimited) */}
              <CartoonCard
                variant="gold"
                interactive
                onPress={handleBecomeSupporter}
                className="p-3.5 mb-2 items-center flex-row justify-center"
              >
                <MaterialCommunityIcons
                  name="coffee"
                  size={20}
                  color={colors.goldDark}
                  style={{ marginRight: 8 }}
                />
                <Text className="text-gold-dark font-black text-sm tracking-wide">
                  Become a Supporter ($2.99 / Unlimited)
                </Text>
              </CartoonCard>

              {/* Maybe Later */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                className="py-2.5 items-center justify-center"
              >
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider">
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>
          </CartoonCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default GoalLimitModal;
