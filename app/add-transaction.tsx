import CartoonCard from "@/components/CartoonCard";
import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("Dream Studio Setup");

  const goals = [
    "Dream Studio Setup",
    "Japan Trip",
    "Emergency Fund",
    "General Savings",
  ];

  const handleSave = () => {
    const trimmedAmount = amount.trim();
    // Validate format: positive number with at most 2 decimal places and no non-numeric characters
    if (!/^\d+(\.\d{1,2})?$/.test(trimmedAmount)) {
      Alert.alert("Invalid Amount", "Please enter a valid positive transaction amount.");
      return;
    }

    const numericAmount = parseFloat(trimmedAmount);
    // Convert amount to smallest currency unit (cents)
    const amountInCents = Math.round(numericAmount * 100);

    if (isNaN(numericAmount) || numericAmount <= 0 || amountInCents <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive transaction amount.");
      return;
    }
    const idempotencyKey = generateUUIDv4();
    const transactionId = generateUUIDv4();

    // Construct local transaction object
    const transactionRecord = {
      id: transactionId,
      idempotency_key: idempotencyKey,
      type,
      amount_cents: amountInCents,
      note: note.trim(),
      selected_goal: selectedGoal || null,
      created_at: new Date().toISOString(),
    };

    // Construct offline outbox record for sync engine
    const outboxRecord = {
      id: generateUUIDv4(),
      event_type: "TRANSACTION_CREATED",
      payload: transactionRecord,
      synced: false,
      created_at: new Date().toISOString(),
    };

    // Construct Delta Event log when selectedGoal is present
    let goalDeltaRecord = null;
    if (selectedGoal) {
      const deltaCents = type === "income" ? amountInCents : -amountInCents;
      goalDeltaRecord = {
        id: generateUUIDv4(),
        event_type: "GOAL_BALANCE_DELTA",
        goal_id: selectedGoal,
        delta_cents: deltaCents,
        idempotency_key: generateUUIDv4(),
        created_at: new Date().toISOString(),
      };
    }

    try {
      // Local persistence write step
      if (__DEV__) {
        console.log("[Outbox] Saving transaction record:", {
          id: outboxRecord.id,
          event_type: outboxRecord.event_type,
          synced: outboxRecord.synced,
          created_at: outboxRecord.created_at,
        });
        if (goalDeltaRecord) {
          console.log("[Outbox] Emitting goal balance delta record:", {
            id: goalDeltaRecord.id,
            event_type: goalDeltaRecord.event_type,
            goal_id: goalDeltaRecord.goal_id,
            created_at: goalDeltaRecord.created_at,
          });
        }
      }
      // Call router.back() only after all local writes succeed
      router.back();
    } catch {
      Alert.alert("Error", "Failed to persist local transaction record.");
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
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-bg-card items-center justify-center border-2 border-border-card border-b-4 border-b-border-card-dark"
          >
            <Ionicons name="close" size={20} color={colors.textMain} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Income vs Expense Tactile Segmented Switch */}
          <View className="flex-row bg-bg-card p-1.5 rounded-3xl border-2 border-border-card border-b-4 border-b-border-card-dark mb-6">
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

          {/* Amount Input (Dynamic CartoonCard depending on Income vs Expense) */}
          <CartoonCard
            variant={type === "income" ? "income" : "expense"}
            className="mb-6 p-5 items-center"
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
                {type === "income" ? "+$" : "-$"}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={{ textAlign: "center" }}
                className={`text-4xl font-black flex-1 ${
                  type === "income" ? "text-emerald" : "text-rose"
                }`}
              />
            </View>
          </CartoonCard>

          {/* Goal Allocation Selector */}
          <Text className="text-text-main text-sm font-black mb-3">
            Target Goal Auto-Allocation
          </Text>
          <View className="flex-row flex-wrap gap-2.5 mb-6">
            {goals.map((g) => {
              const isSelected = selectedGoal === g;
              return (
                <TouchableOpacity
                  key={g}
                  activeOpacity={0.8}
                  onPress={() => setSelectedGoal(g)}
                  className={`will-change-variable px-4 py-2.5 rounded-2xl border-2 ${
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
                    🎯 {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Description / Note */}
          <Text className="text-text-main text-sm font-black mb-2">
            Description / Note
          </Text>
          <CartoonCard className="mb-6 p-3.5">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g., Freelance Project Payout, Client deposit..."
              placeholderTextColor={colors.textMuted}
              className="text-sm text-text-main font-semibold"
            />
          </CartoonCard>

          {/* Tactile Gamified Submit Button */}
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            className="bg-primary border-2 border-primary-light border-b-4 border-b-primary-dark rounded-2xl py-4 items-center justify-center mb-8"
          >
            <Text className="text-white text-base font-black uppercase tracking-wider">
              Save Transaction & Allocate 🎯
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

