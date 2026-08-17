import CartoonCard from "@/components/CartoonCard";
import { colors } from "@/constants/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const [isNotificationsAvailable, setIsNotificationsAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkCapabilities() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (isMounted) {
          setIsBiometricsAvailable(hasHardware && isEnrolled);
        }
      } catch {
        if (isMounted) {
          setIsBiometricsAvailable(false);
        }
      }

      try {
        const { status } = await getPermissionsAsync();
        if (isMounted) {
          const granted = status === "granted";
          setIsNotificationsAvailable(true);
          setNotificationsEnabled(granted);
        }
      } catch {
        if (isMounted) {
          setIsNotificationsAvailable(false);
        }
      }
    }

    checkCapabilities();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleBiometricsToggle = async (value: boolean) => {
    if (!isBiometricsAvailable) {
      Alert.alert(
        "Biometrics Unavailable",
        "Biometric authentication is not supported or configured on this device."
      );
      return;
    }

    if (value) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to enable Biometric Unlock",
          fallbackLabel: "Use Passcode",
        });
        if (result.success) {
          setBiometricsEnabled(true);
        }
      } catch {
        Alert.alert("Authentication Error", "Unable to complete biometric authentication.");
      }
    } else {
      setBiometricsEnabled(false);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    if (!isNotificationsAvailable) {
      Alert.alert(
        "Notifications Unavailable",
        "Push notification permissions and services are currently unavailable."
      );
      return;
    }

    if (value) {
      try {
        const { status } = await requestPermissionsAsync();
        if (status === "granted") {
          setNotificationsEnabled(true);
        } else {
          setNotificationsEnabled(false);
          Alert.alert(
            "Permission Required",
            "Please enable notification permissions in your device settings to receive smart nudges."
          );
        }
      } catch {
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
    }
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
    Alert.alert("Data Privacy", "Local data storage and security parameters.");
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
          <Text className="text-text-muted text-xs font-bold uppercase tracking-wider">
            Account & Security
          </Text>
          <Text className="text-text-main text-2xl font-black mt-0.5">
            Profile & Settings 👤
          </Text>
        </View>

        {/* User Profile CartoonCard */}
        <CartoonCard className="mb-6 p-5 flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-primary items-center justify-center mr-4">
            <Text className="text-white text-xl font-black">JD</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-main text-lg font-black">Jane Doe</Text>
            <Text className="text-text-muted text-xs font-bold mt-0.5">
              jane.doe@example.com
            </Text>
            <View className="bg-coral-subtle self-start px-3 py-1 rounded-full mt-2 border border-border-card">
              <Text className="text-primary text-[10px] font-black uppercase tracking-wider">
                🌟 Level 4 Saver
              </Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Edit Profile"
            onPress={handleEditProfile}
            className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center"
          >
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        </CartoonCard>

        {/* Settings Group - Preferences */}
        <Text className="text-text-main text-lg font-black tracking-tight mb-3">
          App Preferences
        </Text>

        <CartoonCard className="mb-6 p-4">
          {/* Security & Biometrics */}
          <View className="flex-row items-center justify-between py-3 border-b border-bg-app">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text className="text-text-main text-sm font-black">
                  Biometric Unlock
                </Text>
                {!isBiometricsAvailable && (
                  <Text className="text-text-muted text-xs font-bold mt-0.5">
                    Unavailable on device
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
              <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text className="text-text-main text-sm font-black">
                  Smart Nudges & Reminders
                </Text>
                {!isNotificationsAvailable && (
                  <Text className="text-text-muted text-xs font-bold mt-0.5">
                    Unavailable on device
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
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                <MaterialCommunityIcons name="cog-outline" size={20} color={colors.primary} />
              </View>
              <Text className="text-text-main text-sm font-black">
                Auto-Allocation Rules
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </CartoonCard>

        {/* Currency & Privacy */}
        <Text className="text-text-main text-lg font-black tracking-tight mb-3">
          Security & Privacy
        </Text>

        <CartoonCard className="mb-6 p-4">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Currency Settings"
            onPress={handleCurrencySettings}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3 border-b border-bg-app"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                <Ionicons name="cash-outline" size={20} color={colors.primary} />
              </View>
              <Text className="text-text-main text-sm font-black">
                Currency (USD - $)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Data Privacy & Settings"
            onPress={handleDataPrivacy}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <Text className="text-text-main text-sm font-black">
                Data Privacy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </CartoonCard>
      </ScrollView>
    </View>
  );
}

