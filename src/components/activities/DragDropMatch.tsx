import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import type { SignItem } from '@/content/types'
import { shuffle } from '@/lib/shuffle'
import SignVideo from '@/components/shared/SignVideo'

interface MatchResult {
  itemId: string
  correct: boolean
  matchedLabel: string
}

interface Props {
  items: SignItem[] // exactly 3
  mode: 'activity' | 'quiz'
  initialMatches?: Record<string, string> | null
  onAnswer: (results: MatchResult[]) => void
}

export default function DragDropMatch({ items, mode, initialMatches, onAnswer }: Props) {
  const [videoOrder] = useState<SignItem[]>(() => shuffle(items))
  const [pictureOrder] = useState<SignItem[]>(() => shuffle(items))
  const [matches, setMatches] = useState<Record<string, string>>(initialMatches ?? {})
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [locked, setLocked] = useState(mode === 'activity' && !!initialMatches)
  const [saved, setSaved] = useState(mode === 'quiz' && !!initialMatches)

  function handleVideoTap(id: string) {
    if (locked) return
    setSelectedVideo((prev) => (prev === id ? null : id))
  }

  function handlePictureTap(pictureId: string) {
    if (!selectedVideo || locked) return
    const existingVideoForPicture = Object.entries(matches).find(([, pId]) => pId === pictureId)?.[0]
    setMatches((prev) => {
      const next = { ...prev }
      if (existingVideoForPicture) delete next[existingVideoForPicture]
      next[selectedVideo] = pictureId
      return next
    })
    setSelectedVideo(null)
    setSaved(false)
  }

  const allMatched = Object.keys(matches).length === items.length

  function handleSubmit() {
    if (!allMatched) return
    const results: MatchResult[] = items.map((item) => ({
      itemId: item.id,
      correct: matches[item.id] === item.id,
      matchedLabel: matches[item.id] ?? '',
    }))
    if (mode === 'quiz') {
      onAnswer(results)
      setSaved(true)
    } else {
      setLocked(true)
      onAnswer(results)
    }
  }

  const allCorrect = locked && items.every((item) => matches[item.id] === item.id)
  const score = locked ? items.filter((item) => matches[item.id] === item.id).length : 0

  return (
    <View className="gap-4">
      <Text className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400">
        Match the sign to the picture
      </Text>
      {selectedVideo && (
        <Text className="text-center text-sm text-[#007B89] font-medium">Now tap the matching picture →</Text>
      )}

      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          <Text className="text-xs font-semibold text-center text-gray-400 uppercase">Signs</Text>
          {videoOrder.map((item) => {
            const isSelected = selectedVideo === item.id
            const matchedPictureId = matches[item.id]
            const matchedItem = matchedPictureId ? items.find((i) => i.id === matchedPictureId) : null
            const isCorrect = locked && matchedPictureId === item.id
            const borderColor = locked ? (isCorrect ? 'border-[#579F10]' : 'border-[#C61518]') : isSelected ? 'border-gray-500' : 'border-transparent'
            const bg = locked ? (isCorrect ? 'bg-[#D8F2BF]' : 'bg-[#FFDEDF]') : 'bg-black'

            return (
              <Pressable key={item.id} onPress={() => handleVideoTap(item.id)} className={`rounded-xl overflow-hidden border-2 ${borderColor}`}>
                <View className={`aspect-video ${bg}`}>
                  <SignVideo videoPath={item.videoPath} />
                </View>
                {matchedItem && !locked && (
                  <Text className="text-center text-xs font-semibold py-1 bg-gray-100">→ {matchedItem.label}</Text>
                )}
              </Pressable>
            )
          })}
        </View>

        <View className="flex-1 gap-2">
          <Text className="text-xs font-semibold text-center text-gray-400 uppercase">Pictures</Text>
          {pictureOrder.map((item) => {
            const matchedVideoId = Object.entries(matches).find(([, pId]) => pId === item.id)?.[0]
            const isMatched = matchedVideoId !== undefined
            const matchedCorrectly = locked && matches[item.id] === item.id
            const borderColor = locked
              ? matchedCorrectly ? 'border-[#579F10]' : isMatched ? 'border-[#C61518]' : 'border-gray-200'
              : selectedVideo && !isMatched ? 'border-amber-400' : isMatched ? 'border-[#0BC2D7]' : 'border-gray-200'
            const bg = locked
              ? matchedCorrectly ? 'bg-[#D8F2BF]' : isMatched ? 'bg-[#FFDEDF]' : 'bg-white'
              : 'bg-white'

            return (
              <Pressable
                key={item.id}
                onPress={() => handlePictureTap(item.id)}
                disabled={locked}
                className={`aspect-video items-center justify-center rounded-xl border-2 p-2 ${borderColor} ${bg}`}
              >
                <Text className="font-black text-brand-secondary text-center">{item.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {locked && (
        <View className={`rounded-2xl p-4 items-center ${allCorrect ? 'bg-[#D8F2BF]' : 'bg-amber-100'}`}>
          <Text className={`font-bold text-base ${allCorrect ? 'text-[#579F10]' : 'text-amber-600'}`}>
            {allCorrect ? '🎉 Perfect match!' : `${score}/3 correct`}
          </Text>
        </View>
      )}

      {(mode === 'quiz' || !locked) && (
        <Pressable
          onPress={handleSubmit}
          disabled={!allMatched}
          className={`w-full py-4 rounded-xl items-center ${allMatched ? 'bg-[#0BC2D7]' : 'bg-[#0BC2D7]/40'}`}
        >
          <Text className="text-white font-bold text-base">{mode === 'quiz' ? (saved ? 'Confirmed ✓' : 'Confirm Answer') : 'Check answers'}</Text>
        </Pressable>
      )}
    </View>
  )
}
