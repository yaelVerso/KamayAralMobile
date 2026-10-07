import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth-context'

export default function StudentLayout() {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Redirect href="/login" />

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0BC2D7' }}>
      {/* (home) is its own nested Stack (dashboard + module detail/learn/
          activity/quiz) — re-tapping this tab while already on it pops that
          stack back to the dashboard, instead of leaving old screens behind. */}
      <Tabs.Screen
        name="(home)"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="class/index"
        options={{ title: 'Class', tabBarIcon: ({ color, size }) => <Ionicons name="school" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
    </Tabs>
  )
}
