import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import type { SubModule } from '@/content/types'
import { getModuleTreeBySource, type ContentSource } from '@/lib/moduleTree'
import { buildQuizSteps, getQuizQuestionCount, stepPoints, type QuizStep } from '@/lib/quizSteps'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { recordAuditLog } from '@/lib/bridge'
import SignToPicture from '@/components/activities/SignToPicture'
import Spelling from '@/components/activities/Spelling'
import DragDropMatch from '@/components/activities/DragDropMatch'

interface QuizAnswer {
  activity_type: string
  item_id: string
  answer_given: string | null
  is_correct: boolean
  occurrence?: number
}

type GateState = 'loading' | 'not-enabled' | 'already-submitted' | 'ready'

export default function QuizScreen() {
  const { moduleId, submoduleId, source } = useLocalSearchParams<{ moduleId: string; submoduleId: string; source: ContentSource }>()
  const { session } = useAuth()
  const router = useRouter()

  const [submodule, setSubmodule] = useState<SubModule | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [gate, setGate] = useState<GateState>('loading')
  const [started, setStarted] = useState(false)

  const [steps, setSteps] = useState<QuizStep[]>([])
  const [stepAnswers, setStepAnswers] = useState<(QuizAnswer[] | null)[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showReview, setShowReview] = useState(false)

  // Gate: mirrors the web quiz page.tsx — check quiz_settings enabled for the
  // student's section, reuse or create the quiz_attempts row, redirect back
  // if already submitted.
  useEffect(() => {
    let cancelled = false
    async function load() {
      const userId = session?.user.id
      if (!userId) return
      const mod = await getModuleTreeBySource(supabase, source, moduleId, userId)
      const sm = mod?.subModules.find((s) => s.id === submoduleId) ?? null
      if (cancelled || !sm) return
      setSubmodule(sm)

      const { data: student } = await supabase.from('students').select('section_id').eq('id', userId).single()
      if (!student?.section_id) { setGate('not-enabled'); return }

      const { data: setting } = await supabase
        .from('quiz_settings')
        .select('enabled')
        .eq('section_id', student.section_id)
        .eq('submodule_id', sm.id)
        .maybeSingle()
      if (!setting?.enabled) { setGate('not-enabled'); return }

      const { data: existing } = await supabase
        .from('quiz_attempts')
        .select('id, submitted_at')
        .eq('student_id', userId)
        .eq('submodule_id', sm.id)
        .eq('is_active', true)
        .maybeSingle()

      if (existing?.submitted_at) { setGate('already-submitted'); return }

      let id = existing?.id ?? null
      if (!id) {
        const { data: newAttempt } = await supabase
          .from('quiz_attempts')
          .insert({ student_id: userId, submodule_id: sm.id })
          .select('id')
          .single()
        id = newAttempt?.id ?? null
      }
      if (cancelled) return
      if (!id) { setGate('not-enabled'); return }
      setAttemptId(id)
      setGate('ready')
    }
    load()
    return () => { cancelled = true }
  }, [moduleId, submoduleId, source, session?.user.id])

  function beginQuiz() {
    if (!submodule) return
    const built = buildQuizSteps(submodule)
    setSteps(built)
    setStepAnswers(built.map(() => null))
    setStarted(true)
  }

  const current = steps[stepIndex]
  const progress = steps.length > 0 ? (stepIndex / steps.length) * 100 : 0
  const answers = useMemo(() => stepAnswers.flatMap((a) => a ?? []), [stepAnswers])
  const score = useMemo(() => answers.filter((a) => a.is_correct).length, [answers])
  const totalPoints = useMemo(() => steps.reduce((sum, s) => sum + stepPoints(s), 0), [steps])
  const currentAnswer = stepAnswers[stepIndex] ?? null
  const currentAnswered = currentAnswer !== null
  const itemById = useMemo(() => new Map((submodule?.items ?? []).map((it) => [it.id, it])), [submodule])

  function recordAnswer(results: QuizAnswer[]) {
    setStepAnswers((prev) => {
      const next = [...prev]
      next[stepIndex] = results
      return next
    })
  }

  function goPrevious() {
    if (stepIndex > 0) setStepIndex((i) => i - 1)
  }

  async function submitQuiz() {
    if (!attemptId) return
    await supabase.from('quiz_answers').insert(
      answers.map((a) => ({ ...a, attempt_id: attemptId, occurrence: a.occurrence ?? 0 })),
    )
    await supabase.from('quiz_attempts').update({
      submitted_at: new Date().toISOString(),
      score,
      total: totalPoints,
    }).eq('id', attemptId)

    const token = session?.access_token
    if (token && submodule) {
      await recordAuditLog(token, {
        action: 'quiz.submit',
        description: `submitted quiz for ${submodule.title} — ${score}/${totalPoints}`,
      })
    }
  }

  async function goNext() {
    if (!currentAnswered) return
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1)
      return
    }
    setSubmitting(true)
    await submitQuiz()
    setSubmitting(false)
    setFinished(true)
  }

  function exit() {
    router.back()
  }

  if (gate === 'loading') {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (gate === 'not-enabled' || gate === 'already-submitted' || !submodule) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6 gap-3">
        <Text className="text-lg font-bold text-brand-brown">
          {gate === 'already-submitted' ? 'Quiz already completed' : 'Quiz not available yet'}
        </Text>
        <Pressable onPress={exit} className="mt-4 rounded-xl bg-[#0BC2D7] px-6 py-3">
          <Text className="text-white font-bold">Go back</Text>
        </Pressable>
      </View>
    )
  }

  if (!started) {
    const questionCount = getQuizQuestionCount(submodule)
    return (
      <View className="flex-1 bg-white items-center justify-center px-6 gap-4">
        <Text className="text-5xl">📝</Text>
        <Text className="text-2xl font-bold text-brand-brown text-center">{submodule.title} Quiz</Text>
        <Text className="text-gray-500 text-center max-w-xs">
          This quiz has {questionCount} questions and can only be taken once. Make sure you&apos;re ready before starting.
        </Text>
        <Pressable onPress={beginQuiz} className="w-full max-w-xs rounded-xl bg-[#FFA93C] py-4 items-center mt-2">
          <Text className="text-white font-bold text-base">Start Quiz</Text>
        </Pressable>
        <Pressable onPress={exit} className="w-full max-w-xs rounded-xl border border-gray-200 py-4 items-center">
          <Text className="font-bold text-base">Not yet</Text>
        </Pressable>
      </View>
    )
  }

  if (finished) {
    const percent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 100
    return (
      <ScrollView className="flex-1 bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="items-center px-6 py-10 gap-4">
          <Text className="text-6xl">{percent >= 80 ? '🎉' : percent >= 50 ? '🙂' : '💪'}</Text>
          <Text className="text-2xl font-bold text-brand-brown">Quiz complete!</Text>
          {totalPoints > 0 && (
            <Text className="text-gray-500 text-center">
              You got <Text className="font-bold">{score}/{totalPoints}</Text> ({percent}%) correct
            </Text>
          )}

          {answers.length > 0 && (
            <View className="w-full gap-2">
              <Pressable onPress={() => setShowReview((s) => !s)}>
                <Text className="text-center text-sm font-semibold text-[#007B89]">
                  {showReview ? '▲ Hide' : '▼ Review'} Answers
                </Text>
              </Pressable>
              {showReview && answers.map((a, idx) => {
                const item = itemById.get(a.item_id)
                return (
                  <View key={idx} className="flex-row items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                    <View className="flex-1">
                      <Text className="font-semibold text-sm">{item?.label ?? a.item_id}</Text>
                      {!a.is_correct && (
                        <Text className="text-xs text-gray-400">You answered: {a.answer_given || '—'}</Text>
                      )}
                    </View>
                    <Text className={a.is_correct ? 'text-[#579F10]' : 'text-[#C61518]'}>{a.is_correct ? '✓' : '✕'}</Text>
                  </View>
                )
              })}
            </View>
          )}

          <Pressable onPress={exit} className="w-full rounded-xl bg-[#0BC2D7] py-4 items-center mt-4">
            <Text className="text-white font-bold text-base">Back to {submodule.shortTitle}</Text>
          </Pressable>
        </View>
      </ScrollView>
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
        {current.type === 'sign-to-picture' && (
          <SignToPicture
            key={stepIndex}
            item={current.item}
            distractors={current.distractors ?? []}
            mode="quiz"
            initialAnswer={currentAnswer?.[0]?.answer_given ?? null}
            onAnswer={(correct, answerGiven) => recordAnswer([
              { activity_type: 'sign-to-picture', item_id: current.item.id, answer_given: answerGiven, is_correct: correct, occurrence: current.occurrence },
            ])}
          />
        )}
        {current.type === 'spelling' && (
          <Spelling
            key={stepIndex}
            item={current.item}
            mode="quiz"
            initialAnswer={currentAnswer?.[0]?.answer_given ?? null}
            onAnswer={(correct, answerGiven) => recordAnswer([
              { activity_type: 'spelling', item_id: current.item.id, answer_given: answerGiven, is_correct: correct, occurrence: current.occurrence },
            ])}
          />
        )}
        {current.type === 'drag-drop-match' && (
          <DragDropMatch
            key={stepIndex}
            items={current.groupItems ?? [current.item]}
            mode="quiz"
            initialMatches={currentAnswer ? Object.fromEntries(currentAnswer.map((a) => [a.item_id, a.answer_given ?? ''])) : null}
            onAnswer={(results) => recordAnswer(results.map((r, i) => ({
              activity_type: 'drag-drop-match',
              item_id: r.itemId,
              answer_given: r.matchedLabel,
              is_correct: r.correct,
              occurrence: current.groupOccurrences?.[i],
            })))}
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
