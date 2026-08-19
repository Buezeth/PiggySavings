import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CartoonCard } from "./CartoonCard";
import { colors } from "../constants/theme";
import { SUPPORTED_CURRENCIES, CurrencyOption } from "../constants/currencies";

export interface CurrencyPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCurrencyCode: string;
  onSelectCurrency: (code: string) => void;
}

interface CurrencyItemProps {
  currency: CurrencyOption;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

const ITEM_HEIGHT = 74; // Exact height of each currency row + margin (64px + 10px margin)

// Memoized single list item component
const CurrencyListItem = React.memo(({ currency, isSelected, onSelect }: CurrencyItemProps) => {
  const roundingText =
    currency.rounding > 0
      ? ` • step ${currency.rounding}`
      : currency.decimal_digits === 0
      ? " • 0 decimals"
      : "";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onSelect(currency.code)}
      style={{ height: 64 }}
      className={`flex-row items-center justify-between px-3.5 rounded-2xl mb-2.5 border-2 ${
        isSelected
          ? "bg-coral-subtle border-primary border-b-4 border-b-primary-dark"
          : "bg-bg-app border-border-card border-b-4 border-b-border-card-dark"
      }`}
    >
      <View className="flex-row items-center flex-1 mr-3">
        <View
          className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${
            isSelected ? "bg-primary" : "bg-bg-card"
          }`}
        >
          <Text
            className={`text-sm font-black ${
              isSelected ? "text-white" : "text-text-main"
            }`}
            numberOfLines={1}
          >
            {currency.symbol.trim()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-text-main text-sm font-black" numberOfLines={1}>
            {currency.name}
          </Text>
          <Text className="text-text-muted text-xs font-bold mt-0.5" numberOfLines={1}>
            {currency.code} ({currency.symbol}) {roundingText}
          </Text>
        </View>
      </View>

      {isSelected && (
        <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
          <Ionicons name="checkmark" size={16} color={colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
});

CurrencyListItem.displayName = "CurrencyListItem";

/**
 * CurrencyPickerModal:
 * High-performance virtualized modal (FlatList with getItemLayout) for true 0ms latency.
 */
export const CurrencyPickerModal: React.FC<CurrencyPickerModalProps> = ({
  visible,
  onClose,
  selectedCurrencyCode,
  onSelectCurrency,
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.symbol_native.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelect = useCallback(
    (code: string) => {
      onSelectCurrency(code);
      setSearchQuery("");
      onClose();
    },
    [onSelectCurrency, onClose]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CurrencyOption>) => {
      const isSelected =
        item.code.toUpperCase() === selectedCurrencyCode.toUpperCase();
      return (
        <CurrencyListItem
          currency={item}
          isSelected={isSelected}
          onSelect={handleSelect}
        />
      );
    },
    [selectedCurrencyCode, handleSelect]
  );

  const keyExtractor = useCallback((item: CurrencyOption) => item.code, []);

  // getItemLayout skips dynamic measurement calculations for all 119 items
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <Pressable
          onPress={onClose}
          className="flex-1 bg-black-overlay-60 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-h-[85%]"
          >
            <CartoonCard
              variant="card"
              className="rounded-t-3xl rounded-b-none border-t-2 border-x-2 border-b-0 border-border-card p-0 overflow-hidden"
            >
              {/* Header */}
              <View className="px-6 pt-5 pb-3 flex-row items-center justify-between border-b border-bg-app">
                <View>
                  <Text className="text-text-muted text-xs font-bold uppercase tracking-wider">
                    Display Currency
                  </Text>
                  <Text className="text-text-main text-lg font-black mt-0.5">
                    Choose Currency 💱 ({SUPPORTED_CURRENCIES.length})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-9 h-9 rounded-full bg-bg-app items-center justify-center border border-border-card"
                >
                  <Ionicons name="close" size={18} color={colors.textMain} />
                </TouchableOpacity>
              </View>

              {/* Search Filter Bar */}
              <View className="px-6 pt-3 pb-2">
                <View className="bg-bg-app rounded-2xl px-4 py-2.5 flex-row items-center border-2 border-border-card border-b-4 border-b-border-card-dark">
                  <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    placeholder="Search currency code, name, symbol..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 ml-2 text-sm text-text-main font-semibold"
                    autoCapitalize="none"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Optimized FlatList */}
              <FlatList
                data={filteredCurrencies}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                contentContainerStyle={{
                  paddingHorizontal: 24,
                  paddingTop: 8,
                  paddingBottom: Math.max(insets.bottom, 24) + 40,
                }}
                showsVerticalScrollIndicator={false}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={3}
                removeClippedSubviews={true}
                ListEmptyComponent={
                  <View className="py-8 items-center justify-center">
                    <Text className="text-text-muted text-xs font-bold">
                      {`No currencies found matching "${searchQuery}".`}
                    </Text>
                  </View>
                }
              />
            </CartoonCard>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
export default CurrencyPickerModal;
