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
      className="flex-1 bg-[#FAF4F0]"
    >
      <View className="flex-1 pt-6 px-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-[#331C14] text-xl font-extrabold">
            Quick Add Transaction ⚡
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#FFFFFF] items-center justify-center border border-[#F3ECE7]"
          >
            <Ionicons name="close" size={20} color="#331C14" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Income vs Expense Toggle */}
          <View className="flex-row bg-[#FFFFFF] p-1.5 rounded-2xl border border-[#F3ECE7] mb-6">
            <TouchableOpacity
              onPress={() => setType("income")}
              className={`flex-1 py-3 rounded-xl items-center justify-center ${
                type === "income" ? "bg-[#EE6A3B]" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  type === "income" ? "text-white" : "text-[#8C7B75]"
                }`}
              >
                + Income / Funding
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setType("expense")}
              className={`flex-1 py-3 rounded-xl items-center justify-center ${
                type === "expense" ? "bg-[#331C14]" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  type === "expense" ? "text-white" : "text-[#8C7B75]"
                }`}
              >
                - Expense / Withdrawal
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View className="bg-[#FFFFFF] rounded-3xl p-5 mb-6 border border-[#F3ECE7] items-center">
            <Text className="text-[#8C7B75] text-xs font-semibold uppercase tracking-wider mb-2">
              Transaction Amount
            </Text>
            <View className="flex-row items-center">
              <Text className="text-[#331C14] text-3xl font-extrabold mr-1">
                $
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#CCCCCC"
                keyboardType="decimal-pad"
                style={{ textAlign: "center" }}
                className="text-[#331C14] text-4xl font-extrabold flex-1"
              />
            </View>
          </View>

          {/* Goal Allocation Selector */}
          <Text className="text-[#331C14] text-sm font-bold mb-3">
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
                      ? "bg-[#FDF3EF] border-[#EE6A3B]"
                      : "bg-[#FFFFFF] border-[#F3ECE7]"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? "text-[#EE6A3B]" : "text-[#331C14]"
                    }`}
                  >
                    🎯 {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Note Input */}
          <Text className="text-[#331C14] text-sm font-bold mb-2">
            Description / Note
          </Text>
          <View className="bg-[#FFFFFF] rounded-2xl p-4 border border-[#F3ECE7] mb-8">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g., Freelance Project Payout, Client deposit..."
              placeholderTextColor="#8C7B75"
              className="text-sm text-[#331C14]"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            className="bg-[#EE6A3B] rounded-2xl py-4 items-center justify-center shadow-lg shadow-[#EE6A3B]/30 mb-8"
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
