import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { getAssignedCustomModules } from '@/lib/queries/customContent'
import { getAllAdminModulesWithContent, getTeacherIdForStudent } from '@/lib/queries/adminContent'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import ProgressBar from '@/components/shared/ProgressBar'

interface AttemptRow {
  submodule_id: string
  score: number
  total: number
}

interface SectionData {
  id: string
  title: string
  icon: string
  percent: number
  subModules: { id: string; title: string }[]
}

export default function ProgressScreen() {
  const { session } = useAuth()
  const [sections, setSections] = useState<SectionData[] | null>(null)
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    async function load() {
      const userId = session?.user.id
      if (!userId) return

      const teacherId = await getTeacherIdForStudent(supabase, userId)
      const [{ data: learnRows }, { data: attemptRows }, customModules, adminModules] = await Promise.all([
        supabase.from('learn_progress').select('module_id, item_id').eq('student_id', userId),
        supabase
          .from('quiz_attempts')
          .select('submodule_id, score, total, submitted_at')
          .eq('student_id', userId)
          .eq('is_active', true)
          .not('submitted_at', 'is', null),
        getAssignedCustomModules(supabase),
        getAllAdminModulesWithContent(supabase, teacherId),
      ])
      if (cancelled) return

      function moduleProgress(moduleId: string, totalItems: number): number {
        if (totalItems === 0) return 0
        const viewed = learnRows?.filter((r) => r.module_id === moduleId).length ?? 0
        return Math.round((viewed / totalItems) * 100)
      }

      function buildSection(mod: { id: string; title: string; icon: string; subModules: { id: string; title: string; items: unknown[] }[] }): SectionData {
        const totalItems = mod.subModules.reduce((sum, sm) => sum + sm.items.length, 0)
        return {
          id: mod.id,
          title: mod.title,
          icon: mod.icon,
          percent: moduleProgress(mod.id, totalItems),
          subModules: mod.subModules.map((sm) => ({ id: sm.id, title: sm.title })),
        }
      }

      setAttempts(attemptRows ?? [])
      setSections([
        ...customModules.filter((m) => m.subModules.length > 0).map(buildSection),
        ...adminModules.filter((m) => m.subModules.length > 0).map(buildSection),
      ])
    }
    load()
    return () => { cancelled = true }
  }, [session?.user.id])

  function attemptFor(submoduleId: string) {
    return attempts.find((a) => a.submodule_id === submoduleId)
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-4 pt-6 pb-4">
        <Text className="text-2xl font-black text-brand-brown">Progress</Text>
        <Text className="text-sm text-gray-500">Your progress across all modules.</Text>
      </View>

      <View className="px-4 gap-2 pb-8">
        {!sections && <ActivityIndicator className="mt-6" />}
        {sections?.map((section) => {
          const isOpen = expanded.has(section.id)
          return (
            <View key={section.id} className="rounded-2xl border border-gray-200 overflow-hidden">
              <Pressable onPress={() => toggle(section.id)} className="gap-2.5 p-4">
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">{section.icon}</Text>
                  <Text className="flex-1 font-bold text-brand-brown">{section.title}</Text>
                </View>
                <ProgressBar percent={section.percent} />
              </Pressable>
              {isOpen && (
                <View className="px-4 pb-4 gap-2">
                  {section.subModules.map((sm) => {
                    const attempt = attemptFor(sm.id)
                    return (
                      <View key={sm.id} className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <Text className="text-sm font-medium">{sm.title}</Text>
                        {attempt ? (
                          <Text className="text-sm font-bold text-brand-secondary">{attempt.score}/{attempt.total}</Text>
                        ) : (
                          <Text className="text-xs text-gray-400">No quiz taken yet</Text>
                        )}
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}
