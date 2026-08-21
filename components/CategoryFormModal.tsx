import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getIconById,
  ICON_REGISTRY,
  IconDefinition,
  PALETTE_CONFIG,
  PaletteToken,
} from "../constants/iconRegistry";
import { colors } from "../constants/theme";
import { useApp } from "../context/AppContext";
import { CategoryRow } from "../services/db/types";
import { CartoonCard } from "./CartoonCard";
import { IconPickerModal } from "./IconPickerModal";

export interface CategoryFormModalProps {
  visible: boolean;
  onClose: () => void;
  categoryToEdit?: CategoryRow | null;
  defaultType?: "income" | "expense";
  onSuccess?: (category: CategoryRow) => void;
}

const PALETTE_OPTIONS: PaletteToken[] = ["primary", "emerald", "gold", "rose"];

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  visible,
  onClose,
  categoryToEdit,
  defaultType = "expense",
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = Math.round(screenHeight * 0.88);

  const { createCategory, updateCategory } = useApp();

  const isEditing = !!categoryToEdit;
  const isSubmittingRef = useRef(false);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [selectedPalette, setSelectedPalette] = useState<PaletteToken>("primary");
  const [selectedIcon, setSelectedIcon] = useState<IconDefinition>(ICON_REGISTRY[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      if (categoryToEdit) {
        setName(categoryToEdit.name);
        setType(categoryToEdit.type);
        const palette =
          (categoryToEdit.color_code as PaletteToken) ||
          (categoryToEdit.type === "income" ? "emerald" : "primary");
        setSelectedPalette(
          PALETTE_OPTIONS.includes(palette) ? palette : "primary"
        );

        const matchedIcon =
          ICON_REGISTRY.find(
            (i) =>
              i.name === categoryToEdit.icon_name &&
              i.family === categoryToEdit.icon_family
          ) ||
          ICON_REGISTRY.find((i) => i.name === categoryToEdit.icon_name) ||
          ICON_REGISTRY[0];

        setSelectedIcon(matchedIcon);
      } else {
        setName("");
        setType(defaultType);
        setSelectedPalette(defaultType === "income" ? "emerald" : "primary");
        setSelectedIcon(
          defaultType === "income" ? getIconById("finance-salary") : ICON_REGISTRY[0]
        );
      }
      setError(null);
      setIsIconPickerOpen(false);
    }
  }, [visible, categoryToEdit, defaultType]);

  const activePalette = PALETTE_CONFIG[selectedPalette] || PALETTE_CONFIG.primary;

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a category name.");
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      let resultCategory: CategoryRow | null = null;

      if (isEditing && categoryToEdit) {
        resultCategory = await updateCategory(categoryToEdit.id, {
          name: trimmedName,
          ...(type !== categoryToEdit.type ? { type } : {}),
          icon_name: selectedIcon.name,
          icon_family: selectedIcon.family,
          color_code: selectedPalette,
        });
      } else {
        resultCategory = await createCategory({
          name: trimmedName,
          type,
          icon_name: selectedIcon.name,
          icon_family: selectedIcon.family,
          color_code: selectedPalette,
        });
      }

      if (resultCategory && onSuccess) {
        onSuccess(resultCategory);
      }

      onClose();
    } catch (err: any) {
      console.error("[CategoryFormModal] Save error:", err);
      setError(err?.message || "Failed to save category. Please try again.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-black-overlay-60 justify-end"
        >
          <Pressable className="flex-1" onPress={onClose} />

          <View
            style={{
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
            className="bg-bg-app rounded-t-[36px] border-t-2 border-border-card overflow-hidden flex-col"
          >
            {/* Header */}
            <View className="p-4 border-b border-border-card flex-row items-center justify-between bg-bg-card">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center mr-2">
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <Text className="text-text-main text-lg font-black tracking-tight">
                  {isEditing ? "Edit Category" : "New Category"}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center"
                accessibilityLabel="Close category modal"
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Main Category Form */}
            <ScrollView
              className="flex-1 p-4"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 14 }}
            >
              {/* LIVE CARD PREVIEW */}
              <View className="items-center">
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-2 self-start">
                  Live Preview
                </Text>
                <View
                  className={`will-change-variable w-full flex-row items-center p-4 rounded-3xl border-2 border-b-4 ${activePalette.bgSubtleClass} ${activePalette.borderClass}`}
                >
                  <View
                    className={`will-change-variable w-12 h-12 rounded-2xl items-center justify-center mr-3.5 border-2 border-b-4 ${activePalette.bgClass} ${activePalette.borderClass}`}
                  >
                    {selectedIcon.family === "Ionicons" ? (
                      <Ionicons
                        name={selectedIcon.name}
                        size={22}
                        color={colors.white}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name={selectedIcon.name}
                        size={22}
                        color={colors.white}
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-main font-black text-base">
                      {name.trim() || "Category Name"}
                    </Text>
                    <Text
                      className={`will-change-variable text-xs font-black uppercase tracking-wider ${activePalette.textClass}`}
                    >
                      {type === "income" ? "Income Category" : "Expense Category"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* SEGMENTED SWITCH: INCOME VS EXPENSE */}
              <View>
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-2">
                  Category Type
                </Text>
                <View className="flex-row bg-bg-card p-1.5 rounded-2xl border-2 border-border-card border-b-4 border-b-border-card-dark">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setType("income");
                      if (selectedPalette === "primary" || selectedPalette === "rose") {
                        setSelectedPalette("emerald");
                      }
                    }}
                    className={`will-change-variable flex-1 py-2.5 rounded-xl items-center flex-row justify-center border-2 border-b-4 ${type === "income"
                        ? "bg-emerald border-emerald-light border-b-emerald-dark"
                        : "bg-transparent border-transparent border-b-transparent"
                      }`}
                  >
                    <Ionicons
                      name="arrow-up-circle"
                      size={18}
                      color={type === "income" ? colors.white : colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className={`will-change-variable text-xs font-black ${type === "income" ? "text-white" : "text-text-muted"
                        }`}
                    >
                      Income
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setType("expense");
                      if (selectedPalette === "emerald") {
                        setSelectedPalette("primary");
                      }
                    }}
                    className={`will-change-variable flex-1 py-2.5 rounded-xl items-center flex-row justify-center border-2 border-b-4 ${type === "expense"
                        ? "bg-rose border-rose-light border-b-rose-dark"
                        : "bg-transparent border-transparent border-b-transparent"
                      }`}
                  >
                    <Ionicons
                      name="arrow-down-circle"
                      size={18}
                      color={type === "expense" ? colors.white : colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className={`will-change-variable text-xs font-black ${type === "expense" ? "text-white" : "text-text-muted"
                        }`}
                    >
                      Expense
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* NAME INPUT */}
              <View>
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-2">
                  Category Name
                </Text>
                <View className="bg-bg-card rounded-2xl border-2 border-border-card border-b-4 border-b-border-card-dark px-3.5 py-2.5">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Subscriptions, Side Hustle..."
                    placeholderTextColor={colors.textMuted}
                    className="text-sm font-bold text-text-main py-0"
                    maxLength={30}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* PALETTE SELECTOR */}
              <View>
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-2">
                  Color Theme
                </Text>
                <View className="flex-row justify-between gap-2">
                  {PALETTE_OPTIONS.map((token) => {
                    const cfg = PALETTE_CONFIG[token];
                    const isSelected = selectedPalette === token;

                    return (
                      <TouchableOpacity
                        key={token}
                        activeOpacity={0.8}
                        onPress={() => setSelectedPalette(token)}
                        className={`will-change-variable flex-1 aspect-square rounded-2xl items-center justify-center border-2 border-b-4 ${cfg.bgClass} ${cfg.borderClass} ${isSelected ? "opacity-100" : "opacity-60"
                          }`}
                      >
                        {isSelected && (
                          <View className="w-6 h-6 rounded-full bg-white-overlay-30 items-center justify-center">
                            <Ionicons name="checkmark" size={16} color={colors.white} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ICON PICKER TRIGGER */}
              <View>
                <Text className="text-text-muted text-xs font-black uppercase tracking-wider mb-2">
                  Icon
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsIconPickerOpen(true)}
                  className="bg-bg-card p-3 rounded-2xl border-2 border-border-card border-b-4 border-b-border-card-dark flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`will-change-variable w-10 h-10 rounded-xl items-center justify-center mr-2 ${activePalette.badgeBgClass}`}
                    >
                      {selectedIcon.family === "Ionicons" ? (
                        <Ionicons
                          name={selectedIcon.name}
                          size={20}
                          color={activePalette.colorCode}
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name={selectedIcon.name}
                          size={20}
                          color={activePalette.colorCode}
                        />
                      )}
                    </View>
                    <View>
                      <Text className="text-text-main font-black text-sm">
                        {selectedIcon.label}
                      </Text>
                      <Text className="text-text-muted font-bold text-xs">
                        Domain: {selectedIcon.domain}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <Text className="text-primary font-bold text-xs mr-1">
                      Change
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* ERROR BANNER */}
              {error && (
                <View className="bg-rose-subtle p-3 rounded-2xl border-2 border-rose-border items-center">
                  <Text className="text-rose-dark font-bold text-xs text-center">
                    {error}
                  </Text>
                </View>
              )}

              {/* SUBMIT BUTTON */}
              <View className="pt-2 pb-6">
                <CartoonCard
                  variant="accent"
                  interactive
                  onPress={isSubmitting ? undefined : handleSubmit}
                  className="p-3.5 items-center flex-row justify-center"
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.white}
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-white font-black text-base tracking-wide">
                        {isEditing ? "Save Changes" : "Create Category"}
                      </Text>
                    </>
                  )}
                </CartoonCard>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Shared Icon Picker Modal */}
      <IconPickerModal
        visible={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        selectedIconName={selectedIcon.name}
        onSelectIcon={(icon) => {
          setSelectedIcon(icon);
          setIsIconPickerOpen(false);
        }}
        title="Choose Category Icon"
      />
    </>
  );
};

export default CategoryFormModal;