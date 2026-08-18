import CartoonCard from "@/components/CartoonCard";
import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, cashflowSummary } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  const totalIncomeDollars = (cashflowSummary.totalIncomeCents / 100).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );

  const totalExpenseDollars = (cashflowSummary.totalExpenseCents / 100).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );

  // Filter transactions in memory or from repository
  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const isIncome = item.type === "income";
      const matchesSearch =
        !searchQuery.trim() ||
        (item.note && item.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category_name &&
          item.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilter =
        filterType === "all" ||
        (filterType === "income" && isIncome) ||
        (filterType === "expense" && !isIncome);

      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, filterType]);

  // Format transaction date helper
  const formatDateLabel = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays === 0) {
        return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
      if (diffDays === 1) {
        return `Yesterday, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

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
              +${totalIncomeDollars}
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
              -${totalExpenseDollars}
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
            const label =
              type === "all" ? "All Activity" : type === "income" ? "Income (+" : "Expense (-";

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
                  className={`will-change-variable text-xs font-black capitalize ${
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
            const isIncome = item.type === "income";
            const variant = isIncome ? "income" : "expense";
            const amountDollars = (item.amount_cents / 100).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            return (
              <CartoonCard
                key={item.id}
                variant={variant}
                className="mb-3.5 p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <View
                    className={`will-change-variable w-11 h-11 rounded-2xl items-center justify-center mr-3 ${
                      isIncome ? "bg-emerald" : "bg-rose"
                    }`}
                  >
                    <Ionicons
                      name={isIncome ? "arrow-down" : "arrow-up"}
                      size={20}
                      color={colors.white}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-main text-sm font-black">
                      {item.note || item.category_name || (isIncome ? "Income" : "Expense")}
                    </Text>
                    <Text className="text-text-muted text-xs font-bold mt-0.5">
                      {item.category_name || "General"} • {formatDateLabel(item.transaction_date)}
                    </Text>
                  </View>
                </View>

                <Text
                  className={`will-change-variable text-base font-black ${
                    isIncome ? "text-emerald" : "text-rose"
                  }`}
                >
                  {isIncome ? `+$${amountDollars}` : `-$${amountDollars}`}
                </Text>
              </CartoonCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}


