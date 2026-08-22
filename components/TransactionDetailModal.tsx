import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PALETTE_CONFIG, PaletteToken } from "../constants/iconRegistry";
import { colors } from "../constants/theme";
import { useApp } from "../context/AppContext";
import { EnrichedTransactionRow } from "../repositories/transactionRepo";
import { CartoonCard } from "./CartoonCard";

export interface TransactionDetailModalProps {
  visible: boolean;
  transaction: EnrichedTransactionRow | null;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { categories, formatMoney, deleteTransaction, updateTransaction } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Sync state when modal becomes visible or transaction changes
  useEffect(() => {
    if (transaction) {
      setEditNote(transaction.note || "");
      setSelectedCategoryId(transaction.category_id);
      setIsEditing(false);
    }
  }, [transaction, visible]);

  if (!transaction) {
    return null;
  }

  const isIncome = transaction.type === "income";
  const formattedAmount = formatMoney(transaction.amount_cents);

  // Find matching category object
  const currentCategory = categories.find((c) => c.id === transaction.category_id);
  const categoryName = transaction.category_name || currentCategory?.name || (isIncome ? "Income" : "Expense");
  const categoryIcon = transaction.category_icon_name || currentCategory?.icon_name || (isIncome ? "cash-outline" : "receipt-outline");
  const categoryFamily = transaction.category_icon_family || currentCategory?.icon_family || "Ionicons";

  // Categories eligible for editing (same type)
  const eligibleCategories = categories.filter((c) => c.type === transaction.type);

  // Date formatter
  const formattedDate = (() => {
    try {
      const d = new Date(transaction.transaction_date);
      if (isNaN(d.getTime())) return transaction.transaction_date;
      return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return transaction.transaction_date;
    }
  })();

