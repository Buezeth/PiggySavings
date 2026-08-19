import CartoonCard from "@/components/CartoonCard";
import { colors } from "@/constants/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { RecurringFrequency } from "@/services/db/types";

import { parseCurrencyToCents, getCurrency } from "@/constants/currencies";

// Helper function to generate UUID v4 idempotency key
const generateUUIDv4 = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function AddTransactionModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { goals, categories, currencyCode, currencySymbol, addTransaction, createRecurringSchedule } = useApp();

  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Recurring Schedule State
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCurrency = useMemo(() => getCurrency(currencyCode), [currencyCode]);

  // Filter categories matching current type
  const matchingCategories = useMemo(() => {
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  // Set default category when type changes
  React.useEffect(() => {
    if (matchingCategories.length > 0) {
      setSelectedCategoryId(matchingCategories[0].id);
    } else {
      setSelectedCategoryId(null);
    }
  }, [matchingCategories]);

  const handleSave = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    const parsedResult = parseCurrencyToCents(amount, currencyCode);
    if (!parsedResult) {
      Alert.alert("Invalid Amount", "Please enter a valid positive transaction amount.");
      return;
    }

    if (parsedResult.error) {
      Alert.alert("Invalid Amount", parsedResult.error);
      return;
    }

    const amountInCents = parsedResult.cents;

    const categoryId = selectedCategoryId || (type === "income" ? "cat_salary" : "cat_dining");
    const idempotencyKey = generateUUIDv4();
    const transactionId = generateUUIDv4();
    const transactionDate = new Date().toISOString();

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Insert Transaction with optional goal contribution and recurring schedule atomically (ACID)
      await addTransaction(
        {
          id: transactionId,
          category_id: categoryId,
          type,
          amount_cents: amountInCents,
          note: note.trim() || (type === "income" ? "Income Deposit" : "Expense"),
          transaction_date: transactionDate,
          idempotency_key: idempotencyKey,
        },
        selectedGoalId
          ? {
              goal_id: selectedGoalId,
              amount_cents: amountInCents,
              note: note.trim() || "Auto-allocated from quick transaction",
            }
          : undefined,
        isRecurring
          ? {
              category_id: categoryId,
              title: note.trim() || (type === "income" ? "Recurring Income" : "Recurring Expense"),
              type,
              amount_cents: amountInCents,
              frequency,
              start_date: transactionDate,
            }
          : undefined
      );

      router.back();
    } catch (err) {
      console.error("Failed to save transaction:", err);
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to record transaction.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-bg-app"
    >
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 16),
        }}
        className="flex-1 px-6"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-5">
          <Text className="text-text-main text-xl font-black">
            Quick Add Transaction ⚡
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close add transaction"
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-bg-card items-center justify-center border-2 border-border-card border-b-4 border-b-border-card-dark"
          >
            <Ionicons name="close" size={20} color={colors.textMain} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Income vs Expense Tactile Segmented Switch */}
          <View className="flex-row bg-bg-card p-1.5 rounded-3xl border-2 border-border-card border-b-4 border-b-border-card-dark mb-5">
            <TouchableOpacity
              onPress={() => setType("income")}
              activeOpacity={0.8}
              className={`will-change-variable flex-1 py-3 rounded-2xl items-center justify-center ${
                type === "income"
                  ? "bg-emerald border-2 border-emerald-light border-b-4 border-b-emerald-dark"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`will-change-variable text-xs font-black ${
                  type === "income" ? "text-white" : "text-text-muted"
                }`}
              >
                + Income / Funding
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setType("expense")}
              activeOpacity={0.8}
              className={`will-change-variable flex-1 py-3 rounded-2xl items-center justify-center ${
                type === "expense"
                  ? "bg-rose border-2 border-rose-light border-b-4 border-b-rose-dark"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`will-change-variable text-xs font-black ${
                  type === "expense" ? "text-white" : "text-text-muted"
                }`}
              >
                - Expense / Spent
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <CartoonCard
            variant={type === "income" ? "income" : "expense"}
            className="mb-5 p-5 items-center"
          >
            <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">
              Transaction Amount
            </Text>
            <View className="flex-row items-center justify-center">
              <Text
                className={`text-3xl font-black mr-1 ${
                  type === "income" ? "text-emerald" : "text-rose"
                }`}
              >
                {type === "income" ? `+${currencySymbol.trim()}` : `-${currencySymbol.trim()}`}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder={activeCurrency.decimal_digits === 0 ? "0" : "0.00"}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={{ textAlign: "center" }}
                className={`text-4xl font-black flex-1 ${
                  type === "income" ? "text-emerald" : "text-rose"
                }`}
              />
            </View>
            {(activeCurrency.rounding > 0 || activeCurrency.decimal_digits === 0) && (
              <Text className="text-text-muted text-[11px] font-bold mt-1">
                {activeCurrency.rounding > 0
                  ? `Rounds to nearest ${activeCurrency.rounding} step`
                  : "Zero-decimal currency"}
              </Text>
            )}
          </CartoonCard>

          {/* Category Selector */}
          <Text className="text-text-main text-sm font-black mb-2">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-5">
            {matchingCategories.map((c) => {
              const isSelected = selectedCategoryId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategoryId(c.id)}
                  className={`will-change-variable px-3 py-2 rounded-2xl border-2 ${
                    isSelected
                      ? "bg-coral-subtle border-primary border-b-4 border-b-primary-dark"
                      : "bg-bg-card border-border-card border-b-4 border-b-border-card-dark"
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      isSelected ? "text-primary" : "text-text-main"
                    }`}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Goal Allocation Selector (Optional) */}
          <Text className="text-text-main text-sm font-black mb-2">
            Target Goal Auto-Allocation (Optional)
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-5">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedGoalId(null)}
              className={`will-change-variable px-3.5 py-2 rounded-2xl border-2 ${
                selectedGoalId === null
                  ? "bg-coral-subtle border-primary border-b-4 border-b-primary-dark"
                  : "bg-bg-card border-border-card border-b-4 border-b-border-card-dark"
              }`}
            >
              <Text
                className={`text-xs font-black ${
                  selectedGoalId === null ? "text-primary" : "text-text-muted"
                }`}
              >
                None
              </Text>
            </TouchableOpacity>

            {goals.map((g) => {
              const isSelected = selectedGoalId === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedGoalId(g.id)}
                  className={`will-change-variable px-3.5 py-2 rounded-2xl border-2 ${
                    isSelected
                      ? "bg-coral-subtle border-primary border-b-4 border-b-primary-dark"
                      : "bg-bg-card border-border-card border-b-4 border-b-border-card-dark"
                  }`}
                >
                  <Text
                    className={`text-xs font-black ${
                      isSelected ? "text-primary" : "text-text-main"
                    }`}
                  >
                    🎯 {g.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Description / Note */}
          <Text className="text-text-main text-sm font-black mb-2">
            Description / Note
          </Text>
          <CartoonCard className="mb-5 p-3.5">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g., Paycheck, Client Deposit, Groceries..."
              placeholderTextColor={colors.textMuted}
              className="text-sm text-text-main font-semibold"
            />
          </CartoonCard>

          {/* Schedule as Recurring Toggle */}
          <CartoonCard className="mb-6 p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-xl bg-coral-subtle items-center justify-center mr-2.5">
                  <MaterialCommunityIcons name="repeat" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text className="text-text-main text-sm font-black">
                    Schedule as Recurring
                  </Text>
                  <Text className="text-text-muted text-[11px] font-bold">
                    Automatically log this transaction on schedule
                  </Text>
                </View>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: colors.mutedTrack, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {/* Recurring Frequency options */}
            {isRecurring && (
              <View className="mt-3 pt-3 border-t border-border-card">
                <Text className="text-text-muted text-xs font-bold uppercase mb-2">
                  Frequency Interval
                </Text>
                <View className="flex-row gap-2">
                  {(
                    [
                      { id: "weekly", label: "Weekly" },
                      { id: "biweekly", label: "Every 15 Days" },
                      { id: "monthly", label: "Monthly" },
                    ] as const
                  ).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setFrequency(item.id)}
                      className={`px-3 py-1.5 rounded-full border ${
                        frequency === item.id
                          ? "bg-primary border-primary-dark"
                          : "bg-bg-app border-border-card"
                      }`}
                    >
                      <Text
                        className={`text-xs font-black ${
                          frequency === item.id ? "text-white" : "text-text-muted"
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </CartoonCard>

          {/* Tactile Gamified Submit Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting}
            activeOpacity={0.85}
            className="bg-primary border-2 border-primary-light border-b-4 border-b-primary-dark rounded-2xl py-4 items-center justify-center mb-8"
          >
            <Text className="text-white text-base font-black uppercase tracking-wider">
              {isSubmitting ? "Recording..." : "Save Transaction & Allocate 🎯"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}


