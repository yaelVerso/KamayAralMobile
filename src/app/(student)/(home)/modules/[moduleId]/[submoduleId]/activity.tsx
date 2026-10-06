import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import type { ActivityType, SignItem, SubModule } from '@/content/types'
import { getModuleTreeBySource, type ContentSource } from '@/lib/moduleTree'
import { shuffle } from '@/lib/shuffle'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import LessonCard from '@/components/activities/LessonCard'
import SignToPicture from '@/components/activities/SignToPicture'
import Spelling from '@/components/activities/Spelling'

interface ActivityStep {
  type: ActivityType
  item: SignItem
  distractors?: SignItem[]
}

interface Answer {
  activity_type: string
  item_id: string
  answer_given: string | null
  is_correct: boolean
}

// interleaved per item: Lesson Card A -> Sign to Picture A -> Spelling A -> Lesson Card B -> ...
// drag-drop-match is quiz-only, skipped here (mirrors web's buildActivitySteps).
function buildActivitySteps(submodule: SubModule, items: SignItem[]): ActivityStep[] {
  const perItemTypes = submodule.activitySequence.filter((t) => t !== 'drag-drop-match')
  const steps: ActivityStep[] = []
  for (const item of items) {
    for (const type of perItemTypes) {
      if (type === 'lesson-card') {
        steps.push({ type, item })
      } else if (type === 'sign-to-picture') {
        steps.push({ type, item, distractors: shuffle(items.filter((it) => it.id !== item.id)) })
      } else if (type === 'spelling') {
        steps.push({ type, item })
      }
    }
  }
  return steps
}

