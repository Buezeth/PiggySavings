import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrency, parseCurrencyToCents } from "../constants/currencies";
import { PALETTE_CONFIG, PaletteToken } from "../constants/iconRegistry";
import { colors } from "../constants/theme";
import { useApp } from "../context/AppContext";
import { RecurringFrequency, RecurringScheduleRow } from "../services/db/types";
import { calculateNextOccurrence, getLocalTodayStr, parseClampedCustomDays } from "../services/recurring/recurringEngine";

export interface RecurringScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  scheduleToEdit?: RecurringScheduleRow | null;
}

export const RecurringScheduleModal: React.FC<RecurringScheduleModalProps> = ({
  visible,
  onClose,
  scheduleToEdit,
}) => {
  const insets = useSafeAreaInsets();
  const {
    categories,
    currencyCode,
    currencySymbol,
    createRecurringSchedule,
    updateRecurringSchedule,
  } = useApp();

  const isEditing = !!scheduleToEdit;
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<"income" | "expense">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [customDays, setCustomDays] = useState("15");
  const [dayOfMonth, setDayOfMonth] = useState(String(new Date().getDate()));

  const activeCurrency = useMemo(() => getCurrency(currencyCode), [currencyCode]);

  // Filter categories by type
  const matchingCategories = useMemo(() => {
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  // Sync state when modal opens or scheduleToEdit changes
  useEffect(() => {
    if (!visible) return;

    if (scheduleToEdit) {
      setType(scheduleToEdit.type);
      setTitle(scheduleToEdit.title);
      const decDigits = activeCurrency.decimal_digits;
      setAmount(
        decDigits === 0
          ? String(scheduleToEdit.amount_cents)
          : (scheduleToEdit.amount_cents / 100).toFixed(decDigits)
      );
      setSelectedCategoryId(scheduleToEdit.category_id);
      setFrequency(scheduleToEdit.frequency);
      setCustomDays(
        scheduleToEdit.custom_interval_days
          ? String(scheduleToEdit.custom_interval_days)
          : "15"
      );
      setDayOfMonth(
        scheduleToEdit.day_of_month
          ? String(scheduleToEdit.day_of_month)
          : String(new Date().getDate())
      );
    } else {
      setType("expense");
      setTitle("");
      setAmount("");
      setFrequency("monthly");
      setCustomDays("15");
      setDayOfMonth(String(new Date().getDate()));
      const firstExpense = categories.find((c) => c.type === "expense");
      setSelectedCategoryId(firstExpense ? firstExpense.id : null);
    }
  }, [visible, scheduleToEdit, categories, activeCurrency.decimal_digits]);

  // When type or matching categories change, ensure selectedCategoryId belongs to matchingCategories
  useEffect(() => {
    if (!visible) return;
    if (matchingCategories.length > 0) {
      if (!selectedCategoryId || !matchingCategories.some((c) => c.id === selectedCategoryId)) {
        setSelectedCategoryId(matchingCategories[0].id);
      }
    } else {
      setSelectedCategoryId(null);
    }
  }, [visible, matchingCategories, selectedCategoryId]);

  const handleSave = async () => {
    if (isSubmittingRef.current) return;

    if (!title.trim()) {
      Alert.alert("Title Required", "Please enter a descriptive title for this recurring schedule.");
      return;
    }

    const parsed = parseCurrencyToCents(amount, currencyCode);
    if (!parsed || parsed.cents <= 0) {
      Alert.alert("Invalid Amount", parsed?.error || "Please enter a valid positive amount.");
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert("Category Required", "Please select a category.");
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

    const today = getLocalTodayStr();

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const nextDate = calculateNextOccurrence(
        today,
        frequency,
        customDaysNum,
        dayOfMonthNum,
        today
      );

      if (isEditing && scheduleToEdit) {
        // If frequency or day of month changed, re-anchor next_occurrence
        const frequencyChanged =
          scheduleToEdit.frequency !== frequency ||
          scheduleToEdit.day_of_month !== dayOfMonthNum ||
          scheduleToEdit.custom_interval_days !== customDaysNum;

        await updateRecurringSchedule(scheduleToEdit.id, {
          title: title.trim(),
          type,
          amount_cents: parsed.cents,
          category_id: selectedCategoryId,
          frequency,
          custom_interval_days: customDaysNum,
          day_of_month: dayOfMonthNum,
          ...(frequencyChanged ? { next_occurrence: nextDate } : {}),
        });
      } else {
        await createRecurringSchedule({
          title: title.trim(),
          type,
          amount_cents: parsed.cents,
          category_id: selectedCategoryId,
          frequency,
          custom_interval_days: customDaysNum,
          day_of_month: dayOfMonthNum,
          start_date: today,
          next_occurrence: nextDate,
          is_active: 1,
        });
      }

      onClose();
    } catch (err) {
      console.error("Failed to save recurring schedule:", err);
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save recurring schedule.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black-overlay-60"
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          className="bg-bg-card rounded-t-3xl border-t-2 border-border-card px-5 pt-5 max-h-[85%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-text-main text-lg font-black">
                {isEditing ? "Edit Recurring Schedule ⚙️" : "New Recurring Schedule 🔄"}
              </Text>
              <Text className="text-text-muted text-xs font-bold mt-0.5">
                Automate income paychecks or fixed expenses
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-9 h-9 rounded-2xl bg-bg-app items-center justify-center border-2 border-border-card border-b-4 border-b-border-card-dark"
            >
              <Ionicons name="close" size={18} color={colors.textMain} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Income / Expense Switch */}
            <View className="flex-row bg-bg-app p-1.5 rounded-3xl border-2 border-border-card border-b-4 border-b-border-card-dark mb-4">
              <TouchableOpacity
                onPress={() => setType("income")}
                className={`will-change-variable flex-1 py-2.5 rounded-2xl items-center justify-center ${type === "income"
                    ? "bg-emerald border-2 border-emerald-light border-b-4 border-b-emerald-dark"
                    : "bg-transparent"
                  }`}
              >
                <Text
                  className={`will-change-variable text-xs font-black ${type === "income" ? "text-white" : "text-text-muted"
                    }`}
                >
                  + Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setType("expense")}
                className={`will-change-variable flex-1 py-2.5 rounded-2xl items-center justify-center ${type === "expense"
                    ? "bg-rose border-2 border-rose-light border-b-4 border-b-rose-dark"
                    : "bg-transparent"
                  }`}
              >
                <Text
                  className={`will-change-variable text-xs font-black ${type === "expense" ? "text-white" : "text-text-muted"
                    }`}
                >
                  - Expense
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <View className="mb-4">
              <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1.5">
                Schedule Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={type === "income" ? "e.g. Monthly Salary, Freelance Retainer" : "e.g. Rent, Netflix, Gym Membership"}
                placeholderTextColor={colors.textMuted}
                className="bg-bg-app rounded-2xl px-4 py-3 text-text-main font-bold text-sm border-2 border-border-card border-b-4 border-b-border-card-dark"
              />
            </View>

            {/* Amount Input */}
            <View className="mb-4">
              <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1.5">
                Amount ({currencySymbol.trim()})
              </Text>
              <View className="flex-row items-center bg-bg-app rounded-2xl px-4 py-3 border-2 border-border-card border-b-4 border-b-border-card-dark">
                <Text
                  className={`will-change-variable font-black text-base mr-2 ${type === "income" ? "text-emerald" : "text-rose"
                    }`}
                >
                  {type === "income" ? "+" : "-"}
                  {currencySymbol.trim()}
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={activeCurrency.decimal_digits === 0 ? "0" : "0.00"}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  className="flex-1 text-text-main font-black text-lg p-0"
                />
              </View>
            </View>

            {/* Frequency Selector */}
            <View className="mb-4">
              <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1.5">
                Frequency Interval
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { key: "weekly", label: "Weekly" },
                  { key: "biweekly", label: "Every 2 Weeks" },
                  { key: "monthly", label: "Monthly" },
                  { key: "custom", label: "Custom Days" },
                ].map((item) => {
                  const isSelected = frequency === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setFrequency(item.key as RecurringFrequency)}
                      className={`will-change-variable px-3 py-2 rounded-2xl border-2 ${isSelected
                          ? "bg-primary border-primary-light border-b-4 border-b-primary-dark"
                          : "bg-bg-app border-border-card border-b-4 border-b-border-card-dark"
                        }`}
                    >
                      <Text
                        className={`will-change-variable text-xs font-black ${isSelected ? "text-white" : "text-text-main"
                          }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {frequency === "monthly" && (
                <View className="mt-3 flex-row items-center bg-bg-app rounded-2xl px-4 py-2.5 border-2 border-border-card border-b-4 border-b-border-card-dark">
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

              {frequency === "custom" && (
                <View className="mt-3 flex-row items-center bg-bg-app rounded-2xl px-4 py-2.5 border-2 border-border-card border-b-4 border-b-border-card-dark">
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

            {/* Category Selector */}
            <View className="mb-6">
              <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1.5">
                Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
                {matchingCategories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const paletteToken = (cat.color_code as PaletteToken) || (type === "income" ? "emerald" : "primary");
                  const palette = PALETTE_CONFIG[paletteToken] || PALETTE_CONFIG.primary;

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.8}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      className={`will-change-variable mr-2 flex-row items-center px-3.5 py-2 rounded-2xl border-2 ${
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
              </ScrollView>
            </View>

            {/* Submit Action Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.85}
              className="bg-primary py-3.5 rounded-2xl items-center justify-center border-2 border-primary-light border-b-4 border-b-primary-dark mb-4"
            >
              <Text className="text-white text-sm font-black uppercase tracking-wider">
                {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Schedule"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};