import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { PASSWORD_HINT, PASSWORD_PLACEHOLDER, isPasswordValid } from '@/lib/passwordPolicy'

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!currentPassword) {
      Alert.alert('Enter your current password')
      return
    }
    if (!isPasswordValid(password)) {
      Alert.alert(PASSWORD_HINT)
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Could not verify your account')

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (verifyError) throw new Error('Current password is incorrect')

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      Alert.alert('Password updated')
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      Alert.alert(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="gap-3">
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700">Current Password</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          secureTextEntry={!showPass}
          autoCapitalize="none"
          autoCorrect={false}
          className="border border-gray-300 rounded-xl px-4 py-3 text-base"
        />
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700">New Password</Text>
        <View className="relative justify-center">
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={PASSWORD_PLACEHOLDER}
            secureTextEntry={!showPass}
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-gray-300 rounded-xl px-4 py-3 pr-12 text-base"
          />
          <Pressable onPress={() => setShowPass((p) => !p)} className="absolute right-4" hitSlop={8}>
            <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
          </Pressable>
        </View>
        <Text className="text-xs text-gray-500">{PASSWORD_HINT}</Text>
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-gray-700">Confirm New Password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          secureTextEntry={!showPass}
          autoCapitalize="none"
          autoCorrect={false}
          className="border border-gray-300 rounded-xl px-4 py-3 text-base"
        />
      </View>

      <Pressable onPress={handleSubmit} disabled={loading} className="bg-brand-primary rounded-xl py-3.5 items-center disabled:opacity-50">
        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Update Password</Text>}
      </Pressable>
    </View>
  )
}
