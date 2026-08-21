import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  IconDefinition,
  IconDomain,
  searchIcons,
} from "../constants/iconRegistry";
import { colors } from "../constants/theme";

export interface IconPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedIconName?: string;
  onSelectIcon: (icon: IconDefinition) => void;
  title?: string;
}

interface DomainChip {
  id: IconDomain | "all";
  label: string;
}

const DOMAIN_CHIPS: DomainChip[] = [
  { id: "all", label: "All" },
  { id: "food", label: "Food" },
  { id: "housing", label: "Home" },
  { id: "transport", label: "Travel" },
  { id: "lifestyle", label: "Fun" },
  { id: "health", label: "Health" },
  { id: "finance", label: "Finance" },
  { id: "milestones", label: "Goals" },
];

interface IconGridCellProps {
  item: IconDefinition;
  isSelected: boolean;
  onSelect: (icon: IconDefinition) => void;
}

// Memoized Grid Cell: Prevents 56 items re-rendering on every keystroke
const IconGridCell = React.memo(
  ({ item, isSelected, onSelect }: IconGridCellProps) => {
    return (
      <View className="flex-1 p-1.5 items-center justify-center">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onSelect(item)}
          className={`will-change-variable w-full aspect-square rounded-2xl items-center justify-center border-2 border-b-4 ${isSelected
              ? "bg-coral-subtle border-primary-light border-b-primary-dark"
              : "bg-bg-card border-border-card border-b-border-card-dark"
            }`}
        >
          {item.family === "Ionicons" ? (
            <Ionicons
              name={item.name as any}
              size={24}
              color={isSelected ? colors.primary : colors.textMain}
            />
          ) : (
            <MaterialCommunityIcons
              name={item.name as any}
              size={24}
              color={isSelected ? colors.primary : colors.textMain}
            />
          )}
          <Text
            numberOfLines={1}
            className={`will-change-variable text-[10px] font-bold mt-1 text-center px-1 ${isSelected ? "text-primary" : "text-text-muted"
              }`}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected && prev.item.id === next.item.id
);

IconGridCell.displayName = "IconGridCell";

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  visible,
  onClose,
  selectedIconName,
  onSelectIcon,
  title = "Select Icon",
}) => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = Math.round(screenHeight * 0.85);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<IconDomain | "all">("all");

  const filteredIcons = useMemo(() => {
    const domainFilter = selectedDomain === "all" ? undefined : selectedDomain;
    return searchIcons(searchQuery, domainFilter);
  }, [searchQuery, selectedDomain]);

  const handleSelect = useCallback(
    (icon: IconDefinition) => {
      onSelectIcon(icon);
      onClose();
    },
    [onSelectIcon, onClose]
  );

  const renderIconItem = useCallback(
    ({ item }: { item: IconDefinition }) => {
      const isSelected =
        selectedIconName === item.name || selectedIconName === item.id;

      return (
        <IconGridCell
          item={item}
          isSelected={isSelected}
          onSelect={handleSelect}
        />
      );
    },
    [selectedIconName, handleSelect]
  );

  const keyExtractor = useCallback((item: IconDefinition) => item.id, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black-overlay-60 justify-end">
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
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              </View>
              <Text className="text-text-main text-lg font-black tracking-tight">
                {title}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-coral-subtle border border-border-card items-center justify-center"
              accessibilityLabel="Close icon picker"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="px-4 pt-3 pb-2 bg-bg-app">
            <View className="flex-row items-center bg-bg-card rounded-2xl border-2 border-border-card border-b-4 border-b-border-card-dark px-3 py-2">
              <Ionicons
                name="search"
                size={18}
                color={colors.textMuted}
                style={{ marginRight: 8 }}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search 50+ vector icons..."
                placeholderTextColor={colors.textMuted}
                className="flex-1 text-sm font-bold text-text-main py-0"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSearchQuery("")}
                  className="p-1"
                >
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Domain Filter Chips */}
          <View className="py-2 bg-bg-app">
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={DOMAIN_CHIPS}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => {
                const isActive = selectedDomain === item.id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setSelectedDomain(item.id)}
                    className={`will-change-variable px-3.5 py-1.5 rounded-full mr-2 border-2 border-b-4 ${isActive
                        ? "bg-primary border-primary-light border-b-primary-dark"
                        : "bg-bg-card border-border-card border-b-border-card-dark"
                      }`}
                  >
                    <Text
                      className={`will-change-variable text-xs font-black ${isActive ? "text-white" : "text-text-main"
                        }`}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Virtualized Icon Grid */}
          <View className="flex-1 px-3 pt-1">
            {filteredIcons.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Ionicons
                  name="search-outline"
                  size={40}
                  color={colors.textMuted}
                />
                <Text className="text-text-main font-black text-base mt-2">
                  No icons found
                </Text>
                <Text className="text-text-muted text-xs font-bold mt-1">
                  Try searching with another keyword
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredIcons}
                keyExtractor={keyExtractor}
                renderItem={renderIconItem}
                numColumns={4}
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                windowSize={4}
                removeClippedSubviews={Platform.OS === "android"}
                contentContainerStyle={{
                  paddingBottom: 24,
                  paddingTop: 4,
                }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default IconPickerModal;