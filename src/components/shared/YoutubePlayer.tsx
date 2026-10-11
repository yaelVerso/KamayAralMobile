import { useEffect, useRef, useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'

// Own minimal YouTube IFrame Player API wrapper, not react-native-youtube-iframe.
// That library's play/pause/setPlaybackRate props send commands into the WebView
// via postMessage(), which proved unreliable here: react-native-webview's Android
// postMessage() dispatches on `document`, but the library's page script only
// listens on `window` - and even after bridging the two, some commands still
// silently had no effect. injectJavaScript() (used below for every command)
// executes directly in the WebView's JS context instead of relying on any
// message-passing, so it isn't subject to either problem.
//
// One thing no amount of code here can fix: browsers only allow *unmuted*
// video to start playing in response to a genuine, direct tap inside the
// WebView itself - a tap on our own React Native buttons doesn't carry that
// credential across the native<->WebView boundary, by design (anti-autoplay-
// abuse policy). So the very first play of an unmuted video still needs an
// actual tap on the video (YouTube's own controls, enabled below, exist for
// exactly this). Pause/resume/speed after that point go through
// injectJavaScript and should be reliable regardless of what started it.
export type PlayerStateName = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'video cued'

const STATE_NAMES: Record<number, PlayerStateName> = {
  '-1': 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'video cued',
}

interface Props {
  videoId: string
  play: boolean
  loop: boolean
  mute: boolean
  controls: boolean
  playbackRate?: number
  onChangeState?: (state: PlayerStateName) => void
}

// Neutral, non-YouTube https origin for the inline-HTML WebView. Must match
// the WebView's `baseUrl` exactly and be passed as playerVars.origin -
// YouTube's IFrame API cross-checks the two for its postMessage security
// handshake (mismatch/missing origin -> "Error 153/152 configuration error").
const EMBED_ORIGIN = 'https://kamay-aral.app'

function buildHtml(videoId: string, loop: boolean, controls: boolean) {
  const playlistParam = loop ? `playlist: ${JSON.stringify(videoId)},` : ''
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>html,body{margin:0;padding:0;background:#000;overflow:hidden;}#player{position:absolute;top:0;left:0;width:100%;height:100%;}</style>
</head>
<body>
<div id="player"></div>
<script>
function post(obj) { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.body.appendChild(tag);
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    videoId: ${JSON.stringify(videoId)},
    playerVars: {
      playsinline: 1,
      controls: ${controls ? 1 : 0},
      rel: 0,
      iv_load_policy: 3,
      origin: ${JSON.stringify(EMBED_ORIGIN)},
      loop: ${loop ? 1 : 0},
      ${playlistParam}
    },
    events: {
      onReady: function () { post({ type: 'ready' }); },
      onStateChange: function (e) { post({ type: 'state', data: e.data }); },
      onError: function (e) { post({ type: 'error', data: e.data }); },
    },
  });
}
</script>
</body>
</html>`
}

/**
 * Explicit pixel width/height (a WebView, not something that fills a
 * percentage container) — measures its own wrapper via onLayout and derives
 * a 16:9 height from that width, so callers can just drop this into any
 * aspect-video-sized container like SignVideo.
 */
export default function YoutubePlayer({ videoId, play, loop, mute, controls, playbackRate, onChangeState }: Props) {
  const [width, setWidth] = useState(0)
  const webViewRef = useRef<WebView>(null)
  const readyRef = useRef(false)

  function handleLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width)
  }

  function run(script: string) {
    webViewRef.current?.injectJavaScript(`(function(){if(typeof player!=='undefined'&&player){${script}}})();true;`)
  }

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data)
      if (msg.type === 'ready') {
        readyRef.current = true
        run(mute ? 'player.mute();' : 'player.unMute();')
        if (playbackRate) run(`player.setPlaybackRate(${playbackRate});`)
        if (play) run('player.playVideo();')
      } else if (msg.type === 'state') {
        onChangeState?.(STATE_NAMES[msg.data] ?? 'unstarted')
      }
    } catch {
      // ignore malformed/unrelated messages
    }
  }

  useEffect(() => {
    if (!readyRef.current) return
    run(play ? 'player.playVideo();' : 'player.pauseVideo();')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play])

  useEffect(() => {
    if (!readyRef.current || !playbackRate) return
    run(`player.setPlaybackRate(${playbackRate});`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackRate])

  useEffect(() => {
    if (!readyRef.current) return
    run(mute ? 'player.mute();' : 'player.unMute();')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mute])

  return (
    <View className="flex-1" onLayout={handleLayout}>
      {width > 0 && videoId && (
        <WebView
          ref={webViewRef}
          // baseUrl gives the inline html a real https origin, matching
          // playerVars.origin above. Without it, YouTube's IFrame API
          // rejects the embed with a "configuration error"/"unavailable"
          // (raw inline HTML has no real origin to validate against for its
          // postMessage security handshake). Must not be a youtube.com
          // origin itself - that gets its own rejection as a likely
          // self-embed, hence a neutral made-up domain instead.
          source={{ html: buildHtml(videoId, loop, controls), baseUrl: EMBED_ORIGIN }}
          style={{ width, height: (width * 9) / 16 }}
          onMessage={handleMessage}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          // See the top-of-file note: this is the fix that stops a tap on the
          // cued thumbnail from hijacking out to the real YouTube app.
          onOpenWindow={() => {}}
        />
      )}
    </View>
  )
}
