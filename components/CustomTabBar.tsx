import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Define tab configuration order
  const tabs = [
    {
      routeName: "index",
      label: "Goals",
      renderIcon: (focused: boolean) => (
        <MaterialCommunityIcons
          name={focused ? "piggy-bank" : "piggy-bank-outline"}
          size={24}
          color={focused ? "#EE6A3B" : "#8C7B75"}
        />
      ),
    },
    {
      routeName: "activity",
      label: "Activity",
      renderIcon: (focused: boolean) => (
        <Ionicons
          name={focused ? "card" : "card-outline"}
          size={22}
          color={focused ? "#EE6A3B" : "#8C7B75"}
        />
      ),
    },
    // Center Quick Add FAB placeholder index
    {
      isFab: true,
    },
    {
      routeName: "insights",
      label: "Insights",
      renderIcon: (focused: boolean) => (
        <Ionicons
          name={focused ? "bar-chart" : "bar-chart-outline"}
          size={22}
          color={focused ? "#EE6A3B" : "#8C7B75"}
        />
      ),
    },
    {
      routeName: "profile",
      label: "Profile",
      renderIcon: (focused: boolean) => (
        <Ionicons
          name={focused ? "person" : "person-outline"}
          size={22}
          color={focused ? "#EE6A3B" : "#8C7B75"}
        />
      ),
    },
  ];

  return (
    <View
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
      }}
      className="bg-[#FFFFFF] border-t border-[#F3ECE7] pt-2 px-3 flex-row items-center justify-around shadow-sm"
    >
      {tabs.map((tab) => {
        if (tab.isFab) {
          return (
            <View key="center-fab" className="items-center justify-center -top-5">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push("/add-transaction")}
                style={{
                  shadowColor: "#EE6A3B",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  elevation: 8,
                }}
                className="w-14 h-14 rounded-full bg-[#EE6A3B] items-center justify-center border-4 border-[#FAF4F0]"
              >
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          );
        }

        const routeIndex = state.routes.findIndex(
          (r) => r.name === tab.routeName
        );
        const isFocused = state.index === routeIndex;

        const onPress = () => {
          if (routeIndex !== -1) {
            const event = navigation.emit({
              type: "tabPress",
              target: state.routes[routeIndex].key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented && tab.routeName) {
              navigation.navigate(tab.routeName);
            }
          }
        };

        const onLongPress = () => {
          if (tab.routeName && routeIndex !== -1 && state.routes[routeIndex]) {
            navigation.emit({
              type: "tabLongPress",
              target: state.routes[routeIndex].key,
            });
          }
        };

        return (
          <TouchableOpacity
            key={tab.routeName}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            className="items-center justify-center px-3 py-1"
          >
            <View className="items-center mb-1">
              {tab.renderIcon && tab.renderIcon(isFocused)}
            </View>
            <Text
              className={`text-[11px] ${
                isFocused
                  ? "text-[#331C14] font-bold"
                  : "text-[#8C7B75] font-medium"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
