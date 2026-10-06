import { useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import YoutubeIframe, { type PLAYER_STATES } from 'react-native-youtube-iframe'

interface Props {
  videoId: string
  play: boolean
  loop: boolean
  mute: boolean
  playbackRate?: number
  onChangeState?: (state: PLAYER_STATES) => void
}

/**
 * react-native-youtube-iframe needs explicit pixel width/height (a WebView,
 * not something that fills a percentage container) — measures its own
 * wrapper via onLayout and derives a 16:9 height from that width, so callers
 * can just drop this into any aspect-video-sized container like SignVideo.
 */
export default function YoutubePlayer({ videoId, play, loop, mute, playbackRate, onChangeState }: Props) {
  const [width, setWidth] = useState(0)

  function handleLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width)
  }

  return (
    <View className="flex-1" onLayout={handleLayout}>
      {width > 0 && (
        <YoutubeIframe
          videoId={videoId}
          width={width}
          height={(width * 9) / 16}
          play={play}
          mute={mute}
          playbackRate={playbackRate}
          initialPlayerParams={{ loop, controls: false, rel: false, iv_load_policy: 3 }}
          onChangeState={onChangeState}
          forceAndroidAutoplay
        />
      )}
    </View>
  )
}
