import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};


const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Standard Supabase client backed by Expo SecureStore for session persistence.
 * Evaluates to `null` if environment variables are not configured, ensuring a safe module-load path.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: Platform.OS !== "web" ? ExpoSecureStoreAdapter : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Creates a Supabase client that injects a Clerk session JWT into the Authorization headers.
 * Useful for Supabase Row Level Security (RLS) policies based on `auth.jwt() -> sub`.
 * Returns `null` if Supabase environment variables are not configured.
 * 
 * @param clerkSession - Current active Clerk session with a configured "supabase" JWT template.
 */
export const createClerkSupabaseClient = (clerkSession: {
  getToken: (options?: { template?: string }) => Promise<string | null>;
}): SupabaseClient | null => {
  if (!isSupabaseConfigured) {
    return null;
  }

  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      storage: Platform.OS !== "web" ? ExpoSecureStoreAdapter : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (url, options = {}) => {
        const clerkToken = await clerkSession.getToken({
          template: "supabase",
        });

        const headers = new Headers(options?.headers);
        if (clerkToken) {
          headers.set("Authorization", `Bearer ${clerkToken}`);
        }

        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  });
};

