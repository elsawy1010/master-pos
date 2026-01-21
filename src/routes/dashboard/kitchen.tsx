import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/button'
import { useSocket } from '@/hooks/useSocket'
import {
  CheckCircle,
  Bell,
  Volume2,
  VolumeX,
  ChefHat,
  UtensilsCrossed,
  Timer,
  Check,
  Flame,
  Loader2,
  X,
  Coffee,
  Utensils,
  EllipsisVertical,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/dashboard/kitchen')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager', 'kitchen']}>
      <KitchenPage />
    </RoleGuard>
  ),
})

type ItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'

function KitchenPage() {
  const trpc = useTRPC()
  const { t } = useTranslation()
  const { socket, connect } = useSocket()
  const queryClient = useQueryClient()
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'food' | 'beverage'>('all')
  const [beverageCategoryIds, setBeverageCategoryIds] = useState<number[]>([4])
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Connect socket on mount
    connect()

    // Load saved beverage categories from localStorage on mount
    try {
      const raw = localStorage.getItem('beverageCategories')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) {
          setBeverageCategoryIds(parsed)
        }
      }
    } catch (e) {
      // ignore
    }
  }, [])
  // Fetch kitchen orders from database
  const { data: ordersData = [], refetch: refetchOrders, isLoading } = useQuery({
    ...trpc.orders.listForKitchen.queryOptions(),
  })

  // Fetch categories for selector
  const { data: categories = [] } = useQuery(trpc.categories.list.queryOptions())

  // Update item status mutation
  const updateItemStatusMutation = useMutation(
    trpc.orders.updateItemStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['orders']] })
      },
    })
  )

  // Remove (cancel) item mutation
  const removeItemMutation = useMutation(
    trpc.orders.removeItem.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['orders']] })
      },
    })
  )

  // Transform orders data
  const orders = ordersData.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    table: order.tableNumber || (order.orderType === 'takeaway' ? 'Takeaway' : 'Delivery'),
    orderType: order.orderType,
    createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
    serverName: order.serverName || 'Unknown',
    items: order.items?.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      status: item.status as ItemStatus,
      notes: item.notes || '',
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      serverName: item.serverName || order.serverName || 'Unknown',
      categoryId: item.category,
    })) || [],
    priority: 'normal' as 'normal' | 'high',
  }))

  const getTimeElapsed = (createdAt: Date) => {
    const minutes = Math.floor((Date.now() - createdAt.getTime()) / 60000)
    if (minutes < 1) return t('just_now')
    if (minutes === 1) return t('min_ago')
    return t('time_mins', { count: minutes })
  }

  // Get order status based on items
  const getOrderStatus = (items: { status: ItemStatus }[]) => {
    const activeItems = items.filter((i) => i.status !== 'cancelled')
    if (activeItems.length === 0) return 'completed' // All items cancelled
    const statuses = activeItems.map((i) => i.status)
    if (statuses.every((s) => s === 'served')) return 'completed'
    if (statuses.some((s) => s === 'ready') && statuses.some((s) => s === 'served')) return 'partial'
    if (statuses.every((s) => s === 'ready')) return 'ready'
    if (statuses.some((s) => s === 'preparing')) return 'preparing'
    return 'pending'
  }

  // Get progress percentage
  const getProgress = (items: { status: ItemStatus }[]) => {
    const activeItems = items.filter((i) => i.status !== 'cancelled')
    const completed = activeItems.filter((i) => i.status === 'ready' || i.status === 'served').length
    return activeItems.length > 0 ? Math.round((completed / activeItems.length) * 100) : 100
  }

  // Update item status
  const updateItemStatus = (itemId: number, newStatus: ItemStatus) => {
    updateItemStatusMutation.mutate({
      itemId,
      status: newStatus,
    })
    socket?.emit('orderItemStatusChanged', {
      itemId,
      status: newStatus,
    })
    // Play sound for ready items
    if (soundEnabled && newStatus === 'ready' && audioRef.current) {
      audioRef.current.play().catch(() => { })
    }
  }

  // Remove (cancel) item
  const removeItem = (itemId: number) => {
    removeItemMutation.mutate({ itemId })
  }

  // Mark all items in order as ready
  const markAllReady = (orderItems: { id: number; status: ItemStatus }[]) => {
    orderItems.forEach((item) => {
      if (item.status !== 'served' && item.status !== 'ready' && item.status !== 'cancelled') {
        updateItemStatusMutation.mutate({
          itemId: item.id,
          status: 'ready',
        })
      }
    })
  }

  useEffect(() => {
    if (!socket) return

    const handleNewOrder = () => {
      refetchOrders()
    }

    socket.on('orderToKitchen', handleNewOrder)

    return () => {
      socket.off('orderToKitchen', handleNewOrder)
    }
  }, [socket, refetchOrders])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'preparing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'ready':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'served':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  // Filter orders and items by category
  const filteredOrders = orders
    .map((order) => {
      // Filter items by category
      const filteredItems = categoryFilter === 'all'
        ? order.items
        : order.items.filter((item) => {
          if (categoryFilter === 'beverage') return beverageCategoryIds.includes(item.categoryId || 0)
          return !beverageCategoryIds.includes(item.categoryId || 0) // food = everything except beverage categories
        })
      return { ...order, items: filteredItems }
    })
    .filter((order) => {
      // Only show orders with items after category filter
      if (order.items.length === 0) return false
      if (filter === 'all') return true
      const orderStatus = getOrderStatus(order.items)
      return orderStatus === filter
    })

  // Count orders by status
  const orderCounts = {
    all: orders.length,
    pending: orders.filter((o) => getOrderStatus(o.items) === 'pending').length,
    preparing: orders.filter((o) => getOrderStatus(o.items) === 'preparing').length,
    ready: orders.filter((o) => getOrderStatus(o.items) === 'ready' || getOrderStatus(o.items) === 'partial').length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-8rem)] flex flex-col">
      {/* Audio element for notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleYQAAABLzu7Ri1L/AU3K6/CWZP4Eaq/i8K6G/QAAAGDJ5fK1gv0BZsPj9byL/AMATL/e96mB/AEA" type="audio/wav" />
      </audio>

      {/* Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ChefHat className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-500 dark:text-cyan-400" />
            {t('kitchen_display')}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('kitchen_subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors ${soundEnabled
              ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
              : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-transparent'
              }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
          {/* Food/Beverage Filter */}
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-1 overflow-x-auto max-w-full no-scrollbar">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${categoryFilter === 'all'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              {t('all_category')}
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('food')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${categoryFilter === 'food'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <Utensils className="w-4 h-4" />
              {t('food')}
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('beverage')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${categoryFilter === 'beverage'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <Coffee className="w-4 h-4" />
              {t('beverage')}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryPicker((s) => !s)}
                className="p-1 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                title={t('select_beverage_categories')}
              >
                <EllipsisVertical className="w-4 h-4" />
              </button>
              {showCategoryPicker && (
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 z-50 shadow-lg">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('select_beverage_categories')}</div>
                  <div className="max-h-40 overflow-y-auto">
                    {categories.map((cat: any) => (
                      <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 py-1">
                        <input
                          type="checkbox"
                          checked={beverageCategoryIds.includes(cat.id)}
                          onChange={() => {
                            setBeverageCategoryIds((prev) => {
                              const next = prev.includes(cat.id) ? prev.filter((i) => i !== cat.id) : [...prev, cat.id]
                              try { localStorage.setItem('beverageCategories', JSON.stringify(next)) } catch (e) { }
                              return next
                            })
                          }}
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCategoryPicker(false)}
                      className="px-3 py-1 rounded bg-gray-100 dark:bg-slate-700 text-sm text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600"
                    >
                      {t('done')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <Bell className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('active_orders_count', { count: orderCounts.pending + orderCounts.preparing })}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {[
          { key: 'all', label: t('all_orders'), count: orderCounts.all },
          { key: 'pending', label: t('status_pending'), count: orderCounts.pending },
          { key: 'preparing', label: t('status_preparing'), count: orderCounts.preparing },
          { key: 'ready', label: t('status_ready'), count: orderCounts.ready },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === tab.key
              ? 'bg-cyan-500 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-transparent'
              }`}
          >
            {tab.label}
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${filter === tab.key
                ? 'bg-white/20'
                : 'bg-gray-100 dark:bg-slate-700'
                }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const orderStatus = getOrderStatus(order.items)
            const progress = getProgress(order.items)
            const timeElapsed = getTimeElapsed(order.createdAt)
            const isUrgent = order.priority === 'high' || parseInt(timeElapsed) > 10

            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border ${isUrgent ? 'border-orange-500/50' : 'border-gray-200 dark:border-slate-700'
                  } overflow-hidden shadow-sm`}
              >
                {/* Order Header */}
                <div
                  className={`p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700 ${isUrgent ? 'bg-orange-50 dark:bg-orange-500/10' : ''
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white">{order.orderNumber}</h3>
                        {order.priority === 'high' && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {t('rush')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4" />
                        {order.table}
                        <span className="text-gray-400 dark:text-gray-600">•</span>
                        {t(order.orderType)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`flex items-center gap-1 text-sm ${isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'
                          }`}
                      >
                        <Timer className="w-4 h-4" />
                        {timeElapsed}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('percent_complete', { percent: progress })}
                      </div>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${progress === 100
                        ? 'bg-green-500'
                        : progress > 50
                          ? 'bg-cyan-500'
                          : 'bg-yellow-500'
                        }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-3 sm:p-4 space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${item.status === 'served' || item.status === 'cancelled'
                        ? 'bg-gray-50 dark:bg-slate-700/30'
                        : 'bg-gray-100 dark:bg-slate-700/50'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${item.status === 'cancelled' ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                            {item.quantity}x
                          </span>
                          <span
                            className={`text-sm ${item.status === 'served' || item.status === 'cancelled'
                              ? 'text-gray-500 line-through'
                              : 'text-gray-700 dark:text-gray-200'
                              }`}
                          >
                            {item.name}
                          </span>
                        </div>
                        {item.status !== 'cancelled' && item.status !== 'served' && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {item.serverName}
                          </p>
                        )}
                        {item.notes && (item.status !== 'cancelled' && item.status !== 'served') && (
                          <p className="text-xs text-amber-600 dark:text-yellow-400 mt-1">
                            📝 {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {t(`status_${item.status}` as any)}
                        </span>
                        {/* Cancel button for pending items */}
                        {item.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white"
                            title="Cancel item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {item.status !== 'served' && item.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() =>
                              updateItemStatus(
                                item.id,
                                item.status === 'pending'
                                  ? 'preparing'
                                  : item.status === 'preparing'
                                    ? 'ready'
                                    : 'served'
                              )
                            }
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${item.status === 'ready'
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : 'bg-gray-200 dark:bg-slate-600 hover:bg-cyan-500 dark:hover:bg-cyan-500 text-gray-500 dark:text-gray-300 hover:text-white'
                              }`}
                          >
                            {item.status === 'ready' ? (
                              <Check className="w-4 h-4" />
                            ) : item.status === 'preparing' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Flame className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Footer */}
                {orderStatus !== 'completed' && (
                  <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-slate-700">
                    <Button
                      onClick={() => markAllReady(order.items)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={order.items.every(
                        (i) => i.status === 'ready' || i.status === 'served'
                      )}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('mark_all_ready')}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500">
            <ChefHat className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg">{t('no_kitchen_orders')}</p>
            <p className="text-sm">{t('orders_appear_hint')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
