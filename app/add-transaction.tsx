import { CartoonCard } from "@/components/CartoonCard";
import { CategoryFormModal } from "@/components/CategoryFormModal";
import { getCurrency, parseCurrencyToCents } from "@/constants/currencies";
import { PALETTE_CONFIG, PaletteToken } from "@/constants/iconRegistry";
import { colors } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { CategoryRow, RecurringFrequency } from "@/services/db/types";
import { getLocalTodayStr, parseClampedCustomDays } from "@/services/recurring/recurringEngine";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
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
  const { goals, categories, currencyCode, currencySymbol, formatMoney, addTransaction } = useApp();

  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Partial Income Allocation State
  const [allocationType, setAllocationType] = useState<"10%" | "20%" | "50%" | "100%" | "custom">("100%");
  const [customAllocationAmount, setCustomAllocationAmount] = useState("");

  // Goal-Funded Expense State
  const [selectedSourceGoalId, setSelectedSourceGoalId] = useState<string | null>(null);

  // Category creation modal state
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  // Detailed Recurring Schedule State (matches RecurringScheduleModal)
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [customDays, setCustomDays] = useState("15");
  const [dayOfMonth, setDayOfMonth] = useState(String(new Date().getDate()));

  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<TextInput>(null);

  const activeCurrency = useMemo(() => getCurrency(currencyCode), [currencyCode]);

  // Filter categories matching current type
  const matchingCategories = useMemo(() => {
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  // Total transaction amount in cents
  const totalAmountCents = useMemo(() => {
    const parsed = parseCurrencyToCents(amount, currencyCode);
    return parsed?.cents && parsed.cents > 0 ? parsed.cents : 0;
  }, [amount, currencyCode]);

  // Selected goals helpers
  const selectedGoal = useMemo(() => {
    return goals.find((g) => g.id === selectedGoalId) ?? null;
  }, [goals, selectedGoalId]);

  const selectedSourceGoal = useMemo(() => {
    return goals.find((g) => g.id === selectedSourceGoalId) ?? null;
  }, [goals, selectedSourceGoalId]);

  // Calculate allocated goal cents and remaining spendable cash
  const allocatedGoalCents = useMemo(() => {
    if (type !== "income" || !selectedGoalId || totalAmountCents <= 0) {
      return 0;
    }
    let rawCents = 0;
    switch (allocationType) {
      case "10%":
        rawCents = Math.round(totalAmountCents * 0.1);
        break;
      case "20%":
        rawCents = Math.round(totalAmountCents * 0.2);
        break;
      case "50%":
        rawCents = Math.round(totalAmountCents * 0.5);
        break;
      case "100%":
        rawCents = totalAmountCents;
        break;
      case "custom": {
        const parsedCustom = parseCurrencyToCents(customAllocationAmount, currencyCode);
        rawCents = parsedCustom?.cents ? parsedCustom.cents : 0;
        break;
      }
    }
    return Math.min(totalAmountCents, Math.max(0, rawCents));
  }, [type, selectedGoalId, totalAmountCents, allocationType, customAllocationAmount, currencyCode]);

  const remainingSpendableCents = useMemo(() => {
    return Math.max(0, totalAmountCents - allocatedGoalCents);
  }, [totalAmountCents, allocatedGoalCents]);

  // Set default category when type changes or preserve valid selection
  React.useEffect(() => {
    if (matchingCategories.length > 0) {
      if (!selectedCategoryId || !matchingCategories.some((c) => c.id === selectedCategoryId)) {
        setSelectedCategoryId(matchingCategories[0].id);
      }
    } else {
      setSelectedCategoryId(null);
    }
  }, [matchingCategories, selectedCategoryId]);

  // Listen for keyboard dismiss to reset scroll headroom
  React.useEffect(() => {
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      noteInputRef.current?.blur();
      setIsNoteFocused(false);
    });

    return () => {
      hideSubscription.remove();
    };
  }, []);

  const handleCategoryCreated = (newCategory: CategoryRow) => {
    if (newCategory.type === type) {
      setSelectedCategoryId(newCategory.id);
    }
    setIsCategoryModalVisible(false);
  };

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

    // Validate 20% goal reserve protection rule if funded by a savings goal
    if (type === "expense" && selectedSourceGoalId && selectedSourceGoal) {
      const currentGoalCents = selectedSourceGoal.current_amount_cents || 0;
      const maxDeductibleCents = Math.floor(currentGoalCents * 0.8);
      const minReserveCents = currentGoalCents - maxDeductibleCents;

      if (amountInCents > maxDeductibleCents) {
        Alert.alert(
          "Goal Reserve Protected 🛡️",
          `You can deduct a maximum of ${formatMoney(maxDeductibleCents)} from "${selectedSourceGoal.title}". At least 20% (${formatMoney(minReserveCents)}) must remain reserved to protect your savings momentum.`
        );
        return;
      }
    }

    const categoryId = matchingCategories.some(
      (category) => category.id === selectedCategoryId
    )
      ? selectedCategoryId
      : null;

    if (!categoryId) {
      Alert.alert("Category Required", "Select a category before you save this transaction.");
      return;
    }

    const customDaysNum = frequency === "custom" ? parseClampedCustomDays(customDays) : null;
    const parsedDayOfMonth = parseInt(dayOfMonth, 10);
    const dayOfMonthNum =
      frequency === "monthly"
        ? !isNaN(parsedDayOfMonth) && parsedDayOfMonth >= 1 && parsedDayOfMonth <= 31
          ? parsedDayOfMonth
          : 1
        : null;

    const idempotencyKey = generateUUIDv4();
    const transactionId = generateUUIDv4();
    const transactionDate = getLocalTodayStr();

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Insert Transaction with optional goal contribution and detailed recurring schedule atomically (ACID)
      await addTransaction(
        {
          id: transactionId,
          category_id: categoryId,
          type,
          amount_cents: amountInCents,
          note: note.trim() || (type === "income" ? "Income Deposit" : "Expense"),
          transaction_date: transactionDate,
          idempotency_key: idempotencyKey,
          source_goal_id: type === "expense" ? selectedSourceGoalId : undefined,
        },
        type === "income" && selectedGoalId && allocatedGoalCents > 0
          ? {
              goal_id: selectedGoalId,
              amount_cents: allocatedGoalCents,
              note: note.trim() || "Auto-allocated from quick transaction",
              idempotency_key: generateUUIDv4(),
            }
          : undefined,
        isRecurring
          ? {
              category_id: categoryId,
              title: note.trim() || (type === "income" ? "Recurring Income" : "Recurring Expense"),
              type,
              amount_cents: amountInCents,
              frequency,
              custom_interval_days: customDaysNum,
              day_of_month: dayOfMonthNum,
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-bg-app"
    >
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
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

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 16) + (isNoteFocused ? 280 : 32),
          }}
        >
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
                className={`will-change-variable text-3xl font-black mr-1 ${
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
                className={`will-change-variable text-4xl font-black flex-1 ${
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
              const paletteToken = (c.color_code as PaletteToken) || (type === "income" ? "emerald" : "primary");
              const palette = PALETTE_CONFIG[paletteToken] || PALETTE_CONFIG.primary;

              return (
                <TouchableOpacity
                  key={c.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategoryId(c.id)}
                  className={`will-change-variable flex-row items-center px-3.5 py-2 rounded-2xl border-2 ${
                    isSelected
                      ? `${palette.bgSubtleClass} ${palette.borderClass}`
                      : "bg-bg-card border-border-card border-b-4 border-b-border-card-dark"
                  }`}
                >
                  {c.icon_name && (
                    <View className="mr-1.5">
                      {c.icon_family === "MaterialCommunityIcons" ? (
                        <MaterialCommunityIcons
                          name={c.icon_name as any}
                          size={15}
                          color={isSelected ? palette.iconColor : colors.textMuted}
                        />
                      ) : (
                        <Ionicons
                          name={c.icon_name as any}
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
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Inline + New Category Chip */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsCategoryModalVisible(true)}
              className="will-change-variable flex-row items-center px-3.5 py-2 rounded-2xl bg-coral-subtle border-2 border-dashed border-primary-light border-b-4 border-b-primary-dark"
            >
              <Ionicons name="add-circle" size={15} color={colors.primary} />
              <Text className="text-primary text-xs font-black ml-1.5">
                New Category
              </Text>
            </TouchableOpacity>
          </View>

          {/* Goal Allocation Selector (Optional - Income Only) */}
          {type === "income" && (
            <>
              <Text className="text-text-main text-sm font-black mb-2">
                Target Goal Auto-Allocation (Optional)
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
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
                    className={`will-change-variable text-xs font-black ${
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
                        className={`will-change-variable text-xs font-black ${
                          isSelected ? "text-primary" : "text-text-main"
                        }`}
                      >
                        🎯 {g.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Partial Allocation Selector (when goal is selected) */}
              {selectedGoalId !== null && (
                <View className="mb-5">
                  <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">
                    Allocation Split
                  </Text>

                  {/* Tactile Split Pills */}
                  <View className="flex-row flex-wrap gap-2 mb-3">
                    {(["10%", "20%", "50%", "100%", "custom"] as const).map((split) => {
                      const isSelected = allocationType === split;
                      const label = split === "custom" ? "Custom $" : split;
                      return (
                        <TouchableOpacity
                          key={split}
                          activeOpacity={0.8}
                          onPress={() => setAllocationType(split)}
                          className={`will-change-variable px-3.5 py-1.5 rounded-2xl border-2 ${
                            isSelected
                              ? "bg-primary border-primary-light border-b-4 border-b-primary-dark"
                              : "bg-bg-card border-border-card border-b-4 border-b-border-card-dark"
                          }`}
                        >
                          <Text
                            className={`will-change-variable text-xs font-black ${
                              isSelected ? "text-white" : "text-text-main"
                            }`}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom Allocation Amount Input */}
                  {allocationType === "custom" && (
                    <View className="flex-row items-center bg-bg-card rounded-2xl px-4 py-2.5 mb-3 border-2 border-border-card border-b-4 border-b-border-card-dark">
                      <Text className="text-primary font-black text-base mr-1.5">
                        {currencySymbol.trim()}
                      </Text>
                      <TextInput
                        value={customAllocationAmount}
                        onChangeText={setCustomAllocationAmount}
                        placeholder={activeCurrency.decimal_digits === 0 ? "0" : "0.00"}
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        className="flex-1 text-sm text-text-main font-black"
                      />
                    </View>
                  )}

                  {/* Live Feedback Banner */}
                  <CartoonCard variant="subtle" className="p-3.5">
                    <Text className="text-text-main text-xs font-bold leading-5">
                      💡 <Text className="text-primary font-black">{formatMoney(allocatedGoalCents)}</Text> will go to 🎯 <Text className="font-black">{selectedGoal?.title}</Text> • <Text className="text-emerald font-black">{formatMoney(remainingSpendableCents)}</Text> stays as Spendable Cash
                    </Text>
                  </CartoonCard>
                </View>
              )}
            </>
          )}

          {/* Goal-Funded Expense Selector (Expense Mode with active goals) */}
          {type === "expense" && goals.length > 0 && (
            <View className="mb-5">
              <Text className="text-text-main text-sm font-black mb-2">
                Funded From Savings Goal? (Optional)
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedSourceGoalId(null)}
                  className={`will-change-variable px-3.5 py-2 rounded-2xl border-2 ${
                    selectedSourceGoalId === null
                      ? "bg-coral-subtle border-primary border-b-4 border-b-primary-dark"
                      : "bg-bg-card border-border-card border-b-4 border-b-border-card-dark"
                  }`}
                >
                  <Text
                    className={`will-change-variable text-xs font-black ${
                      selectedSourceGoalId === null ? "text-primary" : "text-text-muted"
                    }`}
                  >
                    Regular Cashflow
                  </Text>
                </TouchableOpacity>

                {goals.map((g) => {
                  const isSelected = selectedSourceGoalId === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      activeOpacity={0.8}
                      onPress={() => setSelectedSourceGoalId(g.id)}
                      className={`will-change-variable px-3.5 py-2 rounded-2xl border-2 ${
                        isSelected
                          ? "bg-coral-subtle border-primary border-b-4 border-b-primary-dark"
                          : "bg-bg-card border-border-card border-b-4 border-b-border-card-dark"
                      }`}
                    >
                      <Text
                        className={`will-change-variable text-xs font-black ${
                          isSelected ? "text-primary" : "text-text-main"
                        }`}
                      >
                        🎯 {g.title} ({formatMoney(g.current_amount_cents)})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Goal-Funded 20% Reserve Safeguard Banner */}
              {selectedSourceGoalId !== null && selectedSourceGoal && (() => {
                const currentGoalCents = selectedSourceGoal.current_amount_cents || 0;
                const maxDeductibleCents = Math.floor(currentGoalCents * 0.8);
                const minReserveCents = currentGoalCents - maxDeductibleCents;
                const parsedEntered = parseCurrencyToCents(amount, currencyCode);
                const enteredCents = parsedEntered?.cents || 0;
                const isOverLimit = enteredCents > maxDeductibleCents;

                if (isOverLimit) {
                  return (
                    <CartoonCard variant="expense" className="p-3.5 flex-row items-start">
                      <Ionicons name="warning" size={18} color={colors.rose} style={{ marginTop: 2, marginRight: 8 }} />
                      <View className="flex-1">
                        <Text className="text-rose-dark text-xs font-black mb-0.5">
                          Deduction Limit Exceeded
                        </Text>
                        <Text className="text-text-main text-xs font-bold leading-4">
                          You can deduct at most <Text className="text-rose font-black">{formatMoney(maxDeductibleCents)}</Text> (80%) from &apos;{selectedSourceGoal.title}&apos;. At least <Text className="font-black text-rose">{formatMoney(minReserveCents)}</Text> (20%) must remain reserved.
                        </Text>
                      </View>
                    </CartoonCard>
                  );
                }

                return (
                  <CartoonCard variant="gold" className="p-3.5 flex-row items-start">
                    <Ionicons name="shield-checkmark" size={18} color={colors.goldDark} style={{ marginTop: 2, marginRight: 8 }} />
                    <View className="flex-1">
                      <Text className="text-gold-dark text-xs font-black mb-0.5">
                        20% Goal Reserve Protected
                      </Text>
                      <Text className="text-text-main text-xs font-bold leading-4">
                        Deducting from <Text className="font-black text-gold-dark">{selectedSourceGoal.title}</Text>. You can use up to <Text className="font-black text-text-main">{formatMoney(maxDeductibleCents)}</Text>. A minimum reserve of <Text className="font-black text-gold-dark">{formatMoney(minReserveCents)}</Text> (20%) remains locked to protect your savings momentum.
                      </Text>
                    </View>
                  </CartoonCard>
                );
              })()}
            </View>
          )}

          {/* Description / Note */}
          <Text className="text-text-main text-sm font-black mb-2">
            Description / Note
          </Text>
          <CartoonCard className="mb-5 p-3.5">
            <TextInput
              ref={noteInputRef}
              value={note}
              onChangeText={setNote}
              onFocus={() => {
                setIsNoteFocused(true);
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 260, animated: true });
                }, 100);
              }}
              onBlur={() => {
                setIsNoteFocused(false);
              }}
              placeholder="e.g., Paycheck, Client Deposit, Groceries..."
              placeholderTextColor={colors.textMuted}
              className="text-sm text-text-main font-semibold"
            />
          </CartoonCard>

          {/* Schedule as Recurring Detailed Settings Card */}
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

            {/* Detailed Recurring Frequency & Interval Pickers */}
            {isRecurring && (
              <View className="mt-3 pt-3 border-t border-border-card">
                <Text className="text-text-muted text-xs font-bold uppercase mb-2">
                  Frequency Interval
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {[
                    { id: "weekly", label: "Weekly" },
                    { id: "biweekly", label: "Every 2 Weeks" },
                    { id: "monthly", label: "Monthly" },
                    { id: "custom", label: "Custom Days" },
                  ].map((item) => {
                    const isSelected = frequency === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => setFrequency(item.id as RecurringFrequency)}
                        className={`will-change-variable px-3 py-1.5 rounded-2xl border-2 ${
                          isSelected
                            ? "bg-primary border-primary-light border-b-4 border-b-primary-dark"
                            : "bg-bg-app border-border-card border-b-4 border-b-border-card-dark"
                        }`}
                      >
                        <Text
                          className={`will-change-variable text-xs font-black ${
                            isSelected ? "text-white" : "text-text-main"
                          }`}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Day of Month picker when Monthly is selected */}
                {frequency === "monthly" && (
                  <View className="flex-row items-center bg-bg-app rounded-2xl px-4 py-2.5 border-2 border-border-card border-b-4 border-b-border-card-dark">
                    <Text className="text-text-muted text-xs font-bold mr-2">Day of Month:</Text>
                    <TextInput
                      value={dayOfMonth}
                      onChangeText={setDayOfMonth}
                      keyboardType="number-pad"
                      maxLength={2}
                      className="bg-bg-card px-3 py-1 rounded-xl text-text-main font-black text-sm border border-border-card w-16 text-center"
                    />
                    <Text className="text-text-muted text-[11px] font-bold ml-2">(1–31)</Text>
                  </View>
                )}

                {/* Custom interval repeat input when Custom Days is selected */}
                {frequency === "custom" && (
                  <View className="flex-row items-center bg-bg-app rounded-2xl px-4 py-2.5 border-2 border-border-card border-b-4 border-b-border-card-dark">
                    <Text className="text-text-muted text-xs font-bold mr-2">Repeat every</Text>
                    <TextInput
                      value={customDays}
                      onChangeText={setCustomDays}
                      keyboardType="number-pad"
                      maxLength={3}
                      className="bg-bg-card px-3 py-1 rounded-xl text-text-main font-black text-sm border border-border-card w-16 text-center"
                    />
                    <Text className="text-text-muted text-xs font-bold ml-2">days</Text>
                    <Text className="text-text-muted text-[11px] font-bold ml-1">(1–365)</Text>
                  </View>
                )}
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

      {/* Category Creation Modal */}
      <CategoryFormModal
        visible={isCategoryModalVisible}
        onClose={() => setIsCategoryModalVisible(false)}
        defaultType={type}
        onSuccess={handleCategoryCreated}
      />
    </KeyboardAvoidingView>
  );
}