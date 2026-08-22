import { CartoonCard } from "@/components/CartoonCard";
import { RecurringReviewModal } from "@/components/RecurringReviewModal";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { colors } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { EnrichedTransactionRow } from "@/repositories/transactionRepo";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, cashflowSummary, pendingRecurringSchedules, formatMoney } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [selectedTransaction, setSelectedTransaction] = useState<EnrichedTransactionRow | null>(null);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);

  const totalIncomeFormatted = formatMoney(cashflowSummary.totalIncomeCents);
  const totalExpenseFormatted = formatMoney(cashflowSummary.totalExpenseCents);

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
      if (isNaN(d.getTime())) {
        return dateStr;
      }
      const now = new Date();
      const isSameDay = (d1: Date, d2: Date) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

      if (isSameDay(d, now)) {
        return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
      if (isSameDay(d, yesterday)) {
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
              +{totalIncomeFormatted}
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
              -{totalExpenseFormatted}
            </Text>
          </CartoonCard>
        </View>

        {/* ─── PENDING RECURRING REVIEW BANNER ─── */}
        {pendingRecurringSchedules.length > 0 && (
          <View className="mb-4">
            <CartoonCard
              variant="gold"
              interactive
              onPress={() => setIsReviewModalVisible(true)}
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-1 mr-2">
                <View className="flex-row items-center mb-1">
                  <View className="w-5 h-5 rounded-full bg-gold items-center justify-center mr-1.5 shadow-sm">
                    <Ionicons name="flash" size={12} color={colors.white} />
                  </View>
                  <Text className="text-gold-dark text-xs font-black uppercase tracking-wider">
                    ⚡ {pendingRecurringSchedules.length} Recurring Bill{pendingRecurringSchedules.length === 1 ? "" : "s"} Due for Review
                  </Text>
                </View>
                <Text className="text-text-main text-xs font-bold" numberOfLines={1}>
                  Review amounts for {pendingRecurringSchedules[0].title}{pendingRecurringSchedules.length > 1 ? " and more." : "."}
                </Text>
              </View>

              <View className="bg-gold px-3 py-2 rounded-2xl border-2 border-gold-light border-b-4 border-b-gold-dark">
                <Text className="text-white text-xs font-black uppercase tracking-wider">
                  Review ({pendingRecurringSchedules.length})
                </Text>
              </View>
            </CartoonCard>
          </View>
        )}

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
              type === "all" ? "All Activity" : type === "income" ? "Income" : "Expense";

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

            const textClasses = isSelected ? "text-white font-black" : "text-text-muted font-bold";

            return (
              <TouchableOpacity
                key={type}
                activeOpacity={0.8}
                onPress={() => setFilterType(type)}
                className={`will-change-variable ${chipClasses}`}
              >
                <Text className={`text-xs ${textClasses}`}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Transaction List */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
        showsVerticalScrollIndicator={false}
      >
        {filteredTransactions.length === 0 ? (
          <CartoonCard className="p-8 items-center justify-center my-6">
            <View className="w-14 h-14 rounded-full bg-coral-subtle items-center justify-center mb-3">
              <Ionicons name="receipt-outline" size={28} color={colors.primary} />
            </View>
            <Text className="text-text-main text-base font-black mb-1">No Activity Found</Text>
            <Text className="text-text-muted text-xs font-bold text-center">
              {searchQuery
                ? `No transactions match "${searchQuery}".`
                : "No transactions recorded yet. Tap '+' to log an income or expense!"}
            </Text>
          </CartoonCard>
        ) : (
          filteredTransactions.map((item) => {
            const isIncome = item.type === "income";
            const variant = isIncome ? "income" : "expense";
            const formattedAmount = formatMoney(item.amount_cents);

            return (
              <CartoonCard
                key={item.id}
                variant={variant}
                interactive={true}
                onPress={() => setSelectedTransaction(item)}
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

                    {/* Goal Linkage Subtitle Badges */}
                    {!!item.allocated_goal_title && (
                      <View className="flex-row items-center mt-1 bg-gold-subtle px-2 py-0.5 rounded-md self-start border border-gold-border">
                        <Text className="text-gold-dark text-[10px] font-black">
                          🎯 ➔ {item.allocated_goal_title}
                        </Text>
                      </View>
                    )}

                    {!!item.source_goal_title && (
                      <View className="flex-row items-center mt-1 bg-coral-subtle px-2 py-0.5 rounded-md self-start border border-border-card">
                        <Text className="text-text-brand text-[10px] font-black">
                          🛡️ Paid from {item.source_goal_title}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text
                  className={`will-change-variable text-base font-black ${
                    isIncome ? "text-emerald" : "text-rose"
                  }`}
                >
                  {isIncome ? `+${formattedAmount}` : `-${formattedAmount}`}
                </Text>
              </CartoonCard>
            );
          })
        )}
      </ScrollView>

      {/* Transaction Detail, Edit & Delete Modal */}
      <TransactionDetailModal
        visible={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />

      {/* Recurring Bills Review Modal */}
      <RecurringReviewModal
        visible={isReviewModalVisible}
        onClose={() => setIsReviewModalVisible(false)}
      />
    </View>
  );
}
