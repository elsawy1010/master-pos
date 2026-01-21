import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import appCss from '../styles.css?url'

import '@/lib/i18n'
import { AuthProvider } from '@/lib/auth-context'
import { ToastProvider } from '@/components/ui/toast-context'
import { Provider } from '@/integrations/tanstack-query/root-provider'
import { ThemeProvider } from '@/lib/theme-context'
import { useState, useEffect } from 'react'

import type { QueryClient } from '@tanstack/react-query'

import type { TRPCRouter } from '@/integrations/trpc/router'
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'

interface MyRouterContext {
  queryClient: QueryClient

  trpc: TRPCOptionsProxy<TRPCRouter>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Orderix - Restaurant Management',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/logo.svg',
      },
    ],
  }),

  component: RootComponent,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Render minimal HTML structure during SSR
  if (!isMounted) {
    return (
      <html lang="en">
        <head>
          <HeadContent />
        </head>
        <body className="min-h-screen bg-slate-900" suppressHydrationWarning>
          <Scripts />
        </body>
      </html>
    )
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-white dark:bg-slate-900" suppressHydrationWarning>
        <ThemeProvider>
          <Provider queryClient={queryClient}>
            <AuthProvider>
              <ToastProvider>
                <Outlet />
              </ToastProvider>
            </AuthProvider>
          </Provider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
