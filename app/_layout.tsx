import "../global.css";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Stack } from "expo-router";
import { initDatabase } from "../services/db/database";
import { colors } from "../constants/theme";
import { AppProvider } from "../context/AppContext";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const prepare = useCallback(async () => {
    try {
      setInitError(null);
      await initDatabase();
      setIsReady(true);
    } catch (error) {
      console.error("Database initialization failed:", error);
      setInitError(
        error instanceof Error ? error.message : "Failed to initialize database"
      );
      setIsReady(false);
    }
  }, []);

  useEffect(() => {
    prepare();
  }, [prepare]);

  if (initError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bgApp,
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            color: colors.roseDark,
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Database Initialization Error
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 14,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          {initError}
        </Text>
        <TouchableOpacity
          onPress={prepare}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: colors.white,
              fontWeight: "700",
              fontSize: 15,
            }}
          >
            Retry Initialization
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bgApp,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add-transaction"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </AppProvider>
  );
}

