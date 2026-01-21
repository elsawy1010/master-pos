import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/integrations/trpc/react'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { handlePrintReceipt, formatCurrency, exportToCSV } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Printer,
  DollarSign,
  CreditCard,
  Banknote,
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Loader2,
} from 'lucide-react'

export const Route = createFileRoute('/dashboard/payments')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager', 'counter']}>
      <PaymentsPage />
    </RoleGuard>
  ),
})

type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled'
type PaymentMethod = 'cash' | 'card' | 'digital_wallet'

// Helper to calculate date ranges
function getDateRange(range: 'today' | 'week' | 'month' | 'year') {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  switch (range) {
    case 'today':
      break
    case 'week':
      start.setDate(start.getDate() - 6)
      break
    case 'month':
      start.setDate(start.getDate() - 29)
      break
    case 'year':
      start.setFullYear(start.getFullYear() - 1)
      start.setDate(start.getDate() + 1)
      break
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

function PaymentsPage() {
  const trpc = useTRPC()
  const { t, i18n } = useTranslation()
  const [isMounted, setIsMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('today')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')

  // Set dates only on client to prevent hydration mismatch
  useEffect(() => {
    const now = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    setCustomStart(weekAgo.toISOString().split('T')[0])
    setCustomEnd(now.toISOString().split('T')[0])
    setIsMounted(true)
  }, [])

  // Calculate date range based on selection
  const { startDate, endDate } = useMemo(() => {
    if (!isMounted) return { startDate: '', endDate: '' }
    if (dateRange === 'custom') {
      return { startDate: customStart, endDate: customEnd }
    }
    return getDateRange(dateRange)
  }, [dateRange, customStart, customEnd, isMounted])



  // Fetch payments from database with date filter
  const { data: payments = [], isLoading } = useQuery({
    ...trpc.payments.list.queryOptions({ startDate, endDate }),
    enabled: isMounted,
  })

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch =
        payment.paymentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.processedByName?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
      const matchesMethod = methodFilter === 'all' || payment.method === methodFilter
      return matchesSearch && matchesStatus && matchesMethod
    })
  }, [payments, searchQuery, statusFilter, methodFilter])

  // Calculate totals
  const totals = useMemo(() => ({
    paid: payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0),
    pending: payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0),
    refunded: payments
      .filter((p) => p.status === 'refunded')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0),
  }), [payments])

  // Get method icon
  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return Banknote
      case 'card':
        return CreditCard
      case 'digital_wallet':
        return Wallet
    }
  }

  // Get status styling
  const getStatusStyle = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle }
      case 'pending':
        return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock }
      case 'refunded':
        return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: RefreshCw }
      case 'cancelled':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle }
    }
  }

  // Format time
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    const minutes = Math.floor((Date.now() - d.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return d.toLocaleDateString()
  }


  if (!isMounted) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('payments_title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('payments_subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-1 shadow-sm">
            {(['today', 'week', 'month', 'year', 'custom'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${dateRange === range
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {t(`date_${range}`)}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={customEnd}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm"
              />
              <span className="text-gray-600 dark:text-gray-400">{t('date_to')}</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={customStart}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm"
              />
            </div>
          )}
          <Button
            variant="outline"
            className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
            onClick={() => {
              if (filteredPayments.length > 0) {
                const translatedData = filteredPayments.map((payment) => ({
                  [t('export_payment_id')]: payment.paymentNumber,
                  [t('export_order_number')]: payment.orderNumber || `#${payment.orderId}`,
                  [t('export_amount')]: payment.amount,
                  [t('export_method')]: t(`method_${payment.method}` as any),
                  [t('export_status')]: t(`payment_status_${payment.status}` as any),
                  [t('export_processed_by')]: payment.processedByName || t('unknown'),
                  [t('export_time')]: new Date(payment.createdAt).toLocaleString(i18n.language)
                }));
                exportToCSV(translatedData, `payments_report_${startDate}_${endDate}`)
              } else {
                alert(t('no_payments_found')) // Reusing existing key or similar
              }
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-green-500/30 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('total_paid')}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totals.paid, i18n.language)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-yellow-500/30 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('pending')}</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {formatCurrency(totals.pending, i18n.language)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-blue-500/30 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('refunded')}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(totals.refunded, i18n.language)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
          <Input
            placeholder={t('search_payments_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-gray-300 shadow-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="all">{t('all_status')}</option>
            <option value="paid">{t('payment_status_paid')}</option>
            <option value="pending">{t('payment_status_pending')}</option>
            <option value="refunded">{t('payment_status_refunded')}</option>
            <option value="cancelled">{t('payment_status_cancelled')}</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | 'all')}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-gray-300 shadow-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="all">{t('all_methods')}</option>
            <option value="cash">{t('method_cash')}</option>
            <option value="card">{t('method_card')}</option>
            <option value="digital_wallet">{t('method_digital_wallet')}</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('th_payment_id')}
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('th_order')}
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('th_amount')}
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('th_method')}
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('th_status')}
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('th_processed_by')}
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('th_time')}
                </th>
                <th className="text-right p-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('th_actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredPayments.map((payment) => {
                const statusStyle = getStatusStyle(payment.status)
                const StatusIcon = statusStyle.icon
                const MethodIcon = getMethodIcon(payment.method)

                return (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-medium text-gray-900 dark:text-white">{payment.paymentNumber}</span>
                      {payment.transactionId && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                          {payment.transactionId}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-cyan-600 dark:text-cyan-400">{payment.orderNumber || `#${payment.orderId}`}</td>
                    <td className="p-4">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(parseFloat(payment.amount || '0'), i18n.language)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <MethodIcon className="w-4 h-4" />
                        <span className="text-sm capitalize">
                          {payment.method.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${statusStyle.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{payment.processedByName || t('unknown')}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">
                      {payment.createdAt ? formatTime(payment.createdAt) : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(payment.orderId)}
                          className="p-2 rounded-lg text-gray-400 hover:text-cyan-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-500">
              <DollarSign className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg">{t('no_payments_found')}</p>
              <p className="text-sm">{t('adjust_filters_hint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