  const handleSaveEdit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await updateTransaction(transaction.id, {
        note: editNote.trim() || null,
        category_id: selectedCategoryId || transaction.category_id,
      });
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert("Update Error", err?.message || "Failed to update transaction.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    let message = "Are you sure you want to permanently delete this transaction from your ledger?";

    if (transaction.allocated_goal_title) {
      message = `Deleting this income transaction will atomically deduct the allocated savings from "${transaction.allocated_goal_title}" and permanently remove it from your ledger.`;
    } else if (transaction.source_goal_title) {
      message = `Deleting this goal-funded expense will atomically restore the spent funds back to "${transaction.source_goal_title}" and permanently remove it from your ledger.`;
    }

    Alert.alert("Delete Transaction?", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (isSubmittingRef.current) return;
          isSubmittingRef.current = true;
          setIsSubmitting(true);
          try {
            await deleteTransaction(transaction.id);
            onClose();
          } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to delete transaction.");
          } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-blackOverlay60 justify-end">
        <Pressable className="flex-1" onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
            className="bg-bg-app rounded-t-4xl px-5 pt-5 border-t-2 border-border-card"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3">
              <View className="flex-row items-center flex-1 pr-2">
                <View
                  className={`will-change-variable w-12 h-12 rounded-2xl items-center justify-center mr-3 ${isIncome ? "bg-emerald" : "bg-rose"
                    }`}
                >
                  {categoryFamily === "MaterialCommunityIcons" ? (
                    <MaterialCommunityIcons
                      name={categoryIcon as any}
                      size={22}
                      color={colors.white}
                    />
                  ) : (
                    <Ionicons
                      name={categoryIcon as any}
                      size={22}
                      color={colors.white}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-text-main text-lg font-black" numberOfLines={1}>
                    {categoryName}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <View
                      className={`will-change-variable px-2 py-0.5 rounded-full mr-2 ${isIncome ? "bg-emerald-subtle" : "bg-rose-subtle"
                        }`}
                    >
                      <Text
                        className={`will-change-variable text-[10px] font-black uppercase tracking-wider ${isIncome ? "text-emerald" : "text-rose"
                          }`}
                      >
                        {isIncome ? "Income" : "Expense"}
                      </Text>
                    </View>
                    {transaction.is_refund === 1 && (
                      <View className="bg-gold-subtle px-2 py-0.5 rounded-full">
                        <Text className="text-gold-dark text-[10px] font-black uppercase tracking-wider">
                          Refund
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                className="w-9 h-9 rounded-full bg-coral-subtle items-center justify-center border border-border-card"
              >
                <Ionicons name="close" size={18} color={colors.textMain} />
              </TouchableOpacity>
            </View>

            {/* Big Amount Readout */}
            <View className="items-center justify-center my-3">
              <Text
                className={`will-change-variable text-3xl font-black ${isIncome ? "text-emerald" : "text-rose"
                  }`}
              >
                {isIncome ? `+${formattedAmount}` : `-${formattedAmount}`}
              </Text>
            </View>

            {/* Goal Linkage Badges */}
            {!!transaction.allocated_goal_title && (
              <CartoonCard variant="gold" className="p-3 mb-3 flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-gold items-center justify-center mr-2.5">
                  <Ionicons name="sparkles" size={16} color={colors.white} />
                </View>
                <View className="flex-1">
                  <Text className="text-text-main font-black text-xs">
                    🎯 Allocated to: {transaction.allocated_goal_title}
                  </Text>
                  {!!transaction.allocated_goal_amount_cents && (
                    <Text className="text-gold-dark font-bold text-[11px]">
                      Saved {formatMoney(transaction.allocated_goal_amount_cents)} towards this goal
                    </Text>
                  )}
                </View>
              </CartoonCard>
            )}

            {!!transaction.source_goal_title && (
              <CartoonCard variant="accent" className="p-3 mb-3 flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-white/20 items-center justify-center mr-2.5">
                  <Ionicons name="shield-checkmark" size={16} color={colors.white} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-black text-xs">
                    🛡️ Deducted from: {transaction.source_goal_title}
                  </Text>
                  <Text className="text-white/80 font-bold text-[11px]">
                    Goal-funded purchase
                  </Text>
                </View>
              </CartoonCard>
            )}

            {/* Normal View Mode */}
            {!isEditing ? (
              <>
                <CartoonCard variant="subtle" className="p-4 mb-4">
                  {/* Date Row */}
                  <View className="flex-row items-center justify-between py-1.5 border-b border-border-card/60">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                      <Text className="text-text-muted text-xs font-bold ml-2">Date</Text>
                    </View>
                    <Text className="text-text-main text-xs font-black">{formattedDate}</Text>
                  </View>

                  {/* Category Row */}
                  <View className="flex-row items-center justify-between py-1.5 border-b border-border-card/60">
                    <View className="flex-row items-center">
                      <Ionicons name="pricetag-outline" size={15} color={colors.textMuted} />
                      <Text className="text-text-muted text-xs font-bold ml-2">Category</Text>
                    </View>
                    <Text className="text-text-main text-xs font-black">{categoryName}</Text>
                  </View>

                  {/* Note Row */}
                  <View className="pt-2">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="document-text-outline" size={15} color={colors.textMuted} />
                      <Text className="text-text-muted text-xs font-bold ml-2">Note</Text>
                    </View>
                    <Text
                      className={`text-xs ${transaction.note ? "text-text-main font-bold" : "text-text-muted italic"
                        }`}
                    >
                      {transaction.note || "No note added"}
                    </Text>
                  </View>
                </CartoonCard>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                  <CartoonCard
                    variant="card"
                    interactive={true}
                    onPress={() => setIsEditing(true)}
                    className="flex-1 py-3.5 items-center justify-center flex-row"
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text className="text-primary font-black text-sm ml-1.5">
                      Edit Details
                    </Text>
                  </CartoonCard>

                  <CartoonCard
                    variant="expense-solid"
                    interactive={true}
                    onPress={handleDelete}
                    className="flex-1 py-3.5 items-center justify-center flex-row"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.white} />
                    <Text className="text-white font-black text-sm ml-1.5">
                      Delete
                    </Text>
                  </CartoonCard>
                </View>
              </>
            ) : (
              /* Inline Edit Mode */
              <>
                <CartoonCard variant="card" className="p-4 mb-4">
                  <Text className="text-text-muted text-xs font-black mb-2 uppercase tracking-wider">
                    Category
                  </Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {eligibleCategories.map((cat) => {
                      const isSelected = cat.id === selectedCategoryId;
                      const paletteToken =
                        (cat.color_code as PaletteToken) || (isIncome ? "emerald" : "primary");
                      const palette = PALETTE_CONFIG[paletteToken] || PALETTE_CONFIG.primary;

                      return (
                        <TouchableOpacity
                          key={cat.id}
                          activeOpacity={0.8}
                          onPress={() => setSelectedCategoryId(cat.id)}
                          className={`will-change-variable flex-row items-center px-3.5 py-2 rounded-2xl border-2 ${
                            isSelected
                              ? `${palette.bgSubtleClass} ${palette.borderClass}`
                              : "bg-bg-app border-border-card border-b-4 border-b-border-card-dark"
                          }`}
                        >
                          {cat.icon_name && (
                            <View className="mr-1.5">
                              {cat.icon_family === "MaterialCommunityIcons" ? (
                                <MaterialCommunityIcons
                                  name={cat.icon_name as any}
                                  size={15}
                                  color={isSelected ? palette.iconColor : colors.textMuted}
                                />
                              ) : (
                                <Ionicons
                                  name={cat.icon_name as any}
                                  size={15}
                                  color={isSelected ? palette.iconColor : colors.textMuted}
                                />
                              )}
                            </View>
                          )}
                          <Text
                            className={`will-change-variable text-xs font-black ${
                              isSelected ? palette.textClass : "text-text-main"
                            }`}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text className="text-text-muted text-xs font-black mb-2 uppercase tracking-wider">
                    Note
                  </Text>
                  <View className="bg-bg-app rounded-2xl p-3 border-2 border-border-card border-b-4 border-b-border-card-dark">
                    <TextInput
                      value={editNote}
                      onChangeText={setEditNote}
                      placeholder="Enter transaction note..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={2}
                      className="text-text-main text-xs font-bold py-0"
                    />
                  </View>
                </CartoonCard>

                {/* Edit Actions */}
                <View className="flex-row gap-3">
                  <CartoonCard
                    variant="subtle"
                    interactive={true}
                    onPress={() => {
                      setEditNote(transaction.note || "");
                      setSelectedCategoryId(transaction.category_id);
                      setIsEditing(false);
                    }}
                    className="flex-1 py-3.5 items-center justify-center"
                  >
                    <Text className="text-text-muted font-black text-sm">Cancel</Text>
                  </CartoonCard>

                  <CartoonCard
                    variant="income-solid"
                    interactive={true}
                    onPress={handleSaveEdit}
                    className="flex-1 py-3.5 items-center justify-center"
                  >
                    <Text className="text-white font-black text-sm">
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Text>
                  </CartoonCard>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default TransactionDetailModal;
