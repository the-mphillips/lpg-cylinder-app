import type { User } from '@/lib/types/database'

const SESSION_KEY = 'app_session'

export function storeSession(user: User): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  }
}

export function getSession(): User | null {
  if (typeof window === 'undefined') {
    return null
  }

  const sessionData = window.localStorage.getItem(SESSION_KEY)
  if (!sessionData) {
    return null
  }

  try {
    return JSON.parse(sessionData) as User
  } catch (error) {
    console.error('Failed to parse session data:', error)
    return null
  }
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SESSION_KEY)
  }
} 