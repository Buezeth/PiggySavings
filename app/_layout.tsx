import "../global.css";
import { Stack } from "expo-router";
import { ClerkProvider, ClerkLoaded } from "@clerk/expo";
import { tokenCache } from "../lib/clerkTokenCache";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

export default function RootLayout() {
  const content = (
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
  );

  // If a Clerk publishable key is supplied, wrap with ClerkProvider
  if (publishableKey) {
    return (
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>{content}</ClerkLoaded>
      </ClerkProvider>
    );
  }

  return content;
}
