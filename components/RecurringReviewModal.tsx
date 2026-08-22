import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrency, parseCurrencyToCents } from "../constants/currencies";
import { PALETTE_CONFIG, PaletteToken } from "../constants/iconRegistry";
import { colors } from "../constants/theme";
import { useApp } from "../context/AppContext";
import { RecurringScheduleRow } from "../services/db/types";
import { CartoonCard } from "./CartoonCard";

export interface RecurringReviewModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RecurringReviewModal: React.FC<RecurringReviewModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = Math.round(screenHeight * 0.88);

  const {
    categories,
    pendingRecurringSchedules,
    currencyCode,
    currencySymbol,
    formatMoney,
    confirmRecurringSchedule,
    skipRecurringOccurrence,
  } = useApp();

  const activeCurrency = getCurrency(currencyCode);

  // Per-schedule custom amount inputs
  const [editedAmounts, setEditedAmounts] = useState<Record<string, string>>({});
  const [processingScheduleId, setProcessingScheduleId] = useState<string | null>(null);

  const getInitialAmountText = (schedule: RecurringScheduleRow): string => {
    if (editedAmounts[schedule.id] !== undefined) {
      return editedAmounts[schedule.id];
    }
    if (activeCurrency.decimal_digits === 0) {
      return String(schedule.amount_cents);
    }
    return (schedule.amount_cents / 100).toFixed(activeCurrency.decimal_digits);
  };

  const handleAmountChange = (scheduleId: string, text: string) => {
    setEditedAmounts((prev) => ({ ...prev, [scheduleId]: text }));
  };

  const handleConfirm = async (schedule: RecurringScheduleRow) => {
    if (processingScheduleId) return;

    const amountText = getInitialAmountText(schedule);
    const parsed = parseCurrencyToCents(amountText, currencyCode);

    if (!parsed) {
      Alert.alert("Invalid Amount", "Please enter a valid positive amount.");
      return;
    }
    if (parsed.error) {
      Alert.alert("Invalid Amount", parsed.error);
      return;
    }

    try {
      setProcessingScheduleId(schedule.id);
      await confirmRecurringSchedule(schedule.id, parsed.cents);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to confirm recurring bill.");
    } finally {
      setProcessingScheduleId(null);
    }
  };

  const handleSkip = async (schedule: RecurringScheduleRow) => {
    if (processingScheduleId) return;

    Alert.alert(
      "Skip Occurrence",
      `Skip this occurrence for "${schedule.title}"? No transaction will be logged.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessingScheduleId(schedule.id);
              await skipRecurringOccurrence(schedule.id);
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to skip recurring occurrence.");
            } finally {
              setProcessingScheduleId(null);
            }
          },
        },
      ]
    );
  };

  const pendingCount = pendingRecurringSchedules.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-black-overlay-60 justify-end"
      >
        <Pressable className="flex-1" onPress={onClose} />

        <View
          style={{
            height: sheetHeight,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
          className="bg-bg-app rounded-t-[36px] border-t-2 border-border-card overflow-hidden flex-col"
        >
          {/* Header */}
          <View className="p-4 border-b border-border-card flex-row items-center justify-between bg-bg-card">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-gold-subtle border border-gold-border items-center justify-center mr-1">
                <Ionicons name="flash" size={16} color={colors.goldDark} />
              </View>
              <Text className="text-text-main text-lg font-black tracking-tight">
                Review Recurring Bills
              </Text>
              {pendingCount > 0 && (
                <View className="bg-gold px-2 py-0.5 rounded-full border border-gold-dark ml-1">
                  <Text className="text-white text-[11px] font-black">{pendingCount}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center"
              accessibilityLabel="Close review modal"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            className="flex-1 p-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 14 }}
          >
            {pendingCount === 0 ? (
              <CartoonCard className="p-6 items-center my-auto">
                <View className="w-14 h-14 rounded-3xl bg-emerald-subtle border-2 border-emerald-border border-b-4 border-b-emerald-border-dark items-center justify-center mb-3">
                  <Ionicons name="checkmark-done" size={28} color={colors.emerald} />
                </View>
                <Text className="text-text-main text-lg font-black mb-1">
                  All Caught Up! 🎉
                </Text>
                <Text className="text-text-muted text-xs font-bold text-center mb-5 leading-4">
                  There are no pending recurring bills or paychecks waiting for review.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onClose}
                  className="bg-primary px-6 py-3 rounded-2xl border-2 border-primary-light border-b-4 border-b-primary-dark"
                >
                  <Text className="text-white text-xs font-black uppercase">
                    Done
                  </Text>
                </TouchableOpacity>
              </CartoonCard>
            ) : (
              pendingRecurringSchedules.map((schedule) => {
                const category = categories.find((c) => c.id === schedule.category_id);
                const paletteToken =
                  (category?.color_code as PaletteToken) ||
                  (schedule.type === "income" ? "emerald" : "primary");
                const palette = PALETTE_CONFIG[paletteToken] || PALETTE_CONFIG.primary;
                const isBusy = processingScheduleId === schedule.id;
                const amountText = getInitialAmountText(schedule);

                return (
                  <CartoonCard key={schedule.id} className="p-4">
                    {/* Top Row: Category Icon & Title & Frequency */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View
                          className={`will-change-variable w-11 h-11 rounded-2xl items-center justify-center mr-3 border-2 border-b-4 ${palette.bgSubtleClass} ${palette.borderClass}`}
                        >
                          {category?.icon_family === "MaterialCommunityIcons" ? (
                            <MaterialCommunityIcons
                              name={(category?.icon_name as any) || "repeat"}
                              size={20}
                              color={palette.colorCode}
                            />
                          ) : (
                            <Ionicons
                              name={(category?.icon_name as any) || "repeat"}
                              size={20}
                              color={palette.colorCode}
                            />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-text-main text-sm font-black" numberOfLines={1}>
                            {schedule.title}
                          </Text>
                          <Text className="text-text-muted text-[11px] font-bold mt-0.5">
                            Due {schedule.next_occurrence} • {schedule.frequency}
                          </Text>
                        </View>
                      </View>

                      <View
                        className={`px-2.5 py-1 rounded-xl border ${
                          schedule.type === "income"
                            ? "bg-emerald-subtle border-emerald-border"
                            : "bg-rose-subtle border-rose-border"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-black uppercase ${
                            schedule.type === "income" ? "text-emerald-dark" : "text-rose-dark"
                          }`}
                        >
                          {schedule.type === "income" ? "+ Income" : "- Expense"}
                        </Text>
                      </View>
                    </View>

                    {/* Amount Input Section (Editable for variable utility/bills) */}
                    <View className="bg-bg-app p-3 rounded-2xl border-2 border-border-card mb-3">
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-text-muted text-[11px] font-bold uppercase tracking-wider">
                          Amount to Log:
                        </Text>
                        <Text className="text-text-muted text-[10px] font-bold">
                          Default: {formatMoney(schedule.amount_cents)}
                        </Text>
                      </View>

                      <View className="flex-row items-center bg-bg-card rounded-xl border border-border-card px-3 py-1.5">
                        <Text className="text-primary font-black text-sm mr-1.5">
                          {currencySymbol.trim()}
                        </Text>
                        <TextInput
                          value={amountText}
                          onChangeText={(text) => handleAmountChange(schedule.id, text)}
                          placeholder="0.00"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="decimal-pad"
                          editable={!isBusy}
                          className="flex-1 text-sm text-text-main font-black py-0"
                        />
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={isBusy}
                        onPress={() => handleSkip(schedule)}
                        className="flex-1 py-2.5 rounded-2xl bg-bg-app border-2 border-border-card border-b-4 border-b-border-card-dark items-center justify-center"
                      >
                        <Text className="text-text-muted text-xs font-black uppercase">
                          Skip
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={isBusy}
                        onPress={() => handleConfirm(schedule)}
                        className="flex-2 py-2.5 px-4 rounded-2xl bg-primary border-2 border-primary-light border-b-4 border-b-primary-dark items-center justify-center flex-row"
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color={colors.white} style={{ marginRight: 6 }} />
                            <Text className="text-white text-xs font-black uppercase tracking-wider">
                              Confirm & Log
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </CartoonCard>
                );
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RecurringReviewModal;
