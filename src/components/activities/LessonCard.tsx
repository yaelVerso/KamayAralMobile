import { View, Text } from 'react-native'
import type { SignItem } from '@/content/types'
import { labelTextSize } from '@/lib/utils'
import SignVideo from '@/components/shared/SignVideo'

interface Props {
  item: SignItem
}

export default function LessonCard({ item }: Props) {
  return (
    <View className="gap-4">
      <Text className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400">
        Learn this sign
      </Text>

      <View className="aspect-video w-full rounded-2xl bg-black overflow-hidden">
        <SignVideo videoPath={item.videoPath} />
      </View>

      <View className="items-center gap-2 rounded-2xl bg-white border-2 border-gray-200 p-6">
        <Text className={`${labelTextSize(item.label, ['text-5xl', 'text-3xl', 'text-2xl'])} font-black text-[#007B89] text-center`}>
          {item.label}
        </Text>
        {item.labelFil && <Text className="text-base text-gray-500">{item.labelFil}</Text>}
      </View>
    </View>
  )
}