export default function ActivityScreen() {
  const { moduleId, submoduleId, source } = useLocalSearchParams<{ moduleId: string; submoduleId: string; source: ContentSource }>()
  const { session } = useAuth()
  const router = useRouter()

  const [submodule, setSubmodule] = useState<SubModule | null>(null)
  const [loading, setLoading] = useState(true)
  const [steps, setSteps] = useState<ActivityStep[]>([])
  const [stepAnswers, setStepAnswers] = useState<(Answer[] | null)[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const userId = session?.user.id
      if (!userId) return
      const mod = await getModuleTreeBySource(supabase, source, moduleId, userId)
      const sm = mod?.subModules.find((s) => s.id === submoduleId) ?? null
      if (cancelled || !sm) return
      const built = buildActivitySteps(sm, shuffle(sm.items))
      setSubmodule(sm)
      setSteps(built)
      setStepAnswers(built.map(() => null))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [moduleId, submoduleId, source, session?.user.id])

  const current = steps[stepIndex]
  const progress = steps.length > 0 ? (stepIndex / steps.length) * 100 : 0
  const answers = useMemo(() => stepAnswers.flatMap((a) => a ?? []), [stepAnswers])
  const score = useMemo(() => answers.filter((a) => a.is_correct).length, [answers])
  const totalPoints = useMemo(() => steps.filter((s) => s.type !== 'lesson-card').length, [steps])
  const currentAnswer = stepAnswers[stepIndex] ?? null
  const currentAnswered = current?.type === 'lesson-card' || currentAnswer !== null

  function recordAnswer(results: Answer[]) {
    setStepAnswers((prev) => {
      const next = [...prev]
      next[stepIndex] = results
      return next
    })
  }

  function goPrevious() {
    if (stepIndex > 0) setStepIndex((i) => i - 1)
  }

  async function submitPractice() {
    const userId = session?.user.id
    if (!userId || !submodule) return
    await supabase.from('practice_answers').insert(
      answers.map((a) => ({ ...a, student_id: userId, submodule_id: submodule.id })),
    )
  }

  async function goNext() {
    if (!currentAnswered) return
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1)
      return
    }
    if (answers.length > 0) {
      setSubmitting(true)
      await submitPractice()
      setSubmitting(false)
    }
    setFinished(true)
  }

  function exit() {
    router.back()
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (!submodule) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Content not found.</Text>
      </View>
    )
  }

  if (finished) {
    const percent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 100
    return (
      <View className="flex-1 bg-white items-center justify-center px-6 gap-4">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-6xl">{percent >= 80 ? '🎉' : percent >= 50 ? '🙂' : '💪'}</Text>
        <Text className="text-2xl font-bold text-brand-brown">Activity complete!</Text>
        {totalPoints > 0 && (
          <Text className="text-gray-500 text-center">
            You got <Text className="font-bold">{score}/{totalPoints}</Text> ({percent}%) correct
          </Text>
        )}
        <Pressable onPress={exit} className="w-full rounded-xl bg-[#0BC2D7] py-4 items-center mt-4">
          <Text className="text-white font-bold text-base">Back to {submodule.shortTitle}</Text>
        </Pressable>
      </View>
    )
  }

  if (!current) return null

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center gap-3 px-4 pt-14 pb-3">
        <Pressable onPress={() => setShowExitConfirm(true)} className="p-1">
          <Text className="text-gray-400 text-lg">✕</Text>
        </Pressable>
        <View className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <View className="h-full rounded-full bg-[#007B89]" style={{ width: `${progress}%` }} />
        </View>
        <Text className="text-xs text-gray-400 font-medium">{stepIndex + 1}/{steps.length}</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {current.type === 'lesson-card' && <LessonCard key={stepIndex} item={current.item} />}
        {current.type === 'sign-to-picture' && (
          <SignToPicture
            key={stepIndex}
            item={current.item}
            distractors={current.distractors ?? []}
            mode="activity"
            initialAnswer={currentAnswer?.[0]?.answer_given ?? null}
            onAnswer={(correct, answerGiven) => recordAnswer([
              { activity_type: 'sign-to-picture', item_id: current.item.id, answer_given: answerGiven, is_correct: correct },
            ])}
          />
        )}
        {current.type === 'spelling' && (
          <Spelling
            key={stepIndex}
            item={current.item}
            mode="activity"
            initialAnswer={currentAnswer?.[0]?.answer_given ?? null}
            onAnswer={(correct, answerGiven) => recordAnswer([
              { activity_type: 'spelling', item_id: current.item.id, answer_given: answerGiven, is_correct: correct },
            ])}
          />
        )}
      </ScrollView>

      <View className="flex-row gap-3 px-4 pt-4 pb-6">
        <Pressable
          onPress={goPrevious}
          disabled={stepIndex === 0}
          className={`flex-1 rounded-xl border border-gray-200 py-3 items-center ${stepIndex === 0 ? 'opacity-40' : ''}`}
        >
          <Text className="font-semibold">← Previous</Text>
        </Pressable>
        <Pressable
          onPress={goNext}
          disabled={!currentAnswered || submitting}
          className={`flex-1 rounded-xl bg-[#0BC2D7] py-3 items-center ${!currentAnswered || submitting ? 'opacity-40' : ''}`}
        >
          <Text className="text-white font-semibold">
            {submitting ? 'Submitting…' : stepIndex === steps.length - 1 ? 'Finish' : 'Next →'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={showExitConfirm} transparent animationType="fade" onRequestClose={() => setShowExitConfirm(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="w-full bg-white rounded-2xl p-6 gap-4">
            <View>
              <Text className="text-lg font-bold text-brand-brown">Careful!</Text>
              <Text className="text-sm text-gray-500 mt-1">If you leave, you will lose your answers.</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable onPress={exit} className="flex-1 rounded-xl bg-red-600 py-3 items-center">
                <Text className="text-white font-bold">Leave</Text>
              </Pressable>
              <Pressable onPress={() => setShowExitConfirm(false)} className="flex-1 rounded-xl bg-emerald-600 py-3 items-center">
                <Text className="text-white font-bold">Stay</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
