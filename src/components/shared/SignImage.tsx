import { Image, type ImageStyle } from 'expo-image'
import type { StyleProp } from 'react-native'

interface Props {
  src: string
  alt: string
  style?: StyleProp<ImageStyle>
}

// Mirrors the web app's SignImage: a Drive "share" link (drive.google.com/file/d/ID/view)
// is Drive's HTML viewer page, not raw image bytes — rewritten to Drive's thumbnail
// endpoint, which does serve the actual image for a publicly-shared file.
function resolveImageUrl(src: string): string {
  const match = src.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000` : src
}

export default function SignImage({ src, alt, style }: Props) {
  return (
    <Image
      source={{ uri: resolveImageUrl(src) }}
      alt={alt}
      style={[{ width: '100%', height: '100%' }, style]}
      contentFit="contain"
    />
  )
}
