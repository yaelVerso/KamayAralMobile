import { View, Text } from 'react-native'

interface Props {
  percent: number
  trackClassName?: string
  fillClassName?: string
  showLabel?: boolean
}

export default function ProgressBar({ percent, trackClassName, fillClassName, showLabel = true }: Props) {
  const clamped = Math.max(0, Math.min(100, percent))

  return (
    <View className="flex-row items-center gap-2">
      <View className={`flex-1 h-2 rounded-full overflow-hidden ${trackClassName ?? 'bg-gray-200'}`}>
        <View
          className={`h-full rounded-full ${fillClassName ?? 'bg-brand-primary'}`}
          style={{ width: `${clamped}%` }}
        />
      </View>
      {showLabel && <Text className="text-xs font-bold text-gray-500 w-9 text-right">{clamped}%</Text>}
    </View>
  )
}
