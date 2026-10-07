import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import type { Module } from '@/content/types'
import { getAllAdminModulesWithContent, getTeacherIdForStudent } from '@/lib/queries/adminContent'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import ProgressBar from '@/components/shared/ProgressBar'

interface ModuleCardData {
  id: string
  title: string
  icon: string
  color: string
  sectionCount: number
  percent: number
  source: 'admin'
}

function toCardData(mod: Module, percent: number, source: ModuleCardData['source']): ModuleCardData {
  return { id: mod.id, title: mod.title, icon: mod.icon, color: mod.color, sectionCount: mod.subModules.length, percent, source }
}

export default function DashboardScreen() {
  const { session } = useAuth()
  const router = useRouter()
  const [cards, setCards] = useState<ModuleCardData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const userId = session?.user.id
        if (!userId) return

        const [{ data: studentRow }, { data: learnRows }, teacherId] = await Promise.all([
          supabase.from('students').select('first_name, full_name').eq('id', userId).single(),
          supabase.from('learn_progress').select('module_id, item_id').eq('student_id', userId),
          getTeacherIdForStudent(supabase, userId),
        ])
        if (cancelled) return
        setStudentName(studentRow?.first_name ?? studentRow?.full_name ?? null)

        function moduleProgress(moduleId: string, totalItems: number): number {
          if (totalItems === 0) return 0
          const viewed = learnRows?.filter((r) => r.module_id === moduleId).length ?? 0
          return Math.round((viewed / totalItems) * 100)
        }

        const adminModules = await getAllAdminModulesWithContent(supabase, teacherId)
        if (cancelled) return
        setCards(
          adminModules
            .filter((m) => m.subModules.length > 0)
            .map((m) => {
              const totalItems = m.subModules.reduce((sum, sm) => sum + sm.items.length, 0)
              return toCardData(m, moduleProgress(m.id, totalItems), 'admin')
            }),
        )
      } catch {
        if (!cancelled) setError('Could not load modules. Pull down to try again.')
      }
    }
    load()
    return () => { cancelled = true }
  }, [session?.user.id])

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-4 pt-6 pb-4">
        <Text className="text-sm text-gray-500">Welcome back,</Text>
        <Text className="text-2xl font-black text-brand-brown">{studentName ?? 'Student'} 👋</Text>
      </View>

      <View className="px-4">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Modules</Text>

        {error && <Text className="text-red-600 text-sm mb-3">{error}</Text>}
        {!cards && !error && <ActivityIndicator className="mt-6" />}

        <View className="flex-row flex-wrap gap-3">
          {cards?.map((card) => (
            <Pressable
              key={`${card.source}-${card.id}`}
              onPress={() => router.push({ pathname: '/modules/[moduleId]', params: { moduleId: card.id, source: card.source } })}
              className="w-[47%] rounded-2xl p-4"
              style={{ backgroundColor: colorToHex(card.color) }}
            >
              <Text className="text-3xl">{card.icon}</Text>
              <Text className="text-white font-extrabold text-base mt-2">{card.title}</Text>
              <View className="mt-auto pt-3 gap-1.5">
                <ProgressBar percent={card.percent} trackClassName="bg-white/30" fillClassName="bg-white" showLabel={false} />
                <Text className="text-white/80 text-xs">{card.sectionCount} sections</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

// The web app's `color` field is a string of Tailwind classes (e.g.
// "bg-[#FFAB41] shadow-[0_4px_0_#F18701] hover:bg-[#FF9F26]") meant for
// NativeWind's className. Since this card uses an inline style for the
// background (simpler than parsing arbitrary-value classes reliably), pull
// just the bg-[...] hex out of that string instead.
function colorToHex(colorClasses: string): string {
  const match = colorClasses.match(/bg-\[(#[0-9a-fA-F]{3,8})\]/)
  return match?.[1] ?? '#0BC2D7'
}
