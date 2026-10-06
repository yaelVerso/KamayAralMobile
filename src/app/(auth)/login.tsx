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
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-6 gap-4">
        <Text className="text-3xl font-black text-brand-brown mb-2">Kamay-Aral</Text>
        <Text className="text-base text-gray-500 mb-4">Sign in to keep learning.</Text>

        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Email or ID Number"
          autoCapitalize="none"
          autoCorrect={false}
          className="border border-gray-300 rounded-xl px-4 py-3 text-base"
        />
        <View className="relative justify-center">
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-gray-300 rounded-xl px-4 py-3 pr-16 text-base"
          />
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            className="absolute right-4"
            hitSlop={8}
          >
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {error && <Text className="text-red-600 text-sm">{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={loading || !identifier.trim() || !password}
          className="bg-brand-primary rounded-xl py-4 items-center mt-2 disabled:opacity-50"
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Log In</Text>}
        </Pressable>

        <Pressable onPress={() => router.push('/forgot-password')} className="items-center mt-1">
          <Text className="text-brand-primary font-semibold text-sm">Forgot password?</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
