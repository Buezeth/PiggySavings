import { CartoonCard } from "@/components/CartoonCard";
import { PendingRecurringBanner } from "@/components/PendingRecurringBanner";
import { RecurringReviewModal } from "@/components/RecurringReviewModal";
import { PALETTE_CONFIG, PaletteToken } from "@/constants/iconRegistry";
import { colors } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { EnrichedTransactionRow } from "@/repositories/transactionRepo";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    transactions,
    categories,
    cashflowSummary,
    pendingRecurringSchedules,
    formatMoney,
    updateTransaction,
    deleteTransaction,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const totalIncomeFormatted = formatMoney(cashflowSummary.totalIncomeCents);
  const totalExpenseFormatted = formatMoney(cashflowSummary.totalExpenseCents);

  // Filter transactions
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

  // Format short date for collapsed view
  const formatDateLabel = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

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

  // Format full date for expanded details
  const formatFullDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Toggle card expansion
  const handleToggleCard = (item: EnrichedTransactionRow) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedTxId === item.id) {
      setExpandedTxId(null);
      setEditingTxId(null);
    } else {
      setExpandedTxId(item.id);
      setEditingTxId(null);
      setEditNote(item.note || "");
      setEditCategoryId(item.category_id);
    }
  };

  // Start inline editing
  const handleStartEditing = (item: EnrichedTransactionRow) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditingTxId(item.id);
    setEditNote(item.note || "");
    setEditCategoryId(item.category_id);
  };

  // Cancel inline editing
  const handleCancelEditing = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditingTxId(null);
  };

  // Save inline edit
  const handleSaveEdit = async (item: EnrichedTransactionRow) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await updateTransaction(item.id, {
        note: editNote.trim() || null,
        category_id: editCategoryId || item.category_id,
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditingTxId(null);
    } catch (err: any) {
      Alert.alert("Update Error", err?.message || "Failed to update transaction.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Delete transaction with atomic rollbacks
  const handleDeleteTransaction = (item: EnrichedTransactionRow) => {
    let message = "Are you sure you want to permanently delete this transaction from your ledger?";

    if (item.allocated_goal_title) {
      message = `Deleting this income transaction will atomically deduct the allocated savings from "${item.allocated_goal_title}" and remove it from your ledger.`;
    } else if (item.source_goal_title) {
      message = `Deleting this goal-funded expense will atomically restore the spent funds back to "${item.source_goal_title}" and remove it from your ledger.`;
    }

    Alert.alert("Delete Transaction?", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (isSubmittingRef.current) return;
          isSubmittingRef.current = true;
          setIsSubmitting(true);
          try {
            await deleteTransaction(item.id);
            setExpandedTxId(null);
            setEditingTxId(null);
          } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to delete transaction.");
          } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-bg-app"
    >
      <View style={{ paddingTop: Math.max(insets.top, 16) }} className="flex-1">
        <View className="px-5 pt-4 pb-2">
          <Text className="text-text-muted text-xs font-bold uppercase tracking-wider">
            Transaction Ledger
          </Text>
          <Text className="text-text-main text-2xl font-black mt-0.5 mb-4">
            Activity & History 💳
          </Text>

          {/* Gamified Cashflow Snapshot */}
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

          {/* Pending Recurring Review Banner */}
          {pendingRecurringSchedules.length > 0 && (
            <View className="mb-4">
              <PendingRecurringBanner
                pendingRecurringSchedules={pendingRecurringSchedules}
                onPress={() => setIsReviewModalVisible(true)}
              />
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

        {/* Transaction List with Expandable Cards */}
        <ScrollView
          ref={scrollViewRef}
          automaticallyAdjustKeyboardInsets={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 20) + (editingTxId ? 140 : 0),
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
              const isExpanded = expandedTxId === item.id;
              const isEditingThis = editingTxId === item.id;
              const eligibleCategories = categories.filter((c) => c.type === item.type);

              return (
                <CartoonCard
                  key={item.id}
                  variant={variant}
                  interactive={!isEditingThis}
                  onPress={() => handleToggleCard(item)}
                  className="mb-3.5 p-4"
                >
                  {/* ─── CARD HEADER ROW (Compact View) ─── */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 pr-2">
                      <View
                        className={`will-change-variable w-11 h-11 rounded-2xl items-center justify-center mr-3 ${isIncome ? "bg-emerald" : "bg-rose"
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

                        {/* Goal Linkage Subtitle Badges (Visible when collapsed) */}
                        {!isExpanded && !!item.allocated_goal_title && (
                          <View className="flex-row items-center mt-1 bg-gold-subtle px-2 py-0.5 rounded-md self-start border border-gold-border">
                            <Text className="text-gold-dark text-[10px] font-black">
                              🎯 ➔ {item.allocated_goal_title}
                            </Text>
                          </View>
                        )}

                        {!isExpanded && !!item.source_goal_title && (
                          <View className="flex-row items-center mt-1 bg-coral-subtle px-2 py-0.5 rounded-md self-start border border-border-card">
                            <Text className="text-text-brand text-[10px] font-black">
                              🛡️ Paid from {item.source_goal_title}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View className="items-end">
                      <Text
                        className={`will-change-variable text-base font-black ${isIncome ? "text-emerald" : "text-rose"
                          }`}
                      >
                        {isIncome ? `+${formattedAmount}` : `-${formattedAmount}`}
                      </Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={colors.textMuted}
                        style={{ marginTop: 2 }}
                      />
                    </View>
                  </View>

                  {/* ─── EXPANDED DETAILS SECTION ─── */}
                  {isExpanded && (
                    <View className="mt-3.5 pt-3.5 border-t border-border-card">
                      {/* Goal Connection Badges */}
                      {!!item.allocated_goal_title && (
                        <View className="bg-gold-subtle p-3 rounded-2xl border border-gold-border mb-3 flex-row items-center">
                          <View className="w-8 h-8 rounded-xl bg-gold items-center justify-center mr-2.5">
                            <Ionicons name="sparkles" size={16} color={colors.white} />
                          </View>
                          <View className="flex-1">
                            <Text className="text-text-main font-black text-xs">
                              🎯 Goal Contribution: {item.allocated_goal_title}
                            </Text>
                            {!!item.allocated_goal_amount_cents && (
                              <Text className="text-gold-dark font-bold text-[11px]">
                                Saved {formatMoney(item.allocated_goal_amount_cents)} towards target
                              </Text>
                            )}
                          </View>
                        </View>
                      )}

                      {!!item.source_goal_title && (
                        <View className="bg-coral-subtle p-3 rounded-2xl border border-border-card mb-3 flex-row items-center">
                          <View className="w-8 h-8 rounded-xl bg-primary items-center justify-center mr-2.5">
                            <Ionicons name="shield-checkmark" size={16} color={colors.white} />
                          </View>
                          <View className="flex-1">
                            <Text className="text-text-main font-black text-xs">
                              🛡️ Goal-Funded Purchase: {item.source_goal_title}
                            </Text>
                            <Text className="text-text-muted font-bold text-[11px]">
                              Deducted from goal reserve balance
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* View Details Mode */}
                      {!isEditingThis ? (
                        <>
                          <View className="bg-bg-app rounded-2xl p-3.5 mb-3 border border-border-card">
                            {/* Full Date Row */}
                            <View className="flex-row items-center justify-between pb-2 border-b border-border-card">
                              <View className="flex-row items-center">
                                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                                <Text className="text-text-muted text-xs font-bold ml-1.5">Date & Time</Text>
                              </View>
                              <Text className="text-text-main text-xs font-black">
                                {formatFullDate(item.transaction_date)}
                              </Text>
                            </View>

                            {/* Category Row */}
                            <View className="flex-row items-center justify-between py-2 border-b border-border-card">
                              <View className="flex-row items-center">
                                <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} />
                                <Text className="text-text-muted text-xs font-bold ml-1.5">Category</Text>
                              </View>
                              <Text className="text-text-main text-xs font-black">
                                {item.category_name || "General"}
                              </Text>
                            </View>

                            {/* Note Row */}
                            <View className="pt-2">
                              <View className="flex-row items-center mb-1">
                                <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
                                <Text className="text-text-muted text-xs font-bold ml-1.5">Note</Text>
                              </View>
                              <Text
                                className={`text-xs ${item.note ? "text-text-main font-bold" : "text-text-muted italic"
                                  }`}
                              >
                                {item.note || "No note recorded"}
                              </Text>
                            </View>
                          </View>

                          {/* Action Buttons */}
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => handleStartEditing(item)}
                              className="flex-1 py-2.5 rounded-2xl bg-bg-card border-2 border-border-card border-b-4 border-b-border-card-dark items-center justify-center flex-row"
                            >
                              <Ionicons name="pencil" size={14} color={colors.primary} />
                              <Text className="text-primary font-black text-xs ml-1.5">
                                Edit Details
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => handleDeleteTransaction(item)}
                              className="flex-1 py-2.5 rounded-2xl bg-rose-subtle border-2 border-rose-border border-b-4 border-b-rose-border-dark items-center justify-center flex-row"
                            >
                              <Ionicons name="trash-outline" size={14} color={colors.rose} />
                              <Text className="text-rose-dark font-black text-xs ml-1.5">
                                Delete
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        /* Inline Edit Mode */
                        <View>
                          {/* Category Selector */}
                          <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-2">
                            Select Category
                          </Text>
                          <View className="flex-row flex-wrap gap-2 mb-3">
                            {eligibleCategories.map((cat) => {
                              const isSelected = cat.id === editCategoryId;
                              const paletteToken =
                                (cat.color_code as PaletteToken) ||
                                (isIncome ? "emerald" : "primary");
                              const palette = PALETTE_CONFIG[paletteToken] || PALETTE_CONFIG.primary;

                              return (
                                <TouchableOpacity
                                  key={cat.id}
                                  activeOpacity={0.8}
                                  onPress={() => setEditCategoryId(cat.id)}
                                  className={`will-change-variable flex-row items-center px-3 py-1.5 rounded-xl border-2 ${isSelected
                                    ? `${palette.bgSubtleClass} ${palette.borderClass}`
                                    : "bg-bg-app border-border-card border-b-4 border-b-border-card-dark"
                                    }`}
                                >
                                  {cat.icon_name && (
                                    <View className="mr-1">
                                      {cat.icon_family === "MaterialCommunityIcons" ? (
                                        <MaterialCommunityIcons
                                          name={cat.icon_name as any}
                                          size={14}
                                          color={isSelected ? palette.iconColor : colors.textMuted}
                                        />
                                      ) : (
                                        <Ionicons
                                          name={cat.icon_name as any}
                                          size={14}
                                          color={isSelected ? palette.iconColor : colors.textMuted}
                                        />
                                      )}
                                    </View>
                                  )}
                                  <Text
                                    className={`will-change-variable text-[11px] font-black ${isSelected ? palette.textClass : "text-text-main"
                                      }`}
                                  >
                                    {cat.name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          {/* Note Input */}
                          <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-1.5">
                            Note / Description
                          </Text>
                          <View className="bg-bg-card rounded-2xl px-3.5 py-2.5 border-2 border-border-card border-b-4 border-b-border-card-dark mb-3.5">
                            <TextInput
                              value={editNote}
                              onChangeText={setEditNote}
                              onFocus={() => {
                                setTimeout(() => {
                                  scrollViewRef.current?.scrollTo({ y: 200, animated: true });
                                }, 100);
                              }}
                              placeholder="Add transaction note..."
                              placeholderTextColor={colors.textMuted}
                              className="text-xs text-text-main font-bold py-0"
                              maxLength={80}
                            />
                          </View>

                          {/* Edit Action Buttons */}
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={handleCancelEditing}
                              className="flex-1 py-2.5 rounded-2xl bg-bg-app border-2 border-border-card border-b-4 border-b-border-card-dark items-center justify-center"
                            >
                              <Text className="text-text-muted font-black text-xs uppercase">
                                Cancel
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              activeOpacity={0.85}
                              disabled={isSubmitting}
                              onPress={() => handleSaveEdit(item)}
                              className="flex-1 py-2.5 rounded-2xl bg-primary border-2 border-primary-light border-b-4 border-b-primary-dark items-center justify-center"
                            >
                              <Text className="text-white font-black text-xs uppercase tracking-wider">
                                {isSubmitting ? "Saving..." : "Save Changes"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </CartoonCard>
              );
            })
          )}
        </ScrollView>

        {/* Recurring Bills Review Modal */}
        <RecurringReviewModal
          visible={isReviewModalVisible}
          onClose={() => setIsReviewModalVisible(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}