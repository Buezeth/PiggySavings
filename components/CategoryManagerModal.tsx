import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PALETTE_CONFIG, PaletteToken } from "../constants/iconRegistry";
import { colors } from "../constants/theme";
import { useApp } from "../context/AppContext";
import {
  getAllCategoryUsageCounts,
  getCategoryUsageCount,
} from "../repositories/categoryRepo";
import { CategoryRow } from "../services/db/types";
import { CartoonCard } from "./CartoonCard";
import CategoryFormModal from "./CategoryFormModal";

export interface CategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { categories, deleteCategory, refreshData } = useApp();

  const [usageCounts, setUsageCounts] = useState<
    Record<string, { transactionCount: number; scheduleCount: number }>
  >({});

  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryRow | null>(null);
  const [formDefaultType, setFormDefaultType] = useState<"income" | "expense">("expense");

  const [activeStep, setActiveStep] = useState<"list" | "reassign">("list");
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories]
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories]
  );

  // Fast single batch query for all usage counts
  useEffect(() => {
    let isMounted = true;
    if (visible) {
      getAllCategoryUsageCounts()
        .then((counts) => {
          if (isMounted) {
            setUsageCounts(counts);
          }
        })
        .catch((err) => {
          console.warn("[CategoryManagerModal] Usage count error:", err);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [visible, categories]);

  const handleOpenCreate = (type: "income" | "expense" = "expense") => {
    setCategoryToEdit(null);
    setFormDefaultType(type);
    setIsFormModalVisible(true);
  };

  const handleOpenEdit = (category: CategoryRow) => {
    setCategoryToEdit(category);
    setFormDefaultType(category.type);
    setIsFormModalVisible(true);
  };

  const handleDeletePress = async (category: CategoryRow) => {
    if (category.is_default === 1) {
      Alert.alert("Default Category", "System default categories cannot be deleted.");
      return;
    }

    try {
      const counts = await getCategoryUsageCount(category.id);
      const totalUsage = counts.transactionCount + counts.scheduleCount;

      if (totalUsage === 0) {
        Alert.alert(
          "Delete Category",
          `Are you sure you want to delete "${category.name}"?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  setIsDeleting(true);
                  await deleteCategory(category.id);
                } catch (err: any) {
                  Alert.alert("Error", err?.message || "Failed to delete category.");
                } finally {
                  setIsDeleting(false);
                }
              },
            },
          ]
        );
      } else {
        setCategoryToDelete(category);
        setActiveStep("reassign");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to inspect category references.");
    }
  };

  const handleExecuteReassignment = async (targetCategoryId: string) => {
    if (!categoryToDelete) return;

    try {
      setIsDeleting(true);
      const result = await deleteCategory(categoryToDelete.id, targetCategoryId);
      setActiveStep("list");
      setCategoryToDelete(null);

      Alert.alert(
        "Category Deleted",
        `Successfully deleted "${categoryToDelete.name}" and migrated ${result.reassignedCount} record(s).`
      );
    } catch (err: any) {
      Alert.alert("Deletion Error", err?.message || "Failed to migrate and delete category.");
    } finally {
      setIsDeleting(false);
    }
  };

  const migrationCandidates = useMemo(() => {
    if (!categoryToDelete) return [];
    return categories.filter(
      (c) => c.type === categoryToDelete.type && c.id !== categoryToDelete.id
    );
  }, [categories, categoryToDelete]);

  const renderCategoryRow = (category: CategoryRow, isLast: boolean) => {
    const isDefault = category.is_default === 1;
    const paletteToken =
      (category.color_code as PaletteToken) ||
      (category.type === "income" ? "emerald" : "primary");
    const palette = PALETTE_CONFIG[paletteToken] || PALETTE_CONFIG.primary;
    const counts = usageCounts[category.id] ?? { transactionCount: 0, scheduleCount: 0 };

    return (
      <View
        key={category.id}
        className={`flex-row items-center justify-between py-3 ${!isLast ? "border-b border-bg-app" : ""
          }`}
      >
        <View className="flex-row items-center flex-1 mr-3">
          <View
            className={`will-change-variable w-11 h-11 rounded-2xl items-center justify-center mr-3 border-2 border-b-4 ${palette.bgSubtleClass} ${palette.borderClass}`}
          >
            {category.icon_family === "MaterialCommunityIcons" ? (
              <MaterialCommunityIcons
                name={(category.icon_name as any) || "tag-outline"}
                size={20}
                color={
                  paletteToken === "emerald"
                    ? colors.emerald
                    : paletteToken === "rose"
                      ? colors.rose
                      : paletteToken === "gold"
                        ? colors.goldDark
                        : colors.primary
                }
              />
            ) : (
              <Ionicons
                name={(category.icon_name as any) || "pricetag-outline"}
                size={20}
                color={
                  paletteToken === "emerald"
                    ? colors.emerald
                    : paletteToken === "rose"
                      ? colors.rose
                      : paletteToken === "gold"
                        ? colors.goldDark
                        : colors.primary
                }
              />
            )}
          </View>

          <View className="flex-1">
            <View className="flex-row items-center flex-wrap gap-1.5">
              <Text className="text-text-main text-sm font-black">
                {category.name}
              </Text>
              {isDefault && (
                <View className="bg-coral-subtle px-2 py-0.5 rounded-md border border-border-card flex-row items-center">
                  <Ionicons name="lock-closed" size={10} color={colors.primary} />
                  <Text className="text-primary text-[10px] font-black ml-1 uppercase">
                    Default
                  </Text>
                </View>
              )}
            </View>

            <Text className="text-text-muted text-xs font-bold mt-0.5">
              {counts.transactionCount} transaction
              {counts.transactionCount === 1 ? "" : "s"}
              {counts.scheduleCount > 0 &&
                ` • ${counts.scheduleCount} recurring`}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {!isDefault ? (
            <>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenEdit(category)}
                className="p-2 rounded-xl bg-bg-app border-2 border-border-card border-b-4 border-b-border-card-dark"
                accessibilityLabel={`Edit ${category.name}`}
              >
                <Ionicons name="pencil" size={14} color={colors.textMain} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleDeletePress(category)}
                className="p-2 rounded-xl bg-rose-subtle border-2 border-rose-border border-b-4 border-b-rose-border-dark"
                accessibilityLabel={`Delete ${category.name}`}
              >
                <Ionicons name="trash-outline" size={14} color={colors.rose} />
              </TouchableOpacity>
            </>
          ) : (
            <View className="p-2 rounded-xl bg-bg-app opacity-60">
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (activeStep === "reassign") {
          setActiveStep("list");
          setCategoryToDelete(null);
        } else {
          onClose();
        }
      }}
    >
      <View className="flex-1 bg-black-overlay-60 justify-end">
        <Pressable
          className="flex-1"
          onPress={() => {
            if (activeStep === "reassign") {
              setActiveStep("list");
              setCategoryToDelete(null);
            } else {
              onClose();
            }
          }}
        />

        <View
          style={{
            maxHeight: "88%",
            paddingBottom: Math.max(insets.bottom, 16),
          }}
          className="bg-bg-app rounded-t-[36px] border-t-2 border-border-card overflow-hidden"
        >
          {/* Header */}
          <View className="p-4 border-b border-border-card flex-row items-center justify-between bg-bg-card">
            <View className="flex-row items-center gap-2">
              {activeStep === "reassign" && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setActiveStep("list");
                    setCategoryToDelete(null);
                  }}
                  className="w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center mr-1"
                >
                  <Ionicons name="arrow-back" size={18} color={colors.textMain} />
                </TouchableOpacity>
              )}
              <View className="w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center mr-1">
                <Ionicons
                  name={activeStep === "reassign" ? "swap-horizontal" : "pricetags"}
                  size={16}
                  color={colors.primary}
                />
              </View>
              <Text className="text-text-main text-lg font-black tracking-tight">
                {activeStep === "reassign" ? "Reassign Records" : "Category Manager"}
              </Text>
            </View>

            {activeStep === "list" && (
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleOpenCreate("expense")}
                  className="flex-row items-center bg-primary px-3 py-1.5 rounded-full border border-primary-light"
                >
                  <Ionicons name="add" size={16} color={colors.white} />
                  <Text className="text-white text-xs font-black ml-1">
                    Add Category
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  className="w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center"
                  accessibilityLabel="Close category manager"
                >
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Stepped View 1: Main Category Manager List */}
          {activeStep === "list" && (
            <ScrollView
              className="p-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 16 }}
            >
              {/* EXPENSE CATEGORIES SECTION */}
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-6 h-6 rounded-lg bg-rose-subtle items-center justify-center">
                      <Ionicons name="arrow-down" size={14} color={colors.rose} />
                    </View>
                    <Text className="text-text-main text-base font-black tracking-tight">
                      Expense Categories ({expenseCategories.length})
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleOpenCreate("expense")}
                    className="bg-rose-subtle px-2.5 py-1 rounded-full border border-rose-border flex-row items-center"
                  >
                    <Ionicons name="add" size={12} color={colors.rose} />
                    <Text className="text-rose-dark text-[11px] font-black ml-1">
                      + Expense
                    </Text>
                  </TouchableOpacity>
                </View>

                <CartoonCard className="p-4">
                  {expenseCategories.map((category, index) =>
                    renderCategoryRow(
                      category,
                      index === expenseCategories.length - 1
                    )
                  )}
                </CartoonCard>
              </View>

              {/* INCOME CATEGORIES SECTION */}
              <View className="pb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-6 h-6 rounded-lg bg-emerald-subtle items-center justify-center">
                      <Ionicons name="arrow-up" size={14} color={colors.emerald} />
                    </View>
                    <Text className="text-text-main text-base font-black tracking-tight">
                      Income Categories ({incomeCategories.length})
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleOpenCreate("income")}
                    className="bg-emerald-subtle px-2.5 py-1 rounded-full border border-emerald-border flex-row items-center"
                  >
                    <Ionicons name="add" size={12} color={colors.emerald} />
                    <Text className="text-emerald-dark text-[11px] font-black ml-1">
                      + Income
                    </Text>
                  </TouchableOpacity>
                </View>

                <CartoonCard className="p-4">
                  {incomeCategories.map((category, index) =>
                    renderCategoryRow(
                      category,
                      index === incomeCategories.length - 1
                    )
                  )}
                </CartoonCard>
              </View>
            </ScrollView>
          )}

          {/* Stepped View 2: Safe Reassignment Step (No nested <Modal>) */}
          {activeStep === "reassign" && (
            <ScrollView
              className="p-5"
              showsVerticalScrollIndicator={false}
            >
              <View className="items-center mb-4 mt-1">
                <View className="w-14 h-14 rounded-3xl bg-gold-subtle border-2 border-gold-border border-b-4 border-b-gold-border-dark items-center justify-center mb-2">
                  <Ionicons name="swap-horizontal" size={26} color={colors.goldDark} />
                </View>
                <Text className="text-text-main text-base font-black text-center">
                  Reassign Category Records ⚠️
                </Text>
              </View>

              <Text className="text-text-muted text-xs font-bold text-center leading-5 mb-4">
                &quot;{categoryToDelete?.name}&quot; is used in active records. Select a replacement {categoryToDelete?.type} category to preserve your history:
              </Text>

              <View style={{ gap: 8 }} className="mb-4">
                {migrationCandidates.length === 0 ? (
                  <View className="p-4 bg-bg-card rounded-2xl items-center">
                    <Text className="text-text-muted text-xs font-bold">
                      No alternative {categoryToDelete?.type} categories available.
                    </Text>
                  </View>
                ) : (
                  migrationCandidates.map((candidate) => {
                    const paletteToken =
                      (candidate.color_code as PaletteToken) || "primary";
                    const palette = PALETTE_CONFIG[paletteToken] || PALETTE_CONFIG.primary;

                    return (
                      <TouchableOpacity
                        key={candidate.id}
                        activeOpacity={0.8}
                        disabled={isDeleting}
                        onPress={() => handleExecuteReassignment(candidate.id)}
                        className="will-change-variable flex-row items-center p-3 rounded-2xl border-2 bg-bg-card border-border-card border-b-4 border-b-border-card-dark"
                      >
                        <View
                          className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${palette.badgeBgClass}`}
                        >
                          {candidate.icon_family === "MaterialCommunityIcons" ? (
                            <MaterialCommunityIcons
                              name={(candidate.icon_name as any) || "tag-outline"}
                              size={18}
                              color={
                                paletteToken === "emerald"
                                  ? colors.emerald
                                  : paletteToken === "rose"
                                    ? colors.rose
                                    : paletteToken === "gold"
                                      ? colors.goldDark
                                      : colors.primary
                              }
                            />
                          ) : (
                            <Ionicons
                              name={(candidate.icon_name as any) || "pricetag-outline"}
                              size={18}
                              color={
                                paletteToken === "emerald"
                                  ? colors.emerald
                                  : paletteToken === "rose"
                                    ? colors.rose
                                    : paletteToken === "gold"
                                      ? colors.goldDark
                                      : colors.primary
                              }
                            />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-text-main font-black text-xs">
                            {candidate.name}
                          </Text>
                          <Text className="text-text-muted text-[10px] font-bold">
                            Migrate records here
                          </Text>
                        </View>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {isDeleting && (
                <View className="py-2 items-center mb-3">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text className="text-text-muted text-xs font-bold mt-1">
                    Migrating records safely...
                  </Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isDeleting}
                onPress={() => {
                  setActiveStep("list");
                  setCategoryToDelete(null);
                }}
                className="py-2.5 items-center justify-center"
              >
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider">
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>

      {/* ─── CREATE / EDIT CATEGORY MODAL ─── */}
      <CategoryFormModal
        visible={isFormModalVisible}
        onClose={() => {
          setIsFormModalVisible(false);
          setCategoryToEdit(null);
        }}
        categoryToEdit={categoryToEdit}
        defaultType={formDefaultType}
        onSuccess={() => {
          setIsFormModalVisible(false);
          setCategoryToEdit(null);
          refreshData();
        }}
      />
    </Modal>
  );
};

export default CategoryManagerModal;