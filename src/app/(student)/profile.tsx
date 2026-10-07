import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, Switch } from 'react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { readBooleanSetting, writeBooleanSetting, VIDEO_MANUAL_PLAY_STORAGE_KEY } from '@/lib/settings'
import ChangePasswordForm from '@/components/shared/ChangePasswordForm'

interface StudentInfo {
  full_name: string | null
  id_number: string | null
  section_id: string | null
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth()
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [sectionName, setSectionName] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string | null>(null)
  const [manualPlay, setManualPlay] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const userId = session?.user.id
      if (!userId) return

      const [{ data: studentRow }, manual] = await Promise.all([
        supabase.from('students').select('full_name, id_number, section_id').eq('id', userId).single(),
        readBooleanSetting(VIDEO_MANUAL_PLAY_STORAGE_KEY, false),
      ])
      if (cancelled) return
      setStudent(studentRow)
      setManualPlay(manual)

      if (studentRow?.section_id) {
        const { data: section } = await supabase.from('sections').select('name, teacher_id').eq('id', studentRow.section_id).single()
        if (cancelled) return
        setSectionName(section?.name ?? null)
        if (section?.teacher_id) {
          const { data: teacher } = await supabase.from('teachers').select('full_name').eq('id', section.teacher_id).single()
          if (!cancelled) setTeacherName(teacher?.full_name ?? null)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [session?.user.id])

  async function toggleManualPlay(value: boolean) {
    setManualPlay(value)
    await writeBooleanSetting(VIDEO_MANUAL_PLAY_STORAGE_KEY, value)
  }

  if (!student) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-4 pt-8 pb-4 gap-6">
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 rounded-full bg-indigo-100 items-center justify-center">
            <Text className="text-2xl font-bold text-indigo-600">{student.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-black text-brand-brown">{student.full_name}</Text>
            <Text className="text-sm text-gray-500">{session?.user.email}</Text>
            {student.id_number && <Text className="text-sm text-gray-500">ID: {student.id_number}</Text>}
          </View>
        </View>

        <View>
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Class</Text>
          <View className="rounded-xl border border-gray-200 p-4 gap-1">
            {sectionName ? (
              <>
                <Text className="text-sm"><Text className="text-gray-500">Section: </Text><Text className="font-medium">{sectionName}</Text></Text>
                <Text className="text-sm"><Text className="text-gray-500">Teacher: </Text><Text className="font-medium">{teacherName ?? 'Unassigned'}</Text></Text>
              </>
            ) : (
              <Text className="text-sm text-gray-500">Not yet assigned to a section.</Text>
            )}
          </View>
        </View>

        <View>
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Settings</Text>
          <View className="rounded-xl border border-gray-200 p-4 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-medium">Manual video play</Text>
              <Text className="text-xs text-gray-500 mt-0.5">When on, videos wait for you to press play instead of starting automatically.</Text>
            </View>
            <Switch value={manualPlay} onValueChange={toggleManualPlay} />
          </View>
        </View>

        <View>
          <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Security</Text>
          <View className="rounded-xl border border-gray-200 p-4">
            <ChangePasswordForm />
          </View>
        </View>

        <Pressable onPress={signOut} className="rounded-xl bg-[#E14E4E] py-3.5 items-center mt-2">
          <Text className="text-white font-bold">Log Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
