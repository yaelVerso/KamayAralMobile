import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getAssignedCustomModules } from '@/lib/queries/customContent'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

interface ClassCardData {
  id: string
  title: string
  icon: string
  color: string
  sectionCount: number
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
      const modules = await getAssignedCustomModules(supabase)
      if (cancelled) return
      setCards(modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        icon: mod.icon,
        color: mod.color,
        sectionCount: mod.subModules.length,
      })))
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
              className="w-[47%] rounded-2xl p-4 gap-2"
              style={{ backgroundColor: colorToHex(card.color) }}
            >
              <Text className="text-3xl">{card.icon}</Text>
              <Text className="text-white font-extrabold text-base">{card.title}</Text>
              <Text className="text-white/80 text-xs">{card.sectionCount} sections</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}
