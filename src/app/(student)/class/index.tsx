import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getAssignedCustomModules } from '@/lib/queries/customContent'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import ProgressBar from '@/components/shared/ProgressBar'

interface ClassCardData {
  id: string
  title: string
  icon: string
  color: string
  sectionCount: number
  percent: number
}

function colorToHex(colorClasses: string): string {
  const match = colorClasses.match(/bg-\[(#[0-9a-fA-F]{3,8})\]/)
  return match?.[1] ?? '#0BC2D7'
}

export default function ClassScreen() {
  const { session } = useAuth()
  const router = useRouter()
  const [cards, setCards] = useState<ClassCardData[] | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const userId = session?.user.id
      if (!userId) return

      const [modules, { data: learnRows }] = await Promise.all([
        getAssignedCustomModules(supabase),
        supabase.from('learn_progress').select('module_id, item_id').eq('student_id', userId),
      ])
      if (cancelled) return

      function moduleProgress(moduleId: string, totalItems: number): number {
        if (totalItems === 0) return 0
        const viewed = learnRows?.filter((r) => r.module_id === moduleId).length ?? 0
        return Math.round((viewed / totalItems) * 100)
      }

      setCards(modules.map((mod) => {
        const totalItems = mod.subModules.reduce((sum, sm) => sum + sm.items.length, 0)
        return {
          id: mod.id,
          title: mod.title,
          icon: mod.icon,
          color: mod.color,
          sectionCount: mod.subModules.length,
          percent: moduleProgress(mod.id, totalItems),
        }
      }))
    }
    load()
    return () => { cancelled = true }
  }, [session?.user.id])

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-4 pt-6 pb-4">
        <Text className="text-2xl font-black text-brand-brown">Class</Text>
        <Text className="text-sm text-gray-500">Extra modules from your teacher.</Text>
      </View>

      <View className="px-4">
        {!cards && <ActivityIndicator className="mt-6" />}
        {cards?.length === 0 && (
          <Text className="text-gray-400 text-center mt-10">
            Your teacher hasn&apos;t assigned any modules to your class yet.
          </Text>
        )}

        <View className="flex-row flex-wrap gap-3">
          {cards?.map((card) => (
            <Pressable
              key={card.id}
              onPress={() => router.push({ pathname: '/modules/[moduleId]', params: { moduleId: card.id, source: 'custom' } })}
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
