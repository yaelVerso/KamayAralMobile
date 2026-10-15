import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import type { SignItem } from '@/content/types'
import { shuffle } from '@/lib/shuffle'
import SignVideo from '@/components/shared/SignVideo'
import SignImage from '@/components/shared/SignImage'

interface MatchResult {
  itemId: string
  correct: boolean
  matchedLabel: string
}

// one color per pair slot, keyed by stable position in items, not display
// order - mirrors the web app's DragDropMatch so a matched sign/picture pair
// visibly share a color before the answer is locked in
const PAIR_COLORS = [
  { border: 'border-[#8B5CF6]', bg: 'bg-[#EDE6FB]', text: 'text-[#6D28D9]' },
  { border: 'border-[#0BC2D7]', bg: 'bg-[#D5ECEF]', text: 'text-[#007B89]' },
  { border: 'border-[#F472B6]', bg: 'bg-[#FCE7F3]', text: 'text-[#BE185D]' },
]

interface Props {
  items: SignItem[]
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
  // Only the first tile autoplays — react-native-youtube-iframe can't
  // reliably autoplay 3 simultaneous WebViews. The rest start on tap,
  // backed by a real user gesture so it actually works.
  const [playingIds, setPlayingIds] = useState<Set<string>>(() => new Set(videoOrder[0] ? [videoOrder[0].id] : []))

  function handleVideoTap(id: string) {
    if (locked) return
    setSelectedVideo((prev) => (prev === id ? null : id))
    setPlayingIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
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

  function pairColor(itemId: string) {
    const idx = items.findIndex((i) => i.id === itemId)
    return PAIR_COLORS[idx % PAIR_COLORS.length]
  }

  return (
    <View className="gap-4">
      <Text className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400">
        Match the sign to the picture
      </Text>
      {selectedVideo && (
        <Text className="text-center text-sm text-[#007B89] font-medium">Now tap the matching picture →</Text>
      )}

      <View className="flex-row gap-4">
        <View className="flex-[1.4] gap-4">
          <Text className="text-xs font-semibold text-center text-gray-400 uppercase">Signs</Text>
          {videoOrder.map((item) => {
            const isSelected = selectedVideo === item.id
            const matchedPictureId = matches[item.id]
            const matchedItem = matchedPictureId ? items.find((i) => i.id === matchedPictureId) : null
            const isCorrect = locked && matchedPictureId === item.id
            const color = pairColor(item.id)
            const borderColor = locked
              ? isCorrect ? 'border-[#579F10]' : 'border-[#C61518]'
              : isSelected ? 'border-gray-500' : matchedItem ? color.border : 'border-transparent'
            const bg = locked ? (isCorrect ? 'bg-[#D8F2BF]' : 'bg-[#FFDEDF]') : 'bg-black'

            // Video and "select this tile" are split into separate tap
            // targets (not one Pressable wrapping both): on Android, a
            // Pressable claims the touch responder for its whole area, so
            // when it wrapped the video too, taps almost never reached the
            // WebView underneath — meaning YouTube's own play button (which
            // does work when tapped directly, confirmed elsewhere in the
            // app) never got a real touch here. The video now renders
            // outside any Pressable so native taps reach it directly; the
            // label strip below is its own Pressable for selection.
            return (
              <View key={item.id} className={`rounded-xl overflow-hidden border-2 ${borderColor}`}>
                <View className={`aspect-video ${bg}`}>
                  <SignVideo videoPath={item.videoPath} play={playingIds.has(item.id)} />
                </View>
                <Pressable
                  onPress={() => handleVideoTap(item.id)}
                  disabled={locked}
                  className={`py-3 items-center ${isSelected ? 'bg-[#007B89]' : matchedItem && !locked ? color.bg : 'bg-gray-100'}`}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      isSelected ? 'text-white' : matchedItem && !locked ? color.text : 'text-gray-600'
                    }`}
                  >
                    {matchedItem && !locked ? `→ ${matchedItem.label}` : isSelected ? 'Selected ✓' : 'Tap to select'}
                  </Text>
                </Pressable>
              </View>
            )
          })}
        </View>

        <View className="flex-1 gap-4">
          <Text className="text-xs font-semibold text-center text-gray-400 uppercase">Pictures</Text>
          {pictureOrder.map((item) => {
            const matchedVideoId = Object.entries(matches).find(([, pId]) => pId === item.id)?.[0]
            const isMatched = matchedVideoId !== undefined
            const matchedCorrectly = locked && matches[item.id] === item.id
            const color = matchedVideoId ? pairColor(matchedVideoId) : null
            const borderColor = locked
              ? matchedCorrectly ? 'border-[#579F10]' : isMatched ? 'border-[#C61518]' : 'border-gray-200'
              : selectedVideo && !isMatched ? 'border-amber-400' : isMatched && color ? color.border : 'border-gray-200'
            const bg = locked
              ? matchedCorrectly ? 'bg-[#D8F2BF]' : isMatched ? 'bg-[#FFDEDF]' : 'bg-white'
              : isMatched && color ? color.bg : 'bg-white'

            return (
              <Pressable
                key={item.id}
                onPress={() => handlePictureTap(item.id)}
                disabled={locked}
                className={`aspect-video items-center justify-center rounded-xl border-2 p-2 ${borderColor} ${bg}`}
              >
                {item.imagePath ? (
                  <>
                    <View className="min-h-0 w-full flex-1">
                      <SignImage src={item.imagePath} alt={item.label} />
                    </View>
                    <Text className="font-bold text-center text-sm mt-1">{item.label}</Text>
                  </>
                ) : (
                  <Text className="font-black text-brand-secondary text-center text-xl">{item.label}</Text>
                )}
              </Pressable>
            )
          })}
        </View>
      </View>

      {locked && (
        <View className={`rounded-2xl p-4 items-center ${allCorrect ? 'bg-[#D8F2BF]' : 'bg-amber-100'}`}>
          <Text className={`font-bold text-base ${allCorrect ? 'text-[#579F10]' : 'text-amber-600'}`}>
            {allCorrect ? '🎉 Perfect match!' : `${score}/${items.length} correct`}
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
