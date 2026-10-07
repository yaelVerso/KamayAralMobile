import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth-context'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    const result = await signIn(identifier.trim(), password)
    setLoading(false)
    if (result.error) setError(result.error)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-[#007B89]"
    >
      <View className="flex-1 justify-center px-6">
        <View className="bg-white rounded-2xl px-6 py-7 gap-4 shadow-lg">
          <View className="items-center gap-1 mb-2">
            <Text className="text-4xl mb-1">🤟</Text>
            <Text className="text-3xl font-black text-brand-brown">Kamay-Aral</Text>
            <Text className="text-sm text-gray-500 text-center">
              Your Partner in Learning Filipino Sign Language
            </Text>
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-gray-700">Email or ID Number</Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="ID number or you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              className="border border-gray-300 rounded-xl px-4 py-3 text-base"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-gray-700">Password</Text>
            <View className="relative justify-center">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                className="border border-gray-300 rounded-xl px-4 py-3 pr-12 text-base"
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                className="absolute right-4"
                hitSlop={8}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => router.push('/forgot-password')} className="items-end -mt-1">
            <Text className="text-brand-secondary font-semibold text-sm">Forgot password?</Text>
          </Pressable>

          {error && <Text className="text-red-600 text-sm text-center">{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={loading || !identifier.trim() || !password}
            className="bg-brand-primary rounded-xl py-4 items-center disabled:opacity-50"
          >
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Sign in</Text>}
          </Pressable>

          <Text className="text-center text-xs text-gray-400">Accounts are created by admin.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
