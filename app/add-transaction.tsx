import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AddTransactionModal() {
  const router = useRouter();
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
    // Save transaction logic will connect to database outbox sync
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-bg-app"
    >
      <View className="flex-1 pt-6 px-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-text-main text-xl font-extrabold">
            Quick Add Transaction ⚡
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-bg-card items-center justify-center border border-border-card"
          >
            <Ionicons name="close" size={20} color="#331C14" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Income vs Expense Toggle */}
          <View className="flex-row bg-bg-card p-1.5 rounded-2xl border border-border-card mb-6">
            <TouchableOpacity
              onPress={() => setType("income")}
              className={`flex-1 py-3 rounded-xl items-center justify-center ${
                type === "income" ? "bg-primary" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  type === "income" ? "text-white" : "text-text-muted"
                }`}
              >
                + Income / Funding
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setType("expense")}
              className={`flex-1 py-3 rounded-xl items-center justify-center ${
                type === "expense" ? "bg-text-main" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  type === "expense" ? "text-white" : "text-text-muted"
                }`}
              >
                - Expense / Withdrawal
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View className="bg-bg-card rounded-3xl p-5 mb-6 border border-border-card items-center">
            <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Transaction Amount
            </Text>
            <View className="flex-row items-center">
              <Text className="text-text-main text-3xl font-extrabold mr-1">
                $
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#CCCCCC"
                keyboardType="decimal-pad"
                style={{ textAlign: "center" }}
                className="text-text-main text-4xl font-extrabold flex-1"
              />
            </View>
          </View>

          {/* Goal Allocation Selector */}
          <Text className="text-text-main text-sm font-bold mb-3">
            Target Goal Auto-Allocation
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {goals.map((g) => {
              const isSelected = selectedGoal === g;
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => setSelectedGoal(g)}
                  className={`px-4 py-2.5 rounded-2xl border ${
                    isSelected
                      ? "bg-coral-subtle border-primary"
                      : "bg-bg-card border-border-card"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? "text-primary" : "text-text-main"
                    }`}
                  >
                    🎯 {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Note Input */}
          <Text className="text-text-main text-sm font-bold mb-2">
            Description / Note
          </Text>
          <View className="bg-bg-card rounded-2xl p-4 border border-border-card mb-8">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g., Freelance Project Payout, Client deposit..."
              placeholderTextColor="#8C7B75"
              className="text-sm text-text-main"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            className="bg-primary rounded-2xl py-4 items-center justify-center shadow-lg shadow-primary/30 mb-8"
          >
            <Text className="text-white text-base font-bold">
              Save Transaction & Allocate 🎯
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
