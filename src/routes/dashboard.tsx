import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth-context'
import { getRoleDisplayName, getRoleColor } from '@/lib/auth'
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  ClipboardList,
  UtensilsCrossed,
  Users,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  PanelLeftClose,
  PanelLeft,
  Percent,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [dateString, setDateString] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [isLoading, isAuthenticated, navigate])

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
    // Set date string only on client to avoid hydration mismatch
    setDateString(new Date().toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }))
  }, [i18n.language])

  if (!isMounted) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  // Navigation items based on role
  const getNavItems = () => {
    const allItems = [
      {
        to: '/dashboard',
        icon: LayoutDashboard,
        label: t('dashboard'),
        roles: ['admin', 'manager'],
      },
      {
        to: '/dashboard/pos',
        icon: ShoppingCart,
        label: t('pos'),
        roles: ['admin', 'manager', 'server', 'counter'],
      },
      {
        to: '/dashboard/kitchen',
        icon: ChefHat,
        label: t('kitchen'),
        roles: ['admin', 'manager', 'kitchen'],
      },
      {
        to: '/dashboard/orders',
        icon: ClipboardList,
        label: t('orders'),
        roles: ['admin', 'manager', 'server', 'counter'],
      },
      {
        to: '/dashboard/tables',
        icon: UtensilsCrossed,
        label: t('tables'),
        roles: ['admin', 'manager', 'server'],
      },
      {
        to: '/dashboard/products',
        icon: Store,
        label: t('products'),
        roles: ['admin', 'manager'],
      },
      {
        to: '/dashboard/staff',
        icon: Users,
        label: t('staff'),
        roles: ['admin'],
      },
      {
        to: '/dashboard/reports',
        icon: FileText,
        label: t('reports'),
        roles: ['admin', 'manager'],
      },
      {
        to: '/dashboard/payments',
        icon: CreditCard,
        label: t('payments'),
        roles: ['admin', 'manager', 'counter'],
      },
      {
        to: '/dashboard/discounts',
        icon: Percent,
        label: t('discounts'),
        roles: ['admin', 'manager'],
      },
      {
        to: '/dashboard/settings',
        icon: Settings,
        label: t('settings'),
        roles: ['admin'],
      },
    ]

    return allItems.filter((item) => item.roles.includes(user.role))
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        suppressHydrationWarning
        className={`fixed inset-y-0 z-50 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 transform transition-all duration-200 ease-in-out h-screen shadow-lg dark:shadow-none ${i18n.language === 'ar' ? 'right-0 border-l' : 'left-0 border-r'
          } ${sidebarCollapsed ? 'lg:w-20' : 'w-64'
          } ${sidebarOpen ? 'translate-x-0' : i18n.language === 'ar' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('app_name')}</h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('restaurant_management')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 space-y-1 overflow-y-auto ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === '/dashboard' }}
                className={`flex items-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors ${sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
                  }`}
                activeProps={{
                  className: `flex items-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 ${sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
                    }`,
                }}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* User info and logout */}
          <div className={`border-t border-gray-200 dark:border-slate-700 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            {/* Desktop collapse button */}
            <button
              type="button"
              className="hidden lg:flex w-full items-center justify-center p-2 mb-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? t('expand_sidebar') : t('collapse_sidebar')}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-md dark:shadow-none">
                  {user.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.fullName}
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs text-white ${getRoleColor(user.role)}`}
                  >
                    {getRoleDisplayName(user.role)}
                  </span>
                </div>
              </div>
            )}

            {sidebarCollapsed ? (
              <button
                type="button"
                className="w-full flex items-center justify-center p-3 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                onClick={handleLogout}
                title={t('logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2 bg-slate-700/50 border-slate-600 text-gray-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                {t('logout')}
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        suppressHydrationWarning
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${i18n.language === 'ar'
          ? (sidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64')
          : (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64')
          }`}>
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center px-4 lg:px-6 shadow-sm dark:shadow-none">
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <div className="flex-1 flex items-center justify-between ml-4 lg:ml-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('welcome_message', { name: user.fullName.split(' ')[0] })}
            </h2>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageToggle />
              <span className="text-sm text-gray-600 dark:text-gray-400" suppressHydrationWarning>
                {dateString}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-gray-50 dark:bg-slate-900">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
