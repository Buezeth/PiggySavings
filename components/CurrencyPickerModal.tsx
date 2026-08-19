import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import { SUPPORTED_CURRENCIES, CurrencyOption } from "../constants/currencies";

export interface CurrencyPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCurrencyCode: string;
  onSelectCurrency: (code: string) => void;
}

/**
 * CurrencyPickerModal:
 * Tactile Cartoon modal allowing users to search and choose their preferred display currency.
 * Displays symbol, ISO code, name, and fraction digits/rounding info.
 */
export const CurrencyPickerModal: React.FC<CurrencyPickerModalProps> = ({
  visible,
  onClose,
  selectedCurrencyCode,
  onSelectCurrency,
}) => {
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black-overlay-60 justify-end"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-bg-card rounded-t-3xl border-t-2 border-border-card max-h-[85%]"
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

          {/* List of Currencies */}
          <ScrollView className="px-6 py-2" showsVerticalScrollIndicator={false}>
            {filteredCurrencies.length === 0 ? (
              <View className="py-8 items-center justify-center">
                <Text className="text-text-muted text-xs font-bold">
                  {`No currencies found matching "${searchQuery}".`}
                </Text>
              </View>
            ) : (
              filteredCurrencies.map((currency) => {
                const isSelected =
                  currency.code.toUpperCase() === selectedCurrencyCode.toUpperCase();

                const roundingText =
                  currency.rounding > 0
                    ? ` • step ${currency.rounding}`
                    : currency.decimal_digits === 0
                    ? " • 0 decimals"
                    : "";

                return (
                  <TouchableOpacity
                    key={currency.code}
                    activeOpacity={0.8}
                    onPress={() => {
                      onSelectCurrency(currency.code);
                      setSearchQuery("");
                      onClose();
                    }}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl mb-2.5 border-2 ${
                      isSelected
                        ? "bg-coral-subtle border-primary border-b-4 border-b-primary-dark"
                        : "bg-bg-app border-border-card border-b-4 border-b-border-card-dark"
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      <View
                        className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${
                          isSelected ? "bg-primary" : "bg-bg-card"
                        }`}
                      >
                        <Text
                          className={`text-base font-black ${
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
                        <Text className="text-text-muted text-xs font-bold mt-0.5">
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
              })
            )}
            <View className="h-6" />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
export default CurrencyPickerModal;
