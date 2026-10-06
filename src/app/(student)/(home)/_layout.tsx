import { Stack } from 'expo-router'

// The Home tab's own nested stack — dashboard is the root, module detail
// and learn/activity/quiz push on top of it. This is what makes re-tapping
// the Home tab (while already on it) pop back to the dashboard instead of
// leaving a stale module/sign screen underneath, per Expo Router's default
// tab-bar re-press behavior for a nested stack.
export default function HomeLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
