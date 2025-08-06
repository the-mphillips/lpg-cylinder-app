import { createClient } from '@/lib/supabase/client'
import type { User, UserInsert } from '@/lib/types/database'
// It's better to use a robust library for password hashing
// For now, this is a placeholder to show where it would go.
// import bcrypt from 'bcryptjs'

const supabase = createClient()

// Simple email validation function
export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  let query = supabase.from('users').select('id').eq('username', username)
  if (excludeUserId) {
    query = query.not('id', 'eq', excludeUserId)
  }
  const { data, error } = await query.limit(1)
  if (error) {
    console.error('Error checking username availability:', error)
    return false // Fail safe
  }
  return data.length === 0
}

export async function isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
  let query = supabase.from('users').select('id').eq('email', email)
  if (excludeUserId) {
    query = query.not('id', 'eq', excludeUserId)
  }
  const { data, error } = await query.limit(1)
  if (error) {
    console.error('Error checking email availability:', error)
    return false // Fail safe
  }
  return data.length === 0
}

export function getUserDisplayName(user: Partial<User>): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }
  return user.username || user.email || 'User'
}

export async function createUser(userData: UserInsert): Promise<User | null> {
  // In a real app, hash the password before inserting
  // const salt = await bcrypt.genSalt(10)
  // const password_hash = await bcrypt.hash(userData.password, salt)

  const { data, error } = await supabase
    .from('users')
    .insert({ ...userData }) // Assumes password is pre-hashed or handled by trigger
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    return null
  }

  return data
}

export async function changePassword(userId: string, newPassword_hash: string): Promise<boolean> {
  // In a real app, hash the new password
  // const salt = await bcrypt.genSalt(10)
  // const password_hash = await bcrypt.hash(newPassword, salt)
  
  const { error } = await supabase
    .from('users')
    .update({ password_hash: newPassword_hash })
    .eq('id', userId)

  if (error) {
    console.error('Error changing password:', error)
    return false
  }

  return true
} 