import CartoonCard from "@/components/CartoonCard";
import { TipJarModal } from "@/components/TipJarModal";
import { CurrencyPickerModal } from "@/components/CurrencyPickerModal";
import { RecurringScheduleModal } from "@/components/RecurringScheduleModal";
import { CategoryManagerModal } from "@/components/CategoryManagerModal";
import { colors } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { RecurringScheduleRow } from "@/services/db/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    entitlements,
    recurringSchedules,
    categories,
    currencyCode,
    currencySymbol,
    setPreferredCurrency,
    formatMoney,
    toggleRecurring,
    deleteRecurring,
    refreshData,
  } = useApp();

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const [isNotificationsAvailable, setIsNotificationsAvailable] = useState(false);
  const [isTipJarVisible, setIsTipJarVisible] = useState(false);
  const [isCurrencyPickerVisible, setIsCurrencyPickerVisible] = useState(false);
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
  const [isCategoryManagerVisible, setIsCategoryManagerVisible] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<RecurringScheduleRow | null>(null);
  const isSettingCurrencyRef = useRef(false);
  const isMutatingRecurringRef = useRef(false);

  const getFrequencyLabel = (schedule: RecurringScheduleRow) => {
    if (schedule.frequency === "custom") {
      return schedule.custom_interval_days && schedule.custom_interval_days > 0
        ? `Every ${schedule.custom_interval_days} days`
        : "Custom Interval";
    }
    if (schedule.frequency === "biweekly") return "Every 2 weeks";
    if (schedule.frequency === "weekly") return "Weekly";
    if (schedule.frequency === "monthly") {
      return schedule.day_of_month ? `Monthly (Day ${schedule.day_of_month})` : "Monthly";
    }
    if (schedule.frequency === "daily") return "Daily";
    return schedule.frequency;
  };

  const handleSelectCurrency = async (code: string) => {
    if (isSettingCurrencyRef.current) return;
    isSettingCurrencyRef.current = true;
    try {
      await setPreferredCurrency(code);
    } catch (err) {
      console.error("Failed to update preferred currency:", err);
      Alert.alert("Error", "Could not update currency preference.");
    } finally {
      isSettingCurrencyRef.current = false;
      setIsCurrencyPickerVisible(false);
    }
  };

  const handleToggleRecurring = async (id: string, currentActive: boolean) => {
    if (isMutatingRecurringRef.current) return;
    isMutatingRecurringRef.current = true;
    try {
      await toggleRecurring(id, !currentActive);
    } catch (err) {
      console.error("Failed to toggle recurring schedule:", err);
      Alert.alert("Error", "Could not update recurring schedule.");
    } finally {
      isMutatingRecurringRef.current = false;
    }
  };

  const handleDeleteRecurring = (id: string, title: string) => {
    if (isMutatingRecurringRef.current) return;
    Alert.alert(
      "Delete Recurring Schedule",
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (isMutatingRecurringRef.current) return;
            isMutatingRecurringRef.current = true;
            try {
              await deleteRecurring(id);
            } catch (err) {
              console.error("Failed to delete recurring schedule:", err);
              Alert.alert("Error", "Could not delete recurring schedule.");
            } finally {
              isMutatingRecurringRef.current = false;
            }
          },
        },
      ]
    );
  };

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

  const handleBackupToGoogleDrive = () => {
    Alert.alert(
      "Google Drive AppData Backup",
      "Google Drive cloud sync is currently unavailable in this build. Cloud synchronization with hidden appDataFolder will be enabled in an upcoming release.",
      [{ text: "OK" }]
    );
  };

  const handleExportBackupFile = () => {
    Alert.alert(
      "Export .piggysave Backup",
      "Encrypted .piggysave file export is currently unavailable in this build. Standalone backup bundles will be enabled in an upcoming release.",
      [{ text: "OK" }]
    );
  };

  const isSupporter = entitlements.is_supporter === 1;

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
            Account & Hub
          </Text>
          <Text className="text-text-main text-2xl font-black mt-0.5">
            Profile & Settings 👤
          </Text>
        </View>

        {/* User Profile CartoonCard */}
        <CartoonCard className="mb-6 p-5 flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-primary items-center justify-center mr-4">
            <MaterialCommunityIcons name="piggy-bank" size={28} color={colors.white} />
          </View>
          <View className="flex-1">
            <Text className="text-text-main text-lg font-black">
              {isSupporter ? "Supporter Member" : "PiggySaver"}
            </Text>
            <Text className="text-text-muted text-xs font-bold mt-0.5">
              100% Local & Privacy-First
            </Text>
            <View className="bg-coral-subtle self-start px-3 py-1 rounded-full mt-2 border border-border-card">
              <Text className="text-primary text-[10px] font-black uppercase tracking-wider">
                {isSupporter ? "👑 Unlimited Goals" : `🎯 ${entitlements.unlocked_goal_slots} Active Goal Slots`}
              </Text>
            </View>
          </View>
        </CartoonCard>

        {/* ─── SUPPORTER TIP JAR & MONETIZATION ─── */}
        <Text className="text-text-main text-lg font-black tracking-tight mb-3">
          Supporter Perks & Tips 🎁
        </Text>

        <CartoonCard
          variant={isSupporter ? "gold" : "subtle"}
          className="mb-6 p-4"
          interactive
          onPress={() => setIsTipJarVisible(true)}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <View
                className={`will-change-variable w-11 h-11 rounded-2xl ${isSupporter ? "bg-gold" : "bg-primary"
                  } items-center justify-center mr-3`}
              >
                <MaterialCommunityIcons
                  name={isSupporter ? "crown" : "heart"}
                  size={22}
                  color={colors.white}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-main text-sm font-black">
                  {isSupporter ? "Supporter Status Active ⭐" : "Supporter Tip Jar"}
                </Text>
                <Text className="text-text-muted text-xs font-bold mt-0.5">
                  {isSupporter
                    ? "Thank you for supporting PiggySavings!"
                    : "Tip $1.99+ for unlimited goals & custom badges"}
                </Text>
              </View>
            </View>
            <View className="bg-primary px-3 py-1.5 rounded-full border border-primary-light">
              <Text className="text-white text-xs font-black">
                {isSupporter ? "View Perks" : "Tip Dev"}
              </Text>
            </View>
          </View>
        </CartoonCard>

        {/* ─── RECURRING SCHEDULES MANAGER ─── */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-text-main text-lg font-black tracking-tight">
            Recurring Schedules Manager 🔄
          </Text>
          <TouchableOpacity
            onPress={() => {
              setScheduleToEdit(null);
              setIsScheduleModalVisible(true);
            }}
            className="flex-row items-center bg-coral-subtle px-3 py-1.5 rounded-full border border-border-card"
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text className="text-primary text-xs font-black ml-1">
              Add Schedule
            </Text>
          </TouchableOpacity>
        </View>

        <CartoonCard className="mb-6 p-4">
          {recurringSchedules.length === 0 ? (
            <View className="py-3 items-center">
              <Text className="text-text-muted text-xs font-bold text-center mb-2">
                No recurring schedules yet. Tap &quot;Add Schedule&quot; or toggle &quot;Schedule as Recurring&quot; when logging transactions!
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setScheduleToEdit(null);
                  setIsScheduleModalVisible(true);
                }}
                className="bg-primary px-4 py-2 rounded-xl border border-primary-light"
              >
                <Text className="text-white text-xs font-black">
                  + Create First Schedule
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            recurringSchedules.map((schedule, index) => {
              const isIncome = schedule.type === "income";
              const isLast = index === recurringSchedules.length - 1;

              return (
                <View
                  key={schedule.id}
                  className={`flex-row items-center justify-between py-3 ${!isLast ? "border-b border-bg-app" : ""
                    }`}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      className={`will-change-variable w-10 h-10 rounded-2xl items-center justify-center mr-3 ${isIncome ? "bg-emerald-subtle" : "bg-rose-subtle"
                        }`}
                    >
                      <Ionicons
                        name={isIncome ? "arrow-down" : "arrow-up"}
                        size={18}
                        color={isIncome ? colors.emerald : colors.rose}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-text-main text-sm font-black">
                        {schedule.title}
                      </Text>
                      <Text className="text-text-muted text-xs font-bold mt-0.5">
                        {formatMoney(schedule.amount_cents)} • {getFrequencyLabel(schedule)} • Next: {(() => {
                          if (!schedule.next_occurrence) return "N/A";
                          const parts = schedule.next_occurrence.split("-");
                          if (parts.length === 3) {
                            const year = parseInt(parts[0], 10);
                            const month = parseInt(parts[1], 10) - 1;
                            const day = parseInt(parts[2], 10);
                            const d = new Date(year, month, day);
                            if (!isNaN(d.getTime())) {
                              return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                            }
                          }
                          return schedule.next_occurrence;
                        })()}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Switch
                      value={schedule.is_active === 1}
                      onValueChange={() => handleToggleRecurring(schedule.id, schedule.is_active === 1)}
                      trackColor={{ false: colors.mutedTrack, true: colors.primary }}
                      thumbColor={colors.white}
                    />
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setScheduleToEdit(schedule);
                        setIsScheduleModalVisible(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit schedule ${schedule.title}`}
                      className="p-1.5 rounded-lg bg-bg-app border border-border-card"
                    >
                      <Ionicons name="pencil" size={14} color={colors.textMain} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleDeleteRecurring(schedule.id, schedule.title)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete schedule ${schedule.title}`}
                      className="p-1.5 rounded-lg bg-bg-app border border-border-card"
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.rose} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </CartoonCard>

        {/* ─── PERSONAL CLOUD BACKUP & RESTORE ─── */}
        <Text className="text-text-main text-lg font-black tracking-tight mb-3">
          Personal Cloud Backup & Export ☁️
        </Text>

        <CartoonCard className="mb-6 p-4">
          <TouchableOpacity
            onPress={handleBackupToGoogleDrive}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3 border-b border-bg-app"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                <MaterialCommunityIcons name="google-drive" size={22} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-text-main text-sm font-black">
                  Google Drive AppData Sync
                </Text>
                <Text className="text-text-muted text-xs font-bold mt-0.5">
                  Backup to hidden personal app storage
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleExportBackupFile}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-text-main text-sm font-black">
                  Export .piggysave Snapshot
                </Text>
                <Text className="text-text-muted text-xs font-bold mt-0.5">
                  Save or share encrypted backup bundle
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </CartoonCard>

        {/* ─── SETTINGS GROUP - SECURITY & PREFERENCES ─── */}
        <Text className="text-text-main text-lg font-black tracking-tight mb-3">
          Security & Preferences
        </Text>

        <CartoonCard className="mb-6 p-4">
          {/* Manage Categories Row */}
          <TouchableOpacity
            onPress={() => setIsCategoryManagerVisible(true)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3 border-b border-bg-app"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                <Ionicons name="pricetags-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text className="text-text-main text-sm font-black">
                  Manage Categories
                </Text>
                <Text className="text-text-muted text-xs font-bold mt-0.5">
                  {categories.length} total categories
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="bg-coral-subtle px-2.5 py-1 rounded-full border border-border-card mr-1">
                <Text className="text-primary text-xs font-black">
                  Configure
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Preferred Currency Selector */}
          <TouchableOpacity
            onPress={() => setIsCurrencyPickerVisible(true)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3 border-b border-bg-app"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-10 h-10 rounded-2xl bg-coral-subtle items-center justify-center mr-3">
                <MaterialCommunityIcons name="currency-usd" size={22} color={colors.primary} />
              </View>
              <View>
                <Text className="text-text-main text-sm font-black">
                  Display Currency
                </Text>
                <Text className="text-text-muted text-xs font-bold mt-0.5">
                  {currencyCode} ({currencySymbol})
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="bg-coral-subtle px-2.5 py-1 rounded-full border border-border-card mr-1">
                <Text className="text-primary text-xs font-black">
                  {currencyCode}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

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
          <View className="flex-row items-center justify-between py-3">
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
        </CartoonCard>
      </ScrollView>

      {/* ─── TIP JAR MODAL ─── */}
      <TipJarModal
        visible={isTipJarVisible}
        onClose={() => setIsTipJarVisible(false)}
      />

      {/* ─── CURRENCY PICKER MODAL ─── */}
      <CurrencyPickerModal
        visible={isCurrencyPickerVisible}
        onClose={() => setIsCurrencyPickerVisible(false)}
        selectedCurrencyCode={currencyCode}
        onSelectCurrency={handleSelectCurrency}
      />

      {/* ─── RECURRING SCHEDULE MODAL ─── */}
      <RecurringScheduleModal
        visible={isScheduleModalVisible}
        onClose={() => {
          setIsScheduleModalVisible(false);
          setScheduleToEdit(null);
        }}
        scheduleToEdit={scheduleToEdit}
      />

      {/* ─── CATEGORY MANAGER MODAL ─── */}
      <CategoryManagerModal
        visible={isCategoryManagerVisible}
        onClose={() => setIsCategoryManagerVisible(false)}
      />
    </View>
  );
}


