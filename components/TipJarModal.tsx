import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CartoonCard, CartoonCardVariant } from "./CartoonCard";
import { colors } from "../constants/theme";
import { useApp } from "../context/AppContext";

export interface TipTier {
  id: "coffee" | "pizza" | "super_piggy";
  title: string;
  price: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  iconFamily: "MaterialCommunityIcons";
  badgeLabel: string;
  perks: string[];
  cardVariant: CartoonCardVariant;
  highlighted?: boolean;
  unlockedSlots: number;
}

export const TIP_TIERS: TipTier[] = [
  {
    id: "coffee",
    title: "Small Coffee",
    price: "$1.99",
    iconName: "coffee",
    iconFamily: "MaterialCommunityIcons",
    badgeLabel: "Supporter Badge",
    perks: ["Custom Supporter Badge", "Ad-free experience", "Dev appreciation ☕"],
    cardVariant: "card",
    unlockedSlots: 5,
  },
  {
    id: "pizza",
    title: "Pizza Slice",
    price: "$4.99",
    iconName: "pizza",
    iconFamily: "MaterialCommunityIcons",
    badgeLabel: "Permanent Unlimited Goals",
    perks: [
      "Permanent Unlimited Goals",
      "Supporter Badge on Profile",
      "Priority feature roadmap",
    ],
    cardVariant: "subtle",
    highlighted: true,
    unlockedSlots: 999,
  },
  {
    id: "super_piggy",
    title: "Super Piggy",
    price: "$9.99",
    iconName: "rocket-launch",
    iconFamily: "MaterialCommunityIcons",
    badgeLabel: "Permanent Unlimited Goals + Gold Piggy Badge",
    perks: [
      "Permanent Unlimited Goals",
      "Exclusive Gold Piggy Badge 🏆",
      "VIP Supporter Status",
      "All future premium perks",
    ],
    cardVariant: "gold",
    unlockedSlots: 999,
  },
];

export interface TipJarModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * TipJarModal:
 * Tactile Cartoon modal displaying 3 Supporter Tip Tiers.
 * On successful purchase, grants supporter status and sets unlocked goal slots to 999 (unlimited).
 */
export const TipJarModal: React.FC<TipJarModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { setSupporterStatus, refreshData } = useApp();
  const [selectedTierId, setSelectedTierId] = useState<string>("pizza");
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchasedTier, setPurchasedTier] = useState<string | null>(null);

  const handlePurchase = async (tier: TipTier) => {
    setIsProcessing(true);
    try {
      // Simulate purchase transaction latency (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Persist supporter status and slots in SQLite
      await setSupporterStatus(true, tier.unlockedSlots);
      await refreshData();

      setPurchasedTier(tier.title);
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        setPurchasedTier(null);
        setIsProcessing(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("[TipJarModal] purchase error:", err);
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/60 items-center justify-end sm:justify-center p-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-bg-card rounded-3xl border-2 border-border-card border-b-4 border-b-border-card-dark p-5 overflow-hidden"
        >
          {/* Close Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center z-10"
            accessibilityLabel="Close tip jar dialog"
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Header */}
          <View className="items-center mb-4 mt-2">
            <View className="w-16 h-16 rounded-3xl bg-gold-subtle border-2 border-gold-border border-b-4 border-b-gold-border-dark items-center justify-center mb-2 shadow-sm">
              <MaterialCommunityIcons
                name="hand-heart"
                size={34}
                color={colors.goldDark}
              />
            </View>
            <Text className="text-text-main text-xl font-black text-center tracking-tight">
              Supporter Tip Jar 💖
            </Text>
            <Text className="text-text-muted text-xs font-bold text-center mt-1">
              Help keep PiggySavings 100% private, local-first & ad-free!
            </Text>
          </View>

          {/* Purchase Success State */}
          {purchasedTier ? (
            <View className="bg-emerald-subtle p-5 rounded-3xl border-2 border-emerald-border mb-4 items-center">
              <Text className="text-2xl mb-1">🎉</Text>
              <Text className="text-emerald-dark font-black text-lg text-center">
                Thank You for Supporting!
              </Text>
              <Text className="text-emerald-dark text-xs font-bold text-center mt-1">
                {`Unlocked ${purchasedTier} perks & unlimited goal slots.`}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
              <View className="space-y-3.5 mb-4">
                {TIP_TIERS.map((tier) => {
                  const isSelected = selectedTierId === tier.id;

                  return (
                    <CartoonCard
                      key={tier.id}
                      variant={tier.cardVariant}
                      interactive
                      onPress={() => setSelectedTierId(tier.id)}
                      className={`p-4 mb-3 ${
                        isSelected
                          ? "border-primary"
                          : ""
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1 mr-2">
                          <View className="w-10 h-10 rounded-2xl bg-white-overlay-80 items-center justify-center mr-3 border border-border-card">
                            <MaterialCommunityIcons
                              name={tier.iconName}
                              size={22}
                              color={
                                tier.id === "super_piggy"
                                  ? colors.goldDark
                                  : colors.primary
                              }
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-text-main text-base font-black">
                              {tier.title}
                            </Text>
                            <Text
                              className={`text-[11px] font-black ${
                                tier.id === "super_piggy"
                                  ? "text-gold-dark"
                                  : "text-primary"
                              }`}
                            >
                              {tier.badgeLabel}
                            </Text>
                          </View>
                        </View>

                        {/* Price Badge */}
                        <View className="bg-primary px-3 py-1.5 rounded-2xl shadow-sm border border-primary-light">
                          <Text className="text-white text-xs font-black">
                            {tier.price}
                          </Text>
                        </View>
                      </View>

                      {/* Perks list */}
                      <View className="bg-white-overlay-70 p-2.5 rounded-xl border border-border-card mt-1">
                        {tier.perks.map((perk, index) => (
                          <View
                            key={index}
                            className="flex-row items-center my-0.5"
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color={colors.emerald}
                              style={{ marginRight: 6 }}
                            />
                            <Text className="text-text-main text-xs font-bold flex-1">
                              {perk}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </CartoonCard>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Action button */}
          {!purchasedTier && (
            <View className="mt-2">
              <CartoonCard
                variant="accent"
                interactive
                onPress={() => {
                  const currentTier =
                    TIP_TIERS.find((t) => t.id === selectedTierId) ??
                    TIP_TIERS[1];
                  handlePurchase(currentTier);
                }}
                className="p-3.5 items-center flex-row justify-center"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name="heart"
                      size={18}
                      color={colors.white}
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-black text-sm tracking-wide">
                      {`Support with ${
                        TIP_TIERS.find((t) => t.id === selectedTierId)?.title
                      } (${
                        TIP_TIERS.find((t) => t.id === selectedTierId)?.price
                      })`}
                    </Text>
                  </>
                )}
              </CartoonCard>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default TipJarModal;
