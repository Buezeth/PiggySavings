import CartoonCard from "@/components/CartoonCard";
import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
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

  const totalIncome = transactions
    .filter((t) => t.isIncome)
    .reduce((sum, t) => sum + parseFloat(t.amount.replace(/[^0-9.-]+/g, "")), 0);

  const totalExpense = transactions
    .filter((t) => !t.isIncome)
    .reduce((sum, t) => sum + parseFloat(t.amount.replace(/[^0-9.-]+/g, "")), 0);

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

  return (
    <View style={{ paddingTop: Math.max(insets.top, 16) }} className="flex-1 bg-bg-app">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-text-muted text-xs font-bold uppercase tracking-wider">
          Transaction Ledger
        </Text>
        <Text className="text-text-main text-2xl font-black mt-0.5 mb-4">
          Activity & History 💳
        </Text>

        {/* Gamified Cashflow Snapshot (Income vs Expense Quick Overview) */}
        <View className="flex-row gap-3 mb-4">
          <CartoonCard variant="income" className="flex-1 p-3.5">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-text-muted text-[10px] font-bold uppercase tracking-wider">
                Total In
              </Text>
              <View className="w-5 h-5 rounded-full bg-emerald items-center justify-center">
                <Ionicons name="arrow-down" size={12} color={colors.white} />
              </View>
            </View>
            <Text className="text-emerald text-base font-black">
              +${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </CartoonCard>

          <CartoonCard variant="expense" className="flex-1 p-3.5">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-text-muted text-[10px] font-bold uppercase tracking-wider">
                Total Out
              </Text>
              <View className="w-5 h-5 rounded-full bg-rose items-center justify-center">
                <Ionicons name="arrow-up" size={12} color={colors.white} />
              </View>
            </View>
            <Text className="text-rose text-base font-black">
              -${Math.abs(totalExpense).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </CartoonCard>
        </View>

        {/* Search Bar */}
        <View className="bg-bg-card rounded-2xl px-4 py-2.5 flex-row items-center border-2 border-border-card border-b-4 border-b-border-card-dark mb-3">
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search transactions, categories..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-sm text-text-main font-semibold"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Playful Filter Chips */}
        <View className="flex-row gap-2 mb-3">
          {(["all", "income", "expense"] as const).map((type) => {
            const isSelected = filterType === type;
            const label = type === "all" ? "All Activity" : type === "income" ? "Income (+" : "Expense (-";

            let chipClasses = "px-3.5 py-1.5 rounded-full border-2";
            if (isSelected) {
              if (type === "income") {
                chipClasses += " bg-emerald border-emerald-dark";
              } else if (type === "expense") {
                chipClasses += " bg-rose border-rose-dark";
              } else {
                chipClasses += " bg-primary border-primary-dark";
              }
            } else {
              chipClasses += " bg-bg-card border-border-card";
            }

            return (
              <TouchableOpacity
                key={type}
                activeOpacity={0.8}
                onPress={() => setFilterType(type)}
                className={`will-change-variable ${chipClasses}`}
              >
                <Text
                  className={`text-xs font-black capitalize ${
                    isSelected ? "text-white" : "text-text-muted"
                  }`}
                >
                  {type === "all" ? "All" : label + ")"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-text-muted text-xs font-bold uppercase mb-3 tracking-wider">
          Transactions ({filteredTransactions.length})
        </Text>

        {filteredTransactions.length === 0 ? (
          <CartoonCard className="p-6 items-center justify-center">
            <Text className="text-text-muted text-sm font-bold">
              No matching transactions found.
            </Text>
          </CartoonCard>
        ) : (
          filteredTransactions.map((item) => {
            const variant = item.isIncome ? "income" : "expense";

            return (
              <CartoonCard
                key={item.id}
                variant={variant}
                className="mb-3.5 p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <View
                    className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${
                      item.isIncome ? "bg-emerald" : "bg-rose"
                    }`}
                  >
                    <Ionicons
                      name={item.isIncome ? "arrow-down" : "arrow-up"}
                      size={20}
                      color={colors.white}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-main text-sm font-black">
                      {item.title}
                    </Text>
                    <Text className="text-text-muted text-xs font-bold mt-0.5">
                      {item.category} • {item.date}
                    </Text>
                    {item.goalAllocated && (
                      <View className="bg-white/80 self-start px-2 py-0.5 rounded-lg mt-1.5 border border-border-card">
                        <Text className="text-text-main text-[10px] font-black">
                          🎯 {item.goalAllocated}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text
                  className={`text-base font-black ${
                    item.isIncome ? "text-emerald" : "text-rose"
                  }`}
                >
                  {item.amount}
                </Text>
              </CartoonCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

