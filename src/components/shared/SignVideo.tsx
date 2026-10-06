import { useVideoPlayer, VideoView } from 'expo-video'
import { parseVideoUrl } from '@/lib/videoEmbed'
import YoutubePlayer from '@/components/shared/YoutubePlayer'

interface Props {
  videoPath: string
}

/**
 * Muted, looping, no-controls sign video for activity steps (LessonCard,
 * SignToPicture, Spelling, DragDropMatch) — mirrors the web app's plain
 * autoplay <video> / YouTube-embed split in components/shared/SignVideo.tsx.
 * Caller wraps this in its own sized/rounded container, same as the web
 * version's `<div className="aspect-video ...">` wrapper.
 */
export default function SignVideo({ videoPath }: Props) {
  const parsed = parseVideoUrl(videoPath)
  const isYoutube = parsed.source === 'youtube'

  const player = useVideoPlayer(!isYoutube ? videoPath : null, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })

  if (isYoutube && parsed.id) {
    return <YoutubePlayer videoId={parsed.id} play loop mute />
  }

  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} />
}
