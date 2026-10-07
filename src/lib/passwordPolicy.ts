export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_HINT = 'At least 8 characters, with a mix of letters and numbers.'

export const PASSWORD_PLACEHOLDER = 'e.g. KamayAra123'

export function isPasswordValid(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  )
}
