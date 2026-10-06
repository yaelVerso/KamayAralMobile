/**
 * Turns a pasted YouTube link into an embeddable iframe URL. YouTube is
 * the only supported video source for custom signs — Google Drive was
 * dropped after repeated embed issues (cropping, no controls exposed,
 * no autoplay, broken layout on narrow viewports) with no equivalent
 * player API to work around them. Cloudinary is a future option under
 * consideration.
 */
export type VideoSource = 'youtube' | 'unknown'

export interface ParsedVideo {
  source: VideoSource
  embedUrl: string | null
  /** The extracted YouTube video id, if recognized — used to build autoplay/loop params. */
  id: string | null
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function parseVideoUrl(url: string): ParsedVideo {
  const trimmed = url.trim()

  const youtubeId = extractYoutubeId(trimmed)
  if (youtubeId) {
    return { source: 'youtube', embedUrl: `https://www.youtube.com/embed/${youtubeId}`, id: youtubeId }
  }

  return { source: 'unknown', embedUrl: null, id: null }
}

export function isValidVideoUrl(url: string): boolean {
  return parseVideoUrl(url).embedUrl !== null
}
