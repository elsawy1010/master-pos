import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { signIn } from '@/lib/auth-client'
import { demoAccounts, getDefaultRouteForRole, getRoleDisplayName } from '@/lib/auth'
import type { UserRole } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  UtensilsCrossed,
  Lock,
  User,
  AlertCircle,
  Loader2,
  ChefHat,
  CreditCard,
  Users,
  LayoutDashboard,
} from 'lucide-react'
import { LanguageToggle } from '@/components/language-toggle'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  // Prevent hydration mismatch by only rendering on client
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // If already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate({ to: getDefaultRouteForRole(user.role) })
    }
  }, [isAuthenticated, user, navigate])

  if (!isMounted) {
    return null
  }

  if (isAuthenticated && user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error: signInError } = await signIn.username({
        username,
        password,
      })

      if (signInError) {
        setError(signInError.message || 'Invalid credentials')
        setIsLoading(false)
        return
      }

      if (data?.user) {
        // Session is automatically managed by better-auth
        // Auth context will pick up the session change
        const role = ((data.user as any).role as UserRole) || 'server'
        navigate({ to: getDefaultRouteForRole(role) })
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const demoAccountsWithIcons = [
    { ...demoAccounts[0], icon: LayoutDashboard },
    { ...demoAccounts[1], icon: Users },
    { ...demoAccounts[2], icon: UtensilsCrossed },
    { ...demoAccounts[3], icon: CreditCard },
    { ...demoAccounts[4], icon: ChefHat },
  ]

  const fillDemoAccount = (demoUsername: string) => {
    setUsername(demoUsername)
    setPassword('admin123')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8">
        {/* Login Form */}
        <div className="flex-1 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 dark:border-slate-700/50 shadow-xl dark:shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mb-4">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('app_name')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Restaurant Management System</p>
          </div>
          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
                {t('username')}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                {t('password')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/25"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('signing_in')}
                </span>
              ) : (
                t('sign_in')
              )}
            </Button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="flex-1 bg-white/80 dark:bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 dark:border-slate-700/50 shadow-xl dark:shadow-none">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Demo Accounts
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            Click any account below to auto-fill credentials
          </p>

          <div className="space-y-3">
            {demoAccountsWithIcons.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => fillDemoAccount(account.username)}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600/50 hover:border-cyan-500/50 transition-all duration-200 group"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-200 dark:bg-gradient-to-br dark:from-slate-600 dark:to-slate-700 group-hover:from-cyan-600 group-hover:to-blue-700 transition-all duration-200">
                  <account.icon className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {account.username}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-600 text-gray-300">
                      {getRoleDisplayName(account.role)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{account.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <p className="text-cyan-600 dark:text-cyan-400 text-sm">
              <strong>All demo passwords:</strong> admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
