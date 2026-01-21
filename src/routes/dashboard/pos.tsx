import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSocket } from '@/hooks/useSocket'
import { useToast } from '@/components/ui/toast-context'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Wallet,
  UtensilsCrossed,
  Package,
  X,
  Check,
  Loader2,
  MessageSquare,
  Send,
  Receipt,
  ChevronDown,
  XCircle,
} from 'lucide-react'
import { handlePrintReceipt, formatCurrency } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/dashboard/pos')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager', 'server', 'counter']}>
      <POSPage />
    </RoleGuard>
  ),
})

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image: string
  notes?: string
}

function POSPage() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { socket, connect } = useSocket()
  const { toast } = useToast()

  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in')
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [taxRate, setTaxRate] = useState(10)
  const [serviceCharge, setServiceCharge] = useState(0)
  // Discount state
  const [discountCode, setDiscountCode] = useState('')
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false)
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null)

  // Prevent unused variable warning
  useEffect(() => {
    if (appliedDiscount) {
      // logic if needed
    }
  }, [appliedDiscount])

  // Connect socket on mount and listen for events
  useEffect(() => {
    connect()
  }, [])

  // Clear activeOrderId when table changes to prevent using old order
  useEffect(() => {
    setActiveOrderId(null)
  }, [selectedTable])
  const [showTables, setShowTables] = useState(true)
  const [showMobileCart, setShowMobileCart] = useState(false)

  // Fetch categories from database
  const { data: categories = [] } = useQuery(trpc.categories.list.queryOptions())

  // Fetch products from database
  const { data: products = [], isLoading: productsLoading } = useQuery(
    trpc.products.listAvailable.queryOptions()
  )

  // Fetch all tables for POS (available + occupied)
  const { data: tables = [] } = useQuery(trpc.tables.getAllForPOS.queryOptions())

  // Fetch active order for selected table
  const { data: activeOrder, refetch: refetchActiveOrder } = useQuery({
    ...trpc.tables.getActiveOrder.queryOptions({ tableId: selectedTable || 0 }),
    enabled: !!selectedTable && orderType === 'dine_in',
  })

  // Fetch settings
  const { data: settingsData = [] } = useQuery(trpc.settings.list.queryOptions())

  useEffect(() => {
    if (settingsData.length > 0) {
      const getSetting = (key: string, fallback: number) => {
        const found = settingsData.find((s) => s.key === key)
        return found ? parseFloat(found.value || String(fallback)) : fallback
      }
      setTaxRate(getSetting('tax_rate', 10))
      setServiceCharge(getSetting('service_charge', 0))
    }
  }, [settingsData])

  // Reset discount when order changes (or better, fetch existing discount from order)
  useEffect(() => {
    if (activeOrder?.discountId) {
      // Logic to fetch discount details could go here, but for now we rely on order totals
      // Assuming activeOrder has discountAmount, we can infer some details or just show the amount
    } else {
      setAppliedDiscount(null)
      setDiscountCode('')
    }
  }, [activeOrder?.id, activeOrder?.discountId])

  // Set active order ID when table is selected and has an active order
  const currentActiveOrderId = activeOrder?.id || activeOrderId

  // Create order mutation
  const createOrderMutation = useMutation(
    trpc.orders.create.mutationOptions({
      onSuccess: (newOrder) => {
        setActiveOrderId(newOrder.id)
        return newOrder
      },
    })
  )

  // Add item mutation
  const addItemMutation = useMutation(
    trpc.orders.addItem.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['tables']] })
        queryClient.invalidateQueries({ queryKey: [['orders']] })
      },
    })
  )

  // Create payment mutation
  const createPaymentMutation = useMutation(
    trpc.payments.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['orders']] })
        queryClient.invalidateQueries({ queryKey: [['orders']] })
        queryClient.invalidateQueries({ queryKey: [['tables']] })
        queryClient.invalidateQueries({ queryKey: [['discounts']] })
        clearCart()
        setActiveOrderId(null)
        toast(t('payment_success'), 'success')
      },
    })
  )

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Cart functions
  const addToCart = (product: (typeof products)[0]) => {
    const cartContainer = document.getElementById('cart-container')
    if (cartContainer) {
      setTimeout(() => {
        cartContainer.scrollTo({ top: cartContainer.scrollHeight, behavior: 'smooth' })
      }, 300)
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prevCart,
        {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          image: product.emoji || '🍽️',
          notes: '',
        },
      ]
    })
  }

  const updateQuantity = (id: number, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (id: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id))
  }

  const updateNotes = (id: number, notes: string) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, notes } : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
    setShowPayment(false)
    setPaymentMethod(null)
  }

  const resetOrder = () => {
    clearCart()
    setSelectedTable(null)
    setActiveOrderId(null)
  }

  // Calculate totals for cart items
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )


  // Calculate totals including existing order items
  const existingOrderSubtotal = activeOrder?.items?.reduce(
    (sum, item) => sum + parseFloat(item.subtotal),
    0
  ) || 0

  const totalSubtotal = subtotal + existingOrderSubtotal

  // Discount Calculation logic 
  let discountAmount = 0
  if (activeOrder?.discountAmount) {
    discountAmount = parseFloat(activeOrder.discountAmount)
  } else if (appliedDiscount) {
    const value = parseFloat(appliedDiscount.value)
    if (appliedDiscount.type === 'percentage') {
      discountAmount = totalSubtotal * (value / 100)
    } else {
      discountAmount = value
    }
  }

  // Recalculate tax and service based on discounted amount (if that's the rule)
  // Assuming tax/service is on post-discount amount
  const taxableAmount = Math.max(0, totalSubtotal - discountAmount)

  // Use stored values for existing order if available AND no new items added causing recalc needs?
  // Actually, simpler to re-calculate everything based on rates if we are in "client" mode for the whole cart
  // But strictly, existing order parts might be fixed. 
  // Let's assume we re-calc for the view based on current rates for simplicity and consistency with backend `updateOrderTotals`

  const currentTax = taxableAmount * (taxRate / 100)
  const currentService = taxableAmount * (serviceCharge / 100)

  // If activeOrder has fixed tax/service amounts, we might prefer them, but if we apply new discount, those change.
  // So using dynamic calculation is safer for the "preview".

  const grandTotal = taxableAmount + currentTax + currentService

  // Logic to handle discount application

  const applyDiscountMutation = useMutation(
    trpc.orders.applyDiscount.mutationOptions({
      onSuccess: () => {
        refetchActiveOrder()
        setDiscountCode('')
        toast(t('discount_applied'), 'success')
      },
      onError: (err) => {
        toast(err.message, 'error')
      }
    })
  )

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return

    setIsApplyingDiscount(true)
    try {
      const discount = await queryClient.fetchQuery(
        trpc.discounts.validate.queryOptions({ code: discountCode })
      )

      if (discount) {
        if (currentActiveOrderId) {
          // If order exists, apply immediately on server
          await applyDiscountMutation.mutateAsync({
            orderId: currentActiveOrderId,
            discountId: discount.id
          })
          setAppliedDiscount(discount)
        } else {
          // Client side only
          setAppliedDiscount(discount)
          toast(t('discount_applied'), 'success')
        }
      }
    } catch (error) {
      console.error(error)
      toast((error as Error).message, 'error')
    } finally {
      setIsApplyingDiscount(false)
    }
  }

  const removeDiscountMutation = useMutation(
    trpc.orders.removeDiscount.mutationOptions({
      onSuccess: () => {
        refetchActiveOrder()
        setAppliedDiscount(null)
      }
    })
  )

  const handleRemoveDiscount = async () => {
    if (activeOrder?.discountId) {
      await removeDiscountMutation.mutateAsync({ orderId: activeOrder.id })
    } else {
      setAppliedDiscount(null)
      setDiscountCode('')
    }
  }

  // Send to kitchen - creates order or adds to existing order
  const handleSendToKitchen = async () => {
    if (cart.length === 0) return
    if (orderType === 'dine_in' && !selectedTable) {
      toast(t('select_table_error'), 'error')
      return
    }

    try {
      let orderId = currentActiveOrderId

      // If no active order exists for this table, create a new one
      if (!orderId) {
        const newOrder = await createOrderMutation.mutateAsync({
          orderType,
          tableId: orderType === 'dine_in' ? selectedTable || undefined : undefined,
          serverId: user?.id,
        })
        orderId = newOrder.id
      }

      // Add all cart items to the order
      for (const item of cart) {
        await addItemMutation.mutateAsync({
          orderId: orderId,
          productId: item.id,
          quantity: item.quantity,
          notes: item.notes || undefined,
          serverId: user?.id,
        })
      }

      // Apply discount if exists locally
      if (appliedDiscount && !activeOrder?.discountId) {
        await applyDiscountMutation.mutateAsync({
          orderId: orderId,
          discountId: appliedDiscount.id
        })
      }

      // Refresh active order data
      await refetchActiveOrder()
      socket?.emit('orderToKitchen')
      // Clear cart but keep table selected for adding more items
      setCart([])
      setAppliedDiscount(null) // Clear local discount as it's now saved
      toast(t('order_sent_success'), 'success')
    } catch (error) {
      toast(t('error_sending', { error: (error as Error).message }), 'error')
    }
  }

  const handlePayNow = () => {
    if (orderType === 'dine_in' && !selectedTable) {
      toast(t('select_table_generic_error'), 'error')
      return
    }
    if (!currentActiveOrderId && cart.length === 0) {
      toast(t('no_items_pay_error'), 'error')
      return
    }
    setShowPayment(true)
  }

  const handleProcessPayment = async () => {
    if (!paymentMethod) {
      toast(t('select_payment_error'), 'error')
      return
    }

    try {
      let orderId = currentActiveOrderId

      // If there are items in cart but no active order, create one first
      if (!orderId && cart.length > 0) {
        const newOrder = await createOrderMutation.mutateAsync({
          orderType,
          tableId: orderType === 'dine_in' ? selectedTable || undefined : undefined,
          serverId: user?.id,
        })
        orderId = newOrder.id

        // Add cart items
        for (const item of cart) {
          await addItemMutation.mutateAsync({
            orderId: orderId,
            productId: item.id,
            quantity: item.quantity,
            notes: item.notes || undefined,
            serverId: user?.id,
          })
        }
      } else if (orderId && cart.length > 0) {
        // Add any remaining cart items to existing order
        for (const item of cart) {
          await addItemMutation.mutateAsync({
            orderId: orderId,
            productId: item.id,
            quantity: item.quantity,
            notes: item.notes || undefined,
            serverId: user?.id,
          })
        }
      }

      if (!orderId) {
        toast(t('no_order_pay_error'), 'error')
        return
      }

      handlePrintReceipt(orderId);
      // Process payment
      await createPaymentMutation.mutateAsync({
        orderId: orderId,
        amount: grandTotal.toFixed(2),
        method: paymentMethod as 'cash' | 'card' | 'digital_wallet',
        processedBy: user?.id || '',
      })

      resetOrder()
    } catch (error) {
      toast(t('payment_error', { error: (error as Error).message }), 'error')
    }
  }

  const getTableNumber = (tableId: number) => {
    const table = tables.find((t) => t.id === tableId)
    return table ? table.tableNumber : 'N/A'
  }

  // Listen for order item status changes
  useEffect(() => {
    if (!socket) return

    const handleStatusChange = () => {
      setTimeout(() => {
        refetchActiveOrder()
      }, 1000)
    }

    socket.on('orderItemStatusChanged', handleStatusChange)

    return () => {
      socket.off('orderItemStatusChanged', handleStatusChange)
    }
  }, [socket, refetchActiveOrder])

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-8rem)] flex gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search and Order Type */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder={t('search_products')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            {(['dine_in', 'takeaway', 'delivery'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOrderType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${orderType === type
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-200 dark:border-transparent shadow-sm'
                  }`}
              >
                {t(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Table Selection for Dine In */}
        {orderType === 'dine_in' && (
          <div className="mb-4 bg-white dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
            <button
              type="button"
              onClick={() => setShowTables(!showTables)}
              className="w-full flex items-center justify-between p-3 text-left"
            >
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                {t('select_table')}
                {selectedTable && activeOrder && (
                  <span className="text-cyan-400">
                    ({t('table_active_order', { number: getTableNumber(selectedTable) })})
                  </span>
                )}
                {selectedTable && !activeOrder && (
                  <span className="text-green-400">
                    ({t('table_selected', { number: getTableNumber(selectedTable) })})
                  </span>
                )}
              </h3>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${showTables ? 'rotate-180' : ''}`}
              />
            </button>
            {showTables && (
              <div className="px-3 pb-3">
                <div className="flex flex-wrap gap-2">
                  {tables.map((table) => {
                    const isOccupied = table.status === 'occupied'
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => setSelectedTable(table.id)}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors relative ${selectedTable === table.id
                          ? 'bg-cyan-500 text-white'
                          : isOccupied
                            ? 'bg-amber-100 dark:bg-amber-600/30 text-amber-900 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-600/50 border border-amber-200 dark:border-amber-500/50'
                            : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-200 dark:border-transparent shadow-sm'
                          }`}
                      >
                        <UtensilsCrossed className="w-4 h-4 inline-block mr-1" />
                        {table.tableNumber}
                        {isOccupied && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${selectedCategory === 'all'
              ? 'bg-cyan-500 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-transparent shadow-sm'
              }`}
          >
            <Package className="w-4 h-4" />
            {t('all_category')}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${selectedCategory === category.id
                ? 'bg-cyan-500 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-transparent shadow-sm'
                }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 hover:border-cyan-500/50 hover:bg-gray-50 dark:hover:bg-slate-700/50 active:scale-95 transition-all text-left shadow-sm"
              >
                <div className="text-4xl mb-2">{product.emoji || '🍽️'}</div>
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {product.name}
                </h3>
                <p className="text-cyan-600 dark:text-cyan-400 font-bold">
                  {formatCurrency(parseFloat(String(product.price)), i18n.language)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className={`flex flex-col bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-lg lg:border lg:rounded-xl
        ${showMobileCart
          ? 'fixed inset-0 z-50 w-full h-full'
          : 'hidden lg:flex lg:w-96 lg:static lg:h-auto lg:border'
        }
      `}>
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <button
                onClick={() => setShowMobileCart(false)}
                className="lg:hidden p-1 -ml-1 mr-1 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
              <ShoppingCart className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
              {activeOrder ? t('add_to_order') : t('new_order')}
            </h2>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title={t('clear_cart')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              {(activeOrder || selectedTable) && (
                <button
                  type="button"
                  onClick={resetOrder}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title={t('start_new_order')}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          {selectedTable && orderType === 'dine_in' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('table_n', { number: getTableNumber(selectedTable) })} •{' '}
              {activeOrder ? (
                <span className="text-amber-400">{t('active_order_id', { id: activeOrder.orderNumber })}</span>
              ) : (
                t('new_order')
              )}
            </p>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar" id="cart-container">
          {/* Existing order items */}
          {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase mb-2">
                {t('already_ordered')}
              </h3>
              <div className="space-y-2">
                {activeOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-gray-100 dark:bg-slate-700/30 rounded-lg p-2 border border-gray-200 dark:border-slate-600/50"
                  >
                    <span className="text-xl">{item.productEmoji || '🍽️'}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm text-gray-700 dark:text-gray-300 truncate flex items-center gap-1.5">
                        {item.productName}
                        <span
                          className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${item.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : item.status === 'preparing'
                              ? 'bg-orange-500/20 text-orange-400'
                              : item.status === 'ready'
                                ? 'bg-green-500/20 text-green-400'
                                : item.status === 'served'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : item.status === 'cancelled'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-gray-500/20 text-gray-400'
                            }`}
                          title={t(`status_${item.status}` as any)}
                        >
                          {item.status === 'pending' && '⏳'}
                          {item.status === 'preparing' && '🔥'}
                          {item.status === 'ready' && '✓'}
                          {item.status === 'served' && '✓'}
                          {item.status === 'cancelled' && '✕'}
                          {item.status === 'completed' && '✓'}
                        </span>
                      </h4>
                      {item.notes && (
                        <p className="text-xs text-gray-500 truncate">
                          📝 {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">×{item.quantity}</span>
                      <span className="text-sm text-cyan-600 dark:text-cyan-400/70">
                        {formatCurrency(parseFloat(String(item.subtotal)), i18n.language)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-600/50 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('ordered_subtotal')}</span>
                  <span>{formatCurrency(existingOrderSubtotal, i18n.language)}</span>
                </div>
              </div>
            </div>
          )}

          {/* New items to add */}
          {cart.length > 0 && (
            <div>
              {activeOrder && (
                <h3 className="text-xs font-medium text-cyan-600 dark:text-cyan-400 uppercase mb-2">
                  {t('new_items')}
                </h3>
              )}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-transparent"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.image}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.name}
                        </h4>
                        <p className="text-sm text-cyan-600 dark:text-cyan-400">
                          {formatCurrency(item.price, i18n.language)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-500 active:scale-95 transition-transform flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center text-gray-900 dark:text-white font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-500 active:scale-95 transition-transform flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="w-9 h-9 rounded-full text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 active:scale-95 transition-transform flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Notes input for kitchen */}
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder={t('add_note_kitchen')}
                        value={item.notes || ''}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="flex-1 bg-gray-100 dark:bg-slate-600/50 border-0 rounded px-2 py-1 text-xs text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {cart.length === 0 && !activeOrder && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
              <p>{t('cart_empty')}</p>
              <p className="text-sm">{t('add_items_start')}</p>
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 space-y-3">
          <div className="space-y-2 text-sm">
            {cart.length > 0 && (
              <>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('subtotal')}</span>
                  <span>{formatCurrency(totalSubtotal, i18n.language)}</span>
                </div>

                {/* Discount Section */}
                {(activeOrder || cart.length > 0) && (
                  <div className="py-2 border-b border-gray-200 dark:border-slate-700/50">
                    {(discountAmount > 0 || appliedDiscount) ? (
                      <div className="flex justify-between text-green-600 dark:text-green-500 mb-2">
                        <span className="font-semibold">{t('discount')}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">-{formatCurrency(discountAmount, i18n.language)}</span>
                          <button
                            onClick={handleRemoveDiscount}
                            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder={t('enter_discount_code')}
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value)}
                          className="h-8 text-sm bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-gray-200 dark:border-slate-700"
                          onClick={handleApplyDiscount}
                          disabled={isApplyingDiscount || !discountCode}
                        >
                          {isApplyingDiscount ? <Loader2 className="w-3 h-3 animate-spin" /> : t('apply')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Net Subtotal (Total after discount) */}
                {(discountAmount > 0) && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400 font-medium">
                    <span>{t('total_after_discount')}</span>
                    <span>{formatCurrency(taxableAmount, i18n.language)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-400">
                  <span>{t('tax')} ({taxRate}%)</span>
                  <span>{formatCurrency(currentTax, i18n.language)}</span>
                </div>
                {serviceCharge > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>{t('service_charge')} ({serviceCharge}%)</span>
                    <span>{formatCurrency(currentService, i18n.language)}</span>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between text-gray-900 dark:text-white font-bold text-lg pt-2 border-t border-gray-200 dark:border-slate-700">
              <span>{t('total')}</span>
              <span>{formatCurrency(grandTotal, i18n.language)}</span>
            </div>
          </div>

          {!showPayment ? (
            <div className="space-y-2">
              {/* Send to Kitchen button */}
              <Button
                onClick={handleSendToKitchen}
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-3"
              >
                <Send className="w-4 h-4 mr-2" />
                {t('send_to_kitchen')}
              </Button>

              {/* Pay Now button - only show when there's something to pay */}
              {(activeOrder || cart.length > 0) && (
                <Button
                  onClick={handlePayNow}
                  variant="outline"
                  className="w-full border-green-500/50 text-green-400 hover:bg-green-500/20 hover:text-green-300 font-semibold py-3"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  {t('pay_now')} {formatCurrency(grandTotal, i18n.language)}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400">
                {t('select_payment_method')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', icon: Banknote, label: 'cash' },
                  { id: 'card', icon: CreditCard, label: 'card' },
                  { id: 'digital', icon: Wallet, label: 'digital' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${paymentMethod === method.id
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="text-xs">{t(method.label)}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPayment(false)}
                  className="flex-1 border-slate-600"
                >
                  {t('back')}
                </Button>
                <Button
                  onClick={handleProcessPayment}
                  disabled={!paymentMethod}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {t('pay')} {formatCurrency(grandTotal, i18n.language)}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Toggle FAB */}
      <button
        onClick={() => setShowMobileCart(true)}
        className="fixed bottom-6 right-6 lg:hidden w-14 h-14 bg-cyan-500 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-cyan-600 transition-transform active:scale-95 z-40"
      >
        <ShoppingCart className="w-6 h-6" />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        )}
      </button>
    </div>
  )
}
