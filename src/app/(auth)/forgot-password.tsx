import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { requestPasswordReset } from '@/lib/bridge'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    await requestPasswordReset(email.trim())
    setLoading(false)
    // Always show the generic sent state — avoid leaking account existence.
    setSent(true)
  }

  if (sent) {
    return (
      <View className="flex-1 bg-white justify-center px-6 gap-4 items-center">
        <Text className="text-xl font-bold text-brand-brown text-center">Check your email</Text>
        <Text className="text-sm text-gray-500 text-center">
          If an account exists for {email}, we&apos;ve sent a reset link. Open it on a browser to set your new password, then come back and log in here.
        </Text>
        <Pressable onPress={() => router.back()} className="mt-2">
          <Text className="text-brand-primary font-semibold">Back to login</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6 gap-4">
        <Text className="text-2xl font-black text-brand-brown mb-1">Forgot password</Text>
        <Text className="text-sm text-gray-500 mb-2">
          Enter the email on file for the account (for students, this is the email your teacher/admin used when creating the account).
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          className="border border-gray-300 rounded-xl px-4 py-3 text-base"
        />

        <Pressable
          onPress={handleSubmit}
          disabled={loading || !email.trim()}
          className="bg-brand-primary rounded-xl py-4 items-center mt-2 disabled:opacity-50"
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Send reset link</Text>}
        </Pressable>

        <Pressable onPress={() => router.back()} className="items-center mt-2">
          <Text className="text-brand-primary font-semibold">Back to login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
