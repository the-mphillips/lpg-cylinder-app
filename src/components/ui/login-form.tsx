"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/trpc/client'
import { isEmail } from '@/lib/auth/login-helpers'
import { storeSession } from '@/lib/auth/session'
import type { User } from '@/lib/types/database'

interface LoginFormProps {
  onSuccess?: () => void
  className?: string
}

export function LoginForm({ onSuccess, className }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loginMutation = api.auth.login.useMutation({
    onSuccess: (data: { success: boolean; user: User }) => {
      setError('')
      
      // Store the session in localStorage
      if (data.user) {
        storeSession(data.user)
      }
      
      // Call success callback
      onSuccess?.()
    },
    onError: (error: { message: string }) => {
      setError(error.message)
      setIsLoading(false)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!identifier.trim()) {
      setError('Please enter your username or email')
      setIsLoading(false)
      return
    }

    if (!password.trim()) {
      setError('Please enter your password')
      setIsLoading(false)
      return
    }

    try {
      await loginMutation.mutateAsync({
        identifier: identifier.trim(),
        password: password
      })
    } catch {
      // Error handled by onError callback
    }
  }

  const getIdentifierPlaceholder = () => {
    if (!identifier) return 'Username or email'
    return isEmail(identifier) ? 'Email address' : 'Username'
  }

  const getIdentifierLabel = () => {
    if (!identifier) return 'Username or Email'
    return isEmail(identifier) ? 'Email Address' : 'Username'
  }

  return (
    <Card className={className}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        <CardDescription>
          Enter your username or email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/15 border border-destructive text-destructive text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="identifier">{getIdentifierLabel()}</Label>
            <Input
              id="identifier"
              type="text"
              placeholder={getIdentifierPlaceholder()}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isLoading}
              required
            />
            {identifier && (
              <p className="text-sm text-muted-foreground">
                {isEmail(identifier) 
                  ? '✓ Looks like an email address' 
                  : '✓ Looks like a username'
                }
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>Test credentials:</p>
            <p><strong>Username:</strong> admin | <strong>Password:</strong> [check database]</p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 