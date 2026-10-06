// Thin wrappers around the Next.js bridge routes in Kamay-Aral_v2 (app/api/mobile/**).
// These exist only for operations that need the service-role key server-side
// (resolving a login identifier to an email, writing audit_logs rows, and
// generating password reset links) — everything else talks to Supabase
// directly from this app.

import Constants from 'expo-constants'

// In Expo Go dev, derive the bridge host from wherever the JS bundle was
// actually loaded from (LAN IP or ngrok tunnel subdomain) instead of a
// hardcoded env var — metro.config.js already proxies /api/mobile/** through
// that same host to the Next.js dev server, and both the LAN address and the
// tunnel's anonymous ngrok subdomain change on every `expo start`, so a
// static EXPO_PUBLIC_API_BASE_URL goes stale the moment the dev server
// restarts. Production builds have no Metro host, so they fall back to the
// env var, which should point at the real deployed web app there.
function resolveBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) {
    const host = hostUri.split(':')[0]
    const isTunnel = host.endsWith('.exp.direct')
    return isTunnel ? `https://${host}` : `http://${hostUri}`
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL!
}

const BASE_URL = resolveBaseUrl()

async function postJson<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<T>
}

export function resolveLoginEmail(identifier: string) {
  return postJson<{ email: string } | { error: string }>('/api/mobile/resolve-login-email', { identifier })
}

export function recordFailedLogin(identifier: string) {
  return postJson<{ ok: boolean }>('/api/mobile/record-failed-login', { identifier })
}

export function recordAuditLog(
  accessToken: string,
  payload: { action: string; description: string; sectionId?: string | null; sectionName?: string | null },
) {
  return postJson<{ ok: boolean }>('/api/mobile/audit-log', payload, accessToken)
}

export function requestPasswordReset(email: string) {
  return postJson<{ message: string }>('/api/mobile/request-password-reset', { email })
}
