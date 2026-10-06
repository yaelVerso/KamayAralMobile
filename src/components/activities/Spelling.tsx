import { useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import type { SignItem } from '@/content/types'
import SignVideo from '@/components/shared/SignVideo'

interface Props {
  item: SignItem
  mode: 'activity' | 'quiz'
  initialAnswer?: string | null
  onAnswer: (correct: boolean, answerGiven: string) => void
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export default function Spelling({ item, mode, initialAnswer, onAnswer }: Props) {
  const [answer, setAnswer] = useState(initialAnswer ?? '')
  const [locked, setLocked] = useState(mode === 'activity' && !!initialAnswer)
  const [saved, setSaved] = useState(mode === 'quiz' && !!initialAnswer)

  const isCorrect = item.acceptedAnswers.some((a) => normalize(a) === normalize(answer))

  function handleChange(value: string) {
    if (locked) return
    setAnswer(value)
    setSaved(false)
  }

  function handleSubmit() {
    if (!answer.trim()) return
    if (mode === 'quiz') {
      onAnswer(isCorrect, answer)
      setSaved(true)
    } else {
      setLocked(true)
      onAnswer(isCorrect, answer)
    }
  }

  return (
    <View className="gap-4">
      <Text className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400">
        Type what sign this is
      </Text>

      <View className="aspect-video w-full rounded-2xl bg-black overflow-hidden">
        <SignVideo videoPath={item.videoPath} />
      </View>

      <TextInput
        value={answer}
        onChangeText={handleChange}
        placeholder="Type your answer…"
        editable={!locked}
        autoCapitalize="none"
        autoCorrect={false}
        className={`h-16 text-center text-2xl font-semibold rounded-xl border-2 px-4 ${
          locked ? (isCorrect ? 'border-[#579F10] bg-[#D8F2BF]' : 'border-[#C61518] bg-[#FFDEDF]') : 'border-gray-200 bg-white'
        }`}
      />

      {locked && (
        <View className={`rounded-2xl p-4 items-center ${isCorrect ? 'bg-[#D8F2BF]' : 'bg-[#FFDEDF]'}`}>
          <Text className={`font-bold text-lg ${isCorrect ? 'text-[#579F10]' : 'text-[#C61518]'}`}>
            {isCorrect ? '🎉 Correct!' : '❌ Not quite'}
          </Text>
          {!isCorrect && (
            <Text className="text-sm mt-1 text-[#C61518]">Correct Answer: {item.acceptedAnswers.join(' / ')}</Text>
          )}
        </View>
      )}

      {(mode === 'quiz' || !locked) && (
        <Pressable
          onPress={handleSubmit}
          disabled={!answer.trim()}
          className={`w-full py-4 rounded-xl items-center ${answer.trim() ? 'bg-[#0BC2D7]' : 'bg-[#0BC2D7]/40'}`}
        >
          <Text className="text-white font-bold text-base">
            {mode === 'quiz' ? (saved ? 'Confirmed ✓' : 'Confirm Answer') : 'Check'}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
