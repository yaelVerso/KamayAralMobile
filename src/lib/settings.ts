import AsyncStorage from '@react-native-async-storage/async-storage'

// AsyncStorage equivalent of the web app's localStorage-backed personalization
// settings (lib/settings.ts there). Font-size scaling isn't ported — the web
// version works by setting a `data-font-size` attribute the global CSS reads,
// which has no RN equivalent without retrofitting every screen's text sizes;
// deferred to a later pass rather than half-built here.
export const VIDEO_MANUAL_PLAY_STORAGE_KEY = 'videoManualPlay'

export async function readBooleanSetting(key: string, fallback: boolean): Promise<boolean> {
  const saved = await AsyncStorage.getItem(key)
  if (saved === null) return fallback
  return saved === 'true'
}

export async function writeBooleanSetting(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, String(value))
}
