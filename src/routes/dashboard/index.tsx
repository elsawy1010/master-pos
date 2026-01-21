import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  UtensilsCrossed,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Loader2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
})

function DashboardIndex() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const trpc = useTRPC()

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch dashboard stats from database
  const { data: dashboardStats, isLoading: statsLoading } = useQuery(
    trpc.reports.getDashboardStats.queryOptions()
  )

  // Fetch comparison stats for today (used to compute change % and trend)
  // Calculate date only after mount to avoid hydration mismatch
  const today = isMounted ? new Date() : new Date('2024-01-01')
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`

  const { data: comparison } = useQuery(
    trpc.reports.getStatsWithComparison.queryOptions({ startDate: todayStr, endDate: todayStr })
  )

  // Fetch active orders for recent orders
  const { data: activeOrders, isLoading: ordersLoading } = useQuery(
    trpc.orders.listActive.queryOptions()
  )

  // Fetch top products
  const { data: topProductsData, isLoading: productsLoading } = useQuery(
    trpc.reports.getTopProducts.queryOptions({ limit: 5 })
  )

  const isLoading = statsLoading || ordersLoading || productsLoading

  if (!isMounted) {
    return null
  }

  const locale = i18n.language

  // Build stats array from database data
  const stats: Array<{
    title: string
    value: string
    change: string
    trend: 'up' | 'down' | 'neutral'
    icon: React.ComponentType<{ className?: string }>
    color: string
  }> = [
      {
        title: t('todays_revenue'),
        value: dashboardStats ? formatCurrency(dashboardStats.todaysRevenue, locale) : formatCurrency(0, locale),
        change: comparison ? `${comparison.revenueChange > 0 ? '+' : ''}${Math.round(comparison.revenueChange)}%` : '+0%',
        trend: comparison ? (comparison.revenueChange > 0 ? 'up' : comparison.revenueChange < 0 ? 'down' : 'neutral') : 'neutral',
        icon: DollarSign,
        color: 'from-green-500 to-emerald-600',
      },
      {
        title: t('total_orders'),
        value: dashboardStats?.todaysOrderCount?.toString() || '0',
        change: comparison ? `${comparison.ordersChange > 0 ? '+' : ''}${Math.round(comparison.ordersChange)}%` : '+0%',
        trend: comparison ? (comparison.ordersChange > 0 ? 'up' : comparison.ordersChange < 0 ? 'down' : 'neutral') : 'neutral',
        icon: ShoppingCart,
        color: 'from-blue-500 to-cyan-600',
      },
      {
        title: t('active_tables'),
        value: dashboardStats
          ? `${dashboardStats.occupiedTables}/${dashboardStats.totalTables}`
          : '0/0',
        change: dashboardStats
          ? `${Math.round((dashboardStats.occupiedTables / dashboardStats.totalTables) * 100)}%`
          : '0%',
        trend: 'neutral',
        icon: UtensilsCrossed,
        color: 'from-purple-500 to-indigo-600',
      },
      {
        title: t('avg_order_value'),
        value: dashboardStats ? formatCurrency(dashboardStats.avgOrderValue, locale) : formatCurrency(0, locale),
        change: comparison ? `${comparison.avgOrderChange > 0 ? '+' : ''}${Math.round(comparison.avgOrderChange)}%` : '+0%',
        trend: comparison ? (comparison.avgOrderChange > 0 ? 'up' : comparison.avgOrderChange < 0 ? 'down' : 'neutral') : 'neutral',
        icon: Clock,
        color: 'from-orange-500 to-amber-600',
      },
    ]

  // Format recent orders from database
  const recentOrders = (activeOrders || []).slice(0, 5).map((order) => {
    const createdAt = order.createdAt ? new Date(order.createdAt) : new Date()
    const minutesAgo = isMounted ? Math.floor((Date.now() - createdAt.getTime()) / 60000) : 0
    return {
      id: order.orderNumber,
      table: order.tableNumber || (order.orderType === 'takeaway' ? t('takeaway') : t('delivery')),
      items: 0, // Would need to count items from separate query
      total: formatCurrency(parseFloat(order.total || '0'), locale),
      status: order.status,
      time: minutesAgo < 1 ? t('just_now') : `${minutesAgo} ${t('min_ago')}`,
    }
  })

  // Format top products from database
  const topProducts = (topProductsData || []).map((product) => ({
    name: product.productName,
    orders: product.totalQuantity,
    revenue: formatCurrency(parseFloat(String(product.totalRevenue || 0)), locale),
  }))

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      preparing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      ready: 'bg-green-500/20 text-green-400 border-green-500/30',
      served: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    }
    return colors[status] || colors.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return AlertCircle
      case 'preparing':
        return Clock
      case 'ready':
      case 'served':
      case 'completed':
        return CheckCircle
      default:
        return AlertCircle
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  return (
    < div className="space-y-6" >
      {/* Page Header */}
      < div >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard_title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('dashboard_subtitle')}
        </p>
      </div >

      {/* Stats Grid */}
      < div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" >
        {
          stats.map((stat) => (
            <div
              key={stat.title}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1" suppressHydrationWarning>
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {stat.trend === 'up' && (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
                {stat.trend === 'down' && (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span
                  className={`text-sm ${stat.trend === 'up'
                    ? 'text-green-400'
                    : stat.trend === 'down'
                      ? 'text-red-400'
                      : 'text-gray-400'
                    }`}
                >
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500">{t('vs_yesterday')}</span>
              </div>
            </div>
          ))
        }
      </div >

      {/* Main Content Grid */}
      < div className="grid grid-cols-1 lg:grid-cols-3 gap-6" >
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
              {t('recent_orders')}
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {recentOrders.map((order) => {
              const StatusIcon = getStatusIcon(order.status)
              return (
                <div
                  key={order.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-slate-700 flex items-center justify-center border border-gray-200 dark:border-transparent">
                      <UtensilsCrossed className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{order.id}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {order.table} • {order.items} {t('items')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-900 dark:text-white font-medium" suppressHydrationWarning>{order.total}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${getStatusColor(order.status)}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {t(`status_${order.status}` as any) || order.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{order.time}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div >

        {/* Top Products */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
              {t('top_products')}
            </h2>
          </div>
          <div className="p-4 space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0
                    ? 'bg-yellow-500 text-black'
                    : index === 1
                      ? 'bg-gray-400 text-black'
                      : index === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {product.orders} {t('orders_suffix')}
                  </p>
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400" suppressHydrationWarning>
                  {product.revenue}
                </span>
              </div>
            ))}
          </div>
        </div >
      </div >

      {/* Quick Actions for Admin */}
      {
        user?.role === 'admin' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('quick_actions')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                type="button"
                className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-lg hover:from-gray-100 hover:to-gray-50 dark:hover:from-slate-800 dark:hover:to-slate-900 transition-all border border-gray-200 dark:border-slate-800 text-center shadow-sm"
              >
                <Link to="/dashboard/staff">
                  <Users className="w-8 h-8 text-cyan-500 dark:text-cyan-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('manage_staff')}</span>
                </Link>
              </button>
              <button
                type="button"
                className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-lg hover:from-gray-100 hover:to-gray-50 dark:hover:from-slate-800 dark:hover:to-slate-900 transition-all border border-gray-200 dark:border-slate-800 text-center shadow-sm"
              >
                <Link to="/dashboard/products">
                  <UtensilsCrossed className="w-8 h-8 text-cyan-500 dark:text-cyan-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('edit_menu')}</span>
                </Link>
              </button>
              <button
                type="button"
                className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-lg hover:from-gray-100 hover:to-gray-50 dark:hover:from-slate-800 dark:hover:to-slate-900 transition-all border border-gray-200 dark:border-slate-800 text-center shadow-sm"
              >
                <Link to="/dashboard/reports">
                  <BarChart3 className="w-8 h-8 text-cyan-500 dark:text-cyan-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('view_reports')}</span>
                </Link>
              </button>
              <button
                type="button"
                className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-lg hover:from-gray-100 hover:to-gray-50 dark:hover:from-slate-800 dark:hover:to-slate-900 transition-all border border-gray-200 dark:border-slate-800 text-center shadow-sm"
              >
                <Link to="/dashboard/payments">
                  <DollarSign className="w-8 h-8 text-cyan-500 dark:text-cyan-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('process_payment')}</span>
                </Link>
              </button>
            </div>
          </div>
        )
      }
    </div >
  )
}
