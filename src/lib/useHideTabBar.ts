import { useEffect } from 'react'
import { useNavigation } from 'expo-router'

// Practice/Quiz are full-screen, single-task flows — hiding the bottom tab
// bar for their duration removes an easy way to accidentally tap away and
// lose an in-progress attempt (which isn't resumable), mirroring the web
// app's StudentChrome (components/student/StudentChrome.tsx) hiding its nav
// on the same two routes.
export function useHideTabBar() {
  const tabs = useNavigation('/(student)')

  useEffect(() => {
    tabs.setOptions({ tabBarStyle: { display: 'none' } })
    return () => tabs.setOptions({ tabBarStyle: undefined })
  }, [tabs])
}
