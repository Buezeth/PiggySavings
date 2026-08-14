import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  // Biometric & Notification modules/flows are not installed/configured in the current project runtime.
  // We mark both as unavailable, keep state false and disabled.
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const isBiometricsAvailable = false;
  const isNotificationsAvailable = false;

  const handleBiometricsToggle = (value: boolean) => {
    if (!isBiometricsAvailable) {
      Alert.alert(
        "Biometrics Unavailable",
        "Biometric authentication is not supported or configured on this device."
      );
      return;
    }
    setBiometricsEnabled(value);
  };

  const handleNotificationsToggle = (value: boolean) => {
    if (!isNotificationsAvailable) {
      Alert.alert(
        "Notifications Unavailable",
        "Push notification permissions and services are currently unavailable."
      );
      return;
    }
    setNotificationsEnabled(value);
  };

  const handleEditProfile = () => {
    Alert.alert("Edit Profile", "Profile editing feature configuration.");
  };

  const handleAutoAllocationRules = () => {
    Alert.alert("Auto-Allocation Rules", "Goal auto-allocation rule management.");
  };

  const handleCurrencySettings = () => {
    Alert.alert("Currency", "Selected currency: USD ($).");
  };

  const handleDataPrivacy = () => {
    Alert.alert(
      "Data Privacy",
      "Local data storage and security parameters."
    );
  };

  return (
    <View style={{ paddingTop: Math.max(insets.top, 16) }} className="flex-1 bg-bg-app">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-4 mb-6">
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider">
            Account & Security
          </Text>
          <Text className="text-text-main text-2xl font-bold mt-0.5">
            Profile & Settings 👤
          </Text>
        </View>

        {/* User Profile Card */}
        <View className="bg-bg-card rounded-3xl p-5 mb-6 border border-border-card shadow-sm flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-primary items-center justify-center mr-4">
            <Text className="text-white text-xl font-bold">JD</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-main text-lg font-bold">Jane Doe</Text>
            <Text className="text-text-muted text-xs font-medium mt-0.5">
              jane.doe@example.com
            </Text>
            <View className="bg-coral-subtle self-start px-2.5 py-0.5 rounded-full mt-2">
              <Text className="text-primary text-[10px] font-bold">
                PRO SAVER MEMBER
              </Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Edit Profile"
            onPress={handleEditProfile}
            className="p-2"
          >
            <Ionicons name="create-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Settings Group - Preferences */}
        <Text className="text-text-main text-lg font-bold mb-3">
          App Preferences
        </Text>

        <View className="bg-bg-card rounded-3xl p-4 mb-6 border border-border-card shadow-sm">
          {/* Security & Biometrics */}
          <View className="flex-row items-center justify-between py-3 border-b border-bg-app">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-coral-subtle items-center justify-center mr-3">
                <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text className="text-text-main text-sm font-semibold">
                  Biometric Unlock
                </Text>
                {!isBiometricsAvailable && (
                  <Text className="text-text-muted text-xs font-normal mt-0.5">
                    Unavailable on this device
                  </Text>
                )}
              </View>
            </View>
            <Switch
              disabled={!isBiometricsAvailable}
              value={biometricsEnabled}
              onValueChange={handleBiometricsToggle}
              trackColor={{ false: colors.mutedTrack, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {/* Smart Nudges & Notifications */}
          <View className="flex-row items-center justify-between py-3 border-b border-bg-app">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-coral-subtle items-center justify-center mr-3">
                <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text className="text-text-main text-sm font-semibold">
                  Smart Nudges & Reminders
                </Text>
                {!isNotificationsAvailable && (
                  <Text className="text-text-muted text-xs font-normal mt-0.5">
                    Unavailable on this device
                  </Text>
                )}
              </View>
            </View>
            <Switch
              disabled={!isNotificationsAvailable}
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.mutedTrack, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {/* Allocation Strategy */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Auto-Allocation Rules"
            onPress={handleAutoAllocationRules}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-coral-subtle items-center justify-center mr-3">
                <MaterialCommunityIcons name="cog-outline" size={20} color={colors.primary} />
              </View>
              <Text className="text-text-main text-sm font-semibold">
                Auto-Allocation Rules
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Currency & Privacy */}
        <Text className="text-text-main text-lg font-bold mb-3">
          Security & Privacy
        </Text>

        <View className="bg-bg-card rounded-3xl p-4 mb-6 border border-border-card shadow-sm">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Currency Settings"
            onPress={handleCurrencySettings}
            className="flex-row items-center justify-between py-3 border-b border-bg-app"
          >
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-coral-subtle items-center justify-center mr-3">
                <Ionicons name="cash-outline" size={20} color={colors.primary} />
              </View>
              <Text className="text-text-main text-sm font-semibold">
                Currency (USD - $)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Data Privacy & Settings"
            onPress={handleDataPrivacy}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-coral-subtle items-center justify-center mr-3">
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <Text className="text-text-main text-sm font-semibold">
                Data Privacy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
