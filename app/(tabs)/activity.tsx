import React from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ActivityScreen() {
  const transactions = [
    {
      id: "1",
      title: "Salary Income",
      category: "Income",
      amount: "+$2,500.00",
      date: "Today, 09:30 AM",
      isIncome: true,
      goalAllocated: "Emergency Fund",
    },
    {
      id: "2",
      title: "Auto-Allocation to Dream Setup",
      category: "Savings Goal",
      amount: "-$300.00",
      date: "Today, 09:31 AM",
      isIncome: false,
      goalAllocated: "Dream Studio Setup",
    },
    {
      id: "3",
      title: "Grocery Shopping",
      category: "Food & Dining",
      amount: "-$64.20",
      date: "Yesterday",
      isIncome: false,
    },
    {
      id: "4",
      title: "Freelance Project",
      category: "Side Income",
      amount: "+$450.00",
      date: "Aug 11, 2026",
      isIncome: true,
      goalAllocated: "Japan Trip",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#FAF4F0]">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-[#8C7B75] text-xs font-semibold uppercase tracking-wider">
          Transaction Ledger
        </Text>
        <Text className="text-[#331C14] text-2xl font-bold mt-0.5 mb-4">
          Activity & History 💳
        </Text>

        {/* Search Bar */}
        <View className="bg-[#FFFFFF] rounded-2xl px-4 py-3 flex-row items-center border border-[#F3ECE7] shadow-sm mb-4">
          <Ionicons name="search-outline" size={18} color="#8C7B75" />
          <TextInput
            placeholder="Search transactions, categories..."
            placeholderTextColor="#8C7B75"
            className="flex-1 ml-2 text-sm text-[#331C14]"
          />
          <TouchableOpacity className="bg-[#FDF3EF] p-1.5 rounded-lg">
            <Ionicons name="options-outline" size={16} color="#EE6A3B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[#8C7B75] text-xs font-bold uppercase mb-3 tracking-wider">
          Recent Activity
        </Text>

        {transactions.map((item) => (
          <View
            key={item.id}
            className="bg-[#FFFFFF] rounded-2xl p-4 mb-3 flex-row items-center justify-between border border-[#F3ECE7] shadow-sm"
          >
            <View className="flex-row items-center flex-1 pr-2">
              <View
                className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                  item.isIncome ? "bg-[#E6F7ED]" : "bg-[#FDF3EF]"
                }`}
              >
                <Ionicons
                  name={item.isIncome ? "arrow-down" : "arrow-up"}
                  size={18}
                  color={item.isIncome ? "#10B981" : "#EE6A3B"}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[#331C14] text-sm font-bold">
                  {item.title}
                </Text>
                <Text className="text-[#8C7B75] text-xs font-medium mt-0.5">
                  {item.category} • {item.date}
                </Text>
                {item.goalAllocated && (
                  <View className="bg-[#FAF4F0] self-start px-2 py-0.5 rounded-md mt-1">
                    <Text className="text-[#EE6A3B] text-[10px] font-semibold">
                      🎯 {item.goalAllocated}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text
              className={`text-sm font-bold ${
                item.isIncome ? "text-[#10B981]" : "text-[#331C14]"
              }`}
            >
              {item.amount}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
