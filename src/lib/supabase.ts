import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'

// expo-secure-store has no web implementation — calling it there throws
// synchronously, which previously crashed the whole Metro/dev-server process
// whenever Expo Router's web-target static rendering touched this module
// (it renders every platform's route tree server-side, not just the ones
// actually in use). This app never targets web, so a harmless in-memory
// fallback avoids that crash without needing real web persistence.
const memoryStore = new Map<string, string>()
const webStorage = {
  getItem: async (key: string) => memoryStore.get(key) ?? null,
  setItem: async (key: string, value: string) => { memoryStore.set(key, value) },
  removeItem: async (key: string) => { memoryStore.delete(key) },
}

// expo-secure-store's key/value API adapted to the async storage shape
// @supabase/supabase-js expects for session persistence.
const ExpoSecureStoreAdapter = Platform.OS === 'web'
  ? webStorage
  : {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    }

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
