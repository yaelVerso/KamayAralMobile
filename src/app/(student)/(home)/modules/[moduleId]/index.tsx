import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import type { Module } from '@/content/types'
import { getModuleTreeBySource, type ContentSource } from '@/lib/moduleTree'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

interface QuizAttempt {
  submodule_id: string
  score: number
  total: number
}

export default function ModuleDetailScreen() {
  const { moduleId, source } = useLocalSearchParams<{ moduleId: string; source: ContentSource }>()
  const { session } = useAuth()
  const router = useRouter()

  const [mod, setMod] = useState<Module | null>(null)
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [quizEnabledIds, setQuizEnabledIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const userId = session?.user.id
      if (!userId) return

      const loadedMod = await getModuleTreeBySource(supabase, source, moduleId, userId)

      const [{ data: attemptRows }, { data: student }] = await Promise.all([
        supabase
          .from('quiz_attempts')
          .select('submodule_id, score, total')
          .eq('student_id', userId)
          .eq('is_active', true)
          .not('submitted_at', 'is', null),
        supabase.from('students').select('section_id').eq('id', userId).single(),
      ])

      const { data: quizSettings } = await supabase
        .from('quiz_settings')
        .select('submodule_id, enabled')
        .eq('section_id', student?.section_id ?? '')

      if (cancelled) return
      setMod(loadedMod)
      setAttempts(attemptRows ?? [])
      setQuizEnabledIds(new Set((quizSettings ?? []).filter((q) => q.enabled).map((q) => q.submodule_id)))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [moduleId, source, session?.user.id])

  function attemptFor(submoduleId: string) {
    return attempts.find((a) => a.submodule_id === submoduleId)
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (!mod) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Module not found.</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: true, title: mod.title }} />
      <View className="px-4 pt-4 pb-2">
        <Text className="text-sm text-gray-500">{mod.description}</Text>
      </View>

      <View className="px-4 gap-4 pb-8">
        {mod.subModules.map((sm, idx) => {
          const attempt = attemptFor(sm.id)
          const quizEnabled = quizEnabledIds.has(sm.id)

          return (
            <View key={sm.id} className="rounded-2xl bg-[#FDEFCA] p-5 gap-4">
              <View className="flex-row items-center gap-2">
                <View className="h-7 w-7 rounded-full bg-[#A5D5DA] items-center justify-center">
                  <Text className="text-xs font-bold text-[#007B89]">{idx + 1}</Text>
                </View>
                <Text className="text-lg font-extrabold text-brand-brown">{sm.title}</Text>
              </View>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => router.push({ pathname: '/modules/[moduleId]/[submoduleId]/learn', params: { moduleId, submoduleId: sm.id, source } })}
                  className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-[#FCCF52] py-3"
                >
                  <Text className="text-brand-brown font-bold">📖 Learn</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push({ pathname: '/modules/[moduleId]/[submoduleId]/activity', params: { moduleId, submoduleId: sm.id, source } })}
                  className="flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-[#FFA93C] py-3"
                >
                  <Text className="text-white font-bold">🎮 Practice</Text>
                </Pressable>
              </View>

              {quizEnabled && !attempt ? (
                <Pressable
                  onPress={() => router.push({ pathname: '/modules/[moduleId]/[submoduleId]/quiz', params: { moduleId, submoduleId: sm.id, source } })}
                  className="rounded-xl bg-[#0BC2D7] py-3 items-center"
                >
                  <Text className="text-white font-bold">📝 Take Quiz</Text>
                </Pressable>
              ) : attempt ? (
                <View className="flex-row items-center justify-between rounded-xl bg-gray-100 px-3 py-2.5">
                  <Text className="text-gray-500">✓ Quiz completed</Text>
                  <Text className="font-bold text-[#007B89]">{attempt.score}/{attempt.total}</Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5 rounded-xl bg-[#CFC2B5] px-3 py-2.5">
                  <Text className="text-white">🔒 Quiz not available yet</Text>
                </View>
              )}
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}
