"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { DynamicLogo } from '@/components/ui/dynamic-logo'
import { createClient } from '@/lib/supabase/client'
import isEmail from 'validator/lib/isEmail'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setError('')
    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      // Determine if identifier is email or username
      const isEmailIdentifier = isEmail(values.identifier)
      let email = values.identifier
      
      if (!isEmailIdentifier) {
        // Look up email by username directly from database
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('username', values.identifier)
          .single()
        
        if (!userData?.email) {
          throw new Error('Invalid username or password')
        }
        
        email = userData.email
      }
      
      // Sign in with Supabase client-side
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      })
      
      if (error) {
        throw new Error('Invalid username or password')
      }
      
      // Wait a moment for session to be set, then redirect
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 200)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25"></div>
      
      <div className="w-full max-w-lg relative z-10">
        {/* Logo and Branding */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 flex items-center justify-center">
              <DynamicLogo size="xxl" className="flex-col items-center scale-150" forceTheme="light" />
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">LPG Cylinder Testing & Certification System</p>
        </div>

        <Card className="shadow-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl">
          <CardHeader className="space-y-1 text-center pb-8">
            <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">Welcome Back</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300 text-base">
              Sign in to access your test reports
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="identifier" className="text-slate-700 dark:text-slate-200 font-medium text-sm">
                        Username or Email
                      </Label>
                      <FormControl>
                        <Input
                          id="identifier"
                          placeholder="Enter your username or email"
                          {...field}
                          className="h-12 border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-blue-500/20 text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="password" className="text-slate-700 dark:text-slate-200 font-medium text-sm">
                        Password
                      </Label>
                      <FormControl>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            {...field}
                            className="h-12 border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-blue-500/20 pr-12 text-base"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 bg-bwa-secondary/80 hover:bg-bwa-secondary text-white font-medium text-base transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Need help? Contact your system administrator
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; 2024 BWA Gas. All rights reserved.</p>
          <p className="mt-1">Secure LPG Testing & Certification System</p>
        </div>
      </div>
    </div>
  )
} 