import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useEvent } from 'expo'
import { useVideoPlayer, VideoView } from 'expo-video'
import { type PLAYER_STATES } from 'react-native-youtube-iframe'
import type { SignItem, SubModule } from '@/content/types'
import { getModuleTreeBySource, type ContentSource } from '@/lib/moduleTree'
import { parseVideoUrl } from '@/lib/videoEmbed'
import { labelTextSize } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { readBooleanSetting, VIDEO_MANUAL_PLAY_STORAGE_KEY } from '@/lib/settings'
import YoutubePlayer from '@/components/shared/YoutubePlayer'

const SPEEDS = [0.5, 0.75, 1] as const

export default function LearnScreen() {
  const { moduleId, submoduleId, source } = useLocalSearchParams<{ moduleId: string; submoduleId: string; source: ContentSource }>()
  const { session } = useAuth()
  const router = useRouter()

  const [submodule, setSubmodule] = useState<SubModule | null>(null)
  const [moduleTitle, setModuleTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeVariationId, setActiveVariationId] = useState<string | null>(null)
  const [looping, setLooping] = useState(true)
  const [playbackRate, setPlaybackRate] = useState<(typeof SPEEDS)[number]>(1)
  const [ytPlaying, setYtPlaying] = useState(true)
  // Default (false = autoplay) deliberately inverted from the web app's own
  // default (true = manual-play) — mobile autoplay-by-default was an explicit
  // ask during Phase 4, confirmed working; this setting just makes it a
  // user-toggleable preference on top of that established default, not a
  // straight port of the web default.
  const [manualPlay, setManualPlay] = useState(false)

  useEffect(() => {
    readBooleanSetting(VIDEO_MANUAL_PLAY_STORAGE_KEY, false).then(setManualPlay)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const userId = session?.user.id
      if (!userId) return
      const mod = await getModuleTreeBySource(supabase, source, moduleId, userId)
      const sm = mod?.subModules.find((s) => s.id === submoduleId) ?? null
      if (cancelled) return
      setModuleTitle(mod?.title ?? '')
      setSubmodule(sm)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [moduleId, submoduleId, source, session?.user.id])

  const selectedItem = submodule?.items[selectedIndex]

  const activeVideoUrl = useMemo(() => {
    if (!selectedItem) return null
    if (activeVariationId) {
      return selectedItem.videoVariations?.find((v) => v.id === activeVariationId)?.url ?? selectedItem.videoPath
    }
    return selectedItem.videoPath
  }, [selectedItem, activeVariationId])

  const parsedVideo = activeVideoUrl ? parseVideoUrl(activeVideoUrl) : null
  const isYoutube = parsedVideo?.source === 'youtube'

  const player = useVideoPlayer(!isYoutube && activeVideoUrl ? activeVideoUrl : null, (p) => {
    p.loop = looping
    p.playbackRate = playbackRate
    if (!manualPlay) p.play()
  })

  useEffect(() => {
    if (!player) return
    player.loop = looping
    player.playbackRate = playbackRate
  }, [player, looping, playbackRate])

  // Covers the case where the manual-play setting is still loading from
  // AsyncStorage when the player above is first created (see useVideoPlayer's
  // setup callback, which only runs once per video source).
  useEffect(() => {
    if (!player || !manualPlay) return
    player.pause()
  }, [player, manualPlay])

  // Official documented pattern (expo docs: expo-video "Playing a video")
  // for reactive player state — hand-rolled addListener/useState here caused
  // the play/pause button to desync from actual playback after a couple of
  // taps, since the manual listener wiring wasn't kept in sync with player
  // identity changes (a new player is created per video source).
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false })
  const isPaused = isYoutube ? !ytPlaying : !isPlaying

  // New video (sign or variation switch) respects the manual-play setting,
  // YouTube included.
  useEffect(() => { setYtPlaying(!manualPlay) }, [activeVideoUrl, manualPlay])

  const markViewed = async (item: SignItem) => {
    const userId = session?.user.id
    if (!userId) return
    await supabase.from('learn_progress').upsert(
      { student_id: userId, module_id: moduleId, submodule_id: submoduleId, item_id: item.id },
      { onConflict: 'student_id,module_id,submodule_id,item_id' },
    )
  }

  useEffect(() => {
    if (selectedItem) markViewed(selectedItem)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id])

  function selectIndex(idx: number) {
    setSelectedIndex(idx)
    setActiveVariationId(null)
  }

  function togglePause() {
    if (isYoutube) {
      setYtPlaying((p) => !p)
      return
    }
    if (!player) return
    if (player.playing) player.pause()
    else player.play()
  }

  function handleYoutubeStateChange(state: PLAYER_STATES) {
    if (state === 'playing') setYtPlaying(true)
    if (state === 'paused') setYtPlaying(false)
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (!submodule || !selectedItem) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Content not found.</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: true, title: `${moduleTitle} · ${submodule.shortTitle}` }} />

      <View className="px-4 pt-4">
        <View className="flex-row gap-2 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {submodule.items.map((item, idx) => (
                <Pressable
                  key={item.id}
                  onPress={() => selectIndex(idx)}
                  className={`px-4 py-2.5 rounded-xl border-2 ${idx === selectedIndex ? 'bg-[#007B89] border-[#007B89]' : 'bg-white border-gray-200'}`}
                >
                  <Text className={idx === selectedIndex ? 'text-white font-bold' : 'text-black font-bold'}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="aspect-video w-full rounded-2xl bg-black overflow-hidden">
          {isYoutube && parsedVideo?.id ? (
            <YoutubePlayer
              key={activeVideoUrl}
              videoId={parsedVideo.id}
              play={ytPlaying}
              loop={looping}
              mute={false}
              playbackRate={playbackRate}
              onChangeState={handleYoutubeStateChange}
            />
          ) : player ? (
            <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} />
          ) : null}
        </View>

        <View className="flex-row items-center justify-center gap-2 mt-4 flex-wrap">
            {selectedItem.videoVariations && selectedItem.videoVariations.length > 0 && (
              <View className="flex-row gap-1.5 mr-2">
                <Pressable
                  onPress={() => setActiveVariationId(null)}
                  className={`h-9 w-9 rounded-full border items-center justify-center ${activeVariationId === null ? 'bg-[#007B89] border-[#007B89]' : 'border-gray-300'}`}
                >
                  <Text className={activeVariationId === null ? 'text-white font-bold text-xs' : 'font-bold text-xs'}>1</Text>
                </Pressable>
                {selectedItem.videoVariations.map((v, i) => (
                  <Pressable
                    key={v.id}
                    onPress={() => setActiveVariationId(v.id)}
                    className={`h-9 w-9 rounded-full border items-center justify-center ${activeVariationId === v.id ? 'bg-[#007B89] border-[#007B89]' : 'border-gray-300'}`}
                  >
                    <Text className={activeVariationId === v.id ? 'text-white font-bold text-xs' : 'font-bold text-xs'}>{i + 2}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable onPress={togglePause} className="h-9 w-9 rounded-full border border-gray-300 items-center justify-center">
              <Text>{isPaused ? '▶' : '⏸'}</Text>
            </Pressable>
            <Pressable
              onPress={() => setLooping((l) => !l)}
              className={`h-9 w-9 rounded-full border items-center justify-center ${looping ? 'bg-[#007B89] border-[#007B89]' : 'border-gray-300'}`}
            >
              <Text className={looping ? 'text-white' : ''}>↻</Text>
            </Pressable>
            {SPEEDS.map((speed) => (
              <Pressable
                key={speed}
                onPress={() => setPlaybackRate(speed)}
                className={`h-9 min-w-9 px-2 rounded-full border items-center justify-center ${playbackRate === speed ? 'bg-[#007B89] border-[#007B89]' : 'border-gray-300'}`}
              >
                <Text className={playbackRate === speed ? 'text-white font-bold text-xs' : 'font-bold text-xs'}>{speed === 1 ? '1x' : `${speed}x`}</Text>
              </Pressable>
            ))}
        </View>

        <View className="items-center gap-2 rounded-2xl bg-white border-2 border-gray-200 p-6 mt-4">
          <Text className={`${labelTextSize(selectedItem.label, ['text-5xl', 'text-3xl', 'text-2xl'])} font-black text-[#007B89] text-center`}>
            {selectedItem.label}
          </Text>
          {selectedItem.labelFil && <Text className="text-base text-gray-500">{selectedItem.labelFil}</Text>}
        </View>

        <View className="flex-row gap-3 mt-4 mb-8">
          <Pressable
            onPress={() => selectIndex(selectedIndex - 1)}
            disabled={selectedIndex === 0}
            className={`flex-1 rounded-xl border border-gray-200 py-3 items-center ${selectedIndex === 0 ? 'opacity-40' : ''}`}
          >
            <Text className="font-semibold">← Previous</Text>
          </Pressable>
          <Pressable
            onPress={() => selectIndex(selectedIndex + 1)}
            disabled={selectedIndex === submodule.items.length - 1}
            className={`flex-1 rounded-xl bg-[#0BC2D7] py-3 items-center ${selectedIndex === submodule.items.length - 1 ? 'opacity-40' : ''}`}
          >
            <Text className="font-semibold text-white">Next →</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}
