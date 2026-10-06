import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import type { SignItem } from '@/content/types'
import { labelTextSize } from '@/lib/utils'
import { shuffle } from '@/lib/shuffle'
import SignVideo from '@/components/shared/SignVideo'

interface Props {
  item: SignItem
  distractors: SignItem[]
  mode: 'activity' | 'quiz'
  initialAnswer?: string | null
  onAnswer: (correct: boolean, answerGiven: string) => void
}

export default function SignToPicture({ item, distractors, mode, initialAnswer, onAnswer }: Props) {
  const [choices] = useState<SignItem[]>(() => shuffle([item, ...distractors.slice(0, 3)]))
  const [selected, setSelected] = useState<string | null>(initialAnswer ?? null)
  const [locked, setLocked] = useState(mode === 'activity' && !!initialAnswer)
  const [saved, setSaved] = useState(mode === 'quiz' && !!initialAnswer)

  const answered = locked
  const correct = selected === item.id

  function handleSelect(id: string) {
    if (locked) return
    setSelected(id)
    setSaved(false)
  }

  function handleSave() {
    if (!selected) return
    if (mode === 'quiz') {
      onAnswer(selected === item.id, selected)
      setSaved(true)
    } else {
      setLocked(true)
      onAnswer(selected === item.id, selected)
    }
  }

  return (
    <View className="gap-4">
      <Text className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400">
        What sign is this?
      </Text>

      <View className="aspect-video w-full rounded-2xl bg-black overflow-hidden">
        <SignVideo videoPath={item.videoPath} />
      </View>

      <View className="flex-row flex-wrap gap-3">
        {choices.map((choice) => {
          const isSelected = selected === choice.id
          const isCorrect = choice.id === item.id
          const borderColor = answered
            ? isCorrect ? 'border-[#579F10]' : isSelected ? 'border-[#C61518]' : 'border-gray-200'
            : isSelected ? 'border-[#0BC2D7]' : 'border-gray-200'
          const bgColor = answered
            ? isCorrect ? 'bg-[#D8F2BF]' : isSelected ? 'bg-[#FFDEDF]' : 'bg-white'
            : isSelected ? 'bg-[#0BC2D7]/10' : 'bg-white'

          return (
            <Pressable
              key={choice.id}
              onPress={() => handleSelect(choice.id)}
              disabled={locked}
              className={`w-[47%] items-center gap-2 rounded-2xl border-2 p-5 ${borderColor} ${bgColor}`}
            >
              <Text className={`${labelTextSize(choice.label, ['text-2xl', 'text-lg', 'text-base'])} font-black text-brand-secondary text-center`}>
                {choice.label}
              </Text>
              {answered && isCorrect && <Text className="text-[#579F10] text-lg absolute right-2 top-2">✓</Text>}
              {answered && isSelected && !isCorrect && <Text className="text-[#C61518] text-lg absolute right-2 top-2">✕</Text>}
            </Pressable>
          )
        })}
      </View>

      {answered && (
        <View className={`rounded-2xl p-4 items-center ${correct ? 'bg-[#D8F2BF]' : 'bg-[#FFDEDF]'}`}>
          <Text className={`font-bold text-lg ${correct ? 'text-[#579F10]' : 'text-[#C61518]'}`}>
            {correct ? '🎉 Correct!' : '❌ Not quite'}
          </Text>
          {!correct && <Text className="text-sm mt-1 text-[#C61518]">The correct answer is {item.label}</Text>}
        </View>
      )}

      {(mode === 'quiz' || !answered) && (
        <Pressable
          onPress={handleSave}
          disabled={!selected}
          className={`w-full py-4 rounded-xl items-center ${selected ? 'bg-[#0BC2D7]' : 'bg-[#0BC2D7]/40'}`}
        >
          <Text className="text-white font-bold text-base">
            {mode === 'quiz' ? (saved ? 'Confirmed ✓' : 'Confirm Answer') : 'Submit Answer'}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
