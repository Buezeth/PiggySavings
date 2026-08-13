import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export default function ActivityScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

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

  const filteredTransactions = transactions.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === "all" ||
      (filterType === "income" && item.isIncome) ||
      (filterType === "expense" && !item.isIncome);
    return matchesSearch && matchesFilter;
  });

  const toggleFilter = () => {
    setFilterType((prev) =>
      prev === "all" ? "income" : prev === "income" ? "expense" : "all"
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-app">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider">
          Transaction Ledger
        </Text>
        <Text className="text-text-main text-2xl font-bold mt-0.5 mb-4">
          Activity & History 💳
        </Text>

        {/* Search Bar & Filter */}
        <View className="bg-bg-card rounded-2xl px-4 py-3 flex-row items-center border border-border-card shadow-sm mb-4">
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search transactions, categories..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-sm text-text-main"
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Filter transactions"
            accessibilityHint={`Current filter: ${filterType}`}
            onPress={toggleFilter}
            className={`p-1.5 rounded-lg ${
              filterType !== "all" ? "bg-primary" : "bg-coral-subtle"
            }`}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={filterType !== "all" ? colors.white : colors.primary}
            />
          </TouchableOpacity>
        </View>
        {filterType !== "all" && (
          <View className="flex-row items-center justify-between mb-2 px-1">
            <Text className="text-xs text-text-muted font-medium">
              Filter: <Text className="font-bold text-primary capitalize">{filterType}</Text>
            </Text>
            <TouchableOpacity onPress={() => setFilterType("all")}>
              <Text className="text-xs text-primary font-semibold">Clear filter</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-text-muted text-xs font-bold uppercase mb-3 tracking-wider">
          Recent Activity ({filteredTransactions.length})
        </Text>

        {filteredTransactions.length === 0 ? (
          <View className="bg-bg-card rounded-2xl p-6 border border-border-card items-center justify-center">
            <Text className="text-text-muted text-sm font-medium">
              No matching transactions found.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((item) => (
            <View
              key={item.id}
              className="bg-bg-card rounded-2xl p-4 mb-3 flex-row items-center justify-between border border-border-card shadow-sm"
            >
              <View className="flex-row items-center flex-1 pr-2">
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                    item.isIncome ? "bg-emerald-50" : "bg-coral-subtle"
                  }`}
                >
                  <Ionicons
                    name={item.isIncome ? "arrow-down" : "arrow-up"}
                    size={18}
                    color={item.isIncome ? colors.emerald : colors.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-text-main text-sm font-bold">
                    {item.title}
                  </Text>
                  <Text className="text-text-muted text-xs font-medium mt-0.5">
                    {item.category} • {item.date}
                  </Text>
                  {item.goalAllocated && (
                    <View className="bg-bg-app self-start px-2 py-0.5 rounded-md mt-1">
                      <Text className="text-primary text-[10px] font-semibold">
                        🎯 {item.goalAllocated}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Text
                className={`text-sm font-bold ${
                  item.isIncome ? "text-emerald-600" : "text-text-main"
                }`}
              >
                {item.amount}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
