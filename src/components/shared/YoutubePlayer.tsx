import { useState } from 'react'
import { View, Text, type LayoutChangeEvent } from 'react-native'
import YoutubeIframe, { type PLAYER_STATES } from 'react-native-youtube-iframe'

// Tapping the cued-thumbnail play button inside the embedded YouTube iframe
// calls window.open(), which Android's WebView hands to onCreateWindow as a
// popup - not a normal navigation, so onShouldStartLoadWithRequest never
// sees it. react-native-webview only intercepts that popup (instead of
// letting Android's OS-level verified-App-Link resolution hijack it straight
// to the real YouTube app) when the app passes an onOpenWindow handler, so a
// no-op one is enough to keep the tap inside the app.
const PLAYER_BASE_URL = 'https://lonelycpp.github.io/react-native-youtube-iframe/iframe_v2.html'

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
          webViewProps={{
            onShouldStartLoadWithRequest: (request: { url: string }) => request.url.startsWith(PLAYER_BASE_URL),
            onOpenWindow: () => {},
          }}
        />
      )}
    </View>
  )
}
