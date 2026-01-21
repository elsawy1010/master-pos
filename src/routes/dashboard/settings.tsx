import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '@/integrations/trpc/react'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import {
  Store,
  DollarSign,
  Receipt,
  Bell,
  Save,
  RotateCcw,
  Loader2,
} from 'lucide-react'

export const Route = createFileRoute('/dashboard/settings')({
  component: () => (
    <RoleGuard allowedRoles={['admin']}>
      <SettingsPage />
    </RoleGuard>
  ),
})

// Default settings
const defaultSettings = {
  restaurant_name: 'TanStack Restaurant',
  address: '123 Main Street, City, Country',
  phone: '+1 234 567 8900',
  email: 'contact@restaurant.com',
  currency: 'EGP',
  tax_rate: '10',
  service_charge: '0',
  receipt_header: 'Thank you for dining with us!',
  receipt_footer: 'Please visit us again!',
  show_logo: 'true',
  order_notifications: 'true',
  kitchen_alerts: 'true',
  sound_enabled: 'true',
}

import { useToast } from '@/components/ui/toast-context'

function SettingsPage() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { toast } = useToast()

  // Fetch settings from database
  const { data: settingsData = [], isLoading } = useQuery(trpc.settings.list.queryOptions())

  // Local state for form
  const [restaurantName, setRestaurantName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [currency, setCurrency] = useState('EGP')
  const [taxRate, setTaxRate] = useState(10)
  const [serviceCharge, setServiceCharge] = useState(0)
  const [receiptHeader, setReceiptHeader] = useState('')
  const [receiptFooter, setReceiptFooter] = useState('')
  const [showLogo, setShowLogo] = useState(true)
  const [orderNotifications, setOrderNotifications] = useState(true)
  const [kitchenAlerts, setKitchenAlerts] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Update local state when settings are loaded
  useEffect(() => {
    if (settingsData.length > 0) {
      const getValue = (key: string) => {
        const setting = settingsData.find(s => s.key === key)
        return setting?.value || defaultSettings[key as keyof typeof defaultSettings] || ''
      }

      setRestaurantName(getValue('restaurant_name'))
      setAddress(getValue('address'))
      setPhone(getValue('phone'))
      setEmail(getValue('email'))
      setCurrency(getValue('currency'))
      setTaxRate(parseFloat(getValue('tax_rate')) || 10)
      setServiceCharge(parseFloat(getValue('service_charge')) || 0)
      setReceiptHeader(getValue('receipt_header'))
      setReceiptFooter(getValue('receipt_footer'))
      setShowLogo(getValue('show_logo') === 'true')
      setOrderNotifications(getValue('order_notifications') === 'true')
      setKitchenAlerts(getValue('kitchen_alerts') === 'true')
      setSoundEnabled(getValue('sound_enabled') === 'true')
    } else {
      // Set defaults if no settings exist
      setRestaurantName(defaultSettings.restaurant_name)
      setAddress(defaultSettings.address)
      setPhone(defaultSettings.phone)
      setEmail(defaultSettings.email)
      setCurrency(defaultSettings.currency)
      setTaxRate(parseFloat(defaultSettings.tax_rate))
      setServiceCharge(parseFloat(defaultSettings.service_charge))
      setReceiptHeader(defaultSettings.receipt_header)
      setReceiptFooter(defaultSettings.receipt_footer)
      setShowLogo(defaultSettings.show_logo === 'true')
      setOrderNotifications(defaultSettings.order_notifications === 'true')
      setKitchenAlerts(defaultSettings.kitchen_alerts === 'true')
      setSoundEnabled(defaultSettings.sound_enabled === 'true')
    }
  }, [settingsData])

  // Save mutation
  const updateMutation = useMutation(
    trpc.settings.updateMultiple.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.settings.list.queryKey() })
        toast(t('settings_saved'), 'success')
      },
      onError: () => {
        toast(t('error_saving_settings'), 'error')
      }
    })
  )

  const handleSave = () => {
    updateMutation.mutate({
      settings: [
        { key: 'restaurant_name', value: restaurantName },
        { key: 'address', value: address },
        { key: 'phone', value: phone },
        { key: 'email', value: email },
        { key: 'currency', value: currency },
        { key: 'tax_rate', value: String(taxRate) },
        { key: 'service_charge', value: String(serviceCharge) },
        { key: 'receipt_header', value: receiptHeader },
        { key: 'receipt_footer', value: receiptFooter },
        { key: 'show_logo', value: String(showLogo) },
        { key: 'order_notifications', value: String(orderNotifications) },
        { key: 'kitchen_alerts', value: String(kitchenAlerts) },
        { key: 'sound_enabled', value: String(soundEnabled) },
      ]
    })
  }

  const handleReset = () => {
    if (confirm(t('reset_confirm'))) {
      setRestaurantName(defaultSettings.restaurant_name)
      setAddress(defaultSettings.address)
      setPhone(defaultSettings.phone)
      setEmail(defaultSettings.email)
      setCurrency(defaultSettings.currency)
      setTaxRate(parseFloat(defaultSettings.tax_rate))
      setServiceCharge(parseFloat(defaultSettings.service_charge))
      setReceiptHeader(defaultSettings.receipt_header)
      setReceiptFooter(defaultSettings.receipt_footer)
      setShowLogo(defaultSettings.show_logo === 'true')
      setOrderNotifications(defaultSettings.order_notifications === 'true')
      setKitchenAlerts(defaultSettings.kitchen_alerts === 'true')
      setSoundEnabled(defaultSettings.sound_enabled === 'true')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('settings_title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('settings_subtitle')}</p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('reset')}</span>
          </Button>
          <Button
            className="flex-1 sm:flex-none bg-cyan-500 hover:bg-cyan-600"
            onClick={handleSave}
          >
            <Save className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('save_changes')}</span>
          </Button>
        </div>
      </div>

      {/* Restaurant Information */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Store className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('restaurant_info')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('restaurant_info_desc')}</p>
          </div>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 gap-4 sm:gap-6">
          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('restaurant_name')}</Label>
            <Input
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('email_label')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('phone_label')}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('address')}</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
            />
          </div>
        </div>
      </div>

      {/* Financial Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-500 dark:text-green-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('financial_settings')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('financial_settings_desc')}</p>
          </div>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('currency')}</Label>
            <Input
              value="EGP (جنيه مصري)"
              readOnly
              className="mt-1 bg-gray-100 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('tax_rate')}</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value))}
              className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('service_charge')}</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(parseFloat(e.target.value))}
              className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
            />
          </div>
        </div>
      </div>

      {/* Receipt Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-purple-500 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('receipt_settings')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('receipt_settings_desc')}</p>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('receipt_header')}</Label>
            <Input
              value={receiptHeader}
              onChange={(e) => setReceiptHeader(e.target.value)}
              className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('receipt_footer')}</Label>
            <Input
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('show_logo')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('show_logo_desc')}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogo(!showLogo)}
              className={`w-12 h-6 rounded-full transition-colors ${showLogo ? 'bg-cyan-500' : 'bg-gray-200 dark:bg-slate-600'
                }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${showLogo ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-500 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('notification_settings')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('notification_settings_desc')}</p>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('new_order_notifications')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('new_order_notifications_desc')}</p>
            </div>
            <button
              type="button"
              onClick={() => setOrderNotifications(!orderNotifications)}
              className={`w-12 h-6 rounded-full transition-colors ${orderNotifications ? 'bg-cyan-500' : 'bg-gray-200 dark:bg-slate-600'
                }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${orderNotifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('kitchen_alerts')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('kitchen_alerts_desc')}</p>
            </div>
            <button
              type="button"
              onClick={() => setKitchenAlerts(!kitchenAlerts)}
              className={`w-12 h-6 rounded-full transition-colors ${kitchenAlerts ? 'bg-cyan-500' : 'bg-gray-200 dark:bg-slate-600'
                }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${kitchenAlerts ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('sound_effects')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('sound_effects_desc')}</p>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-cyan-500' : 'bg-gray-200 dark:bg-slate-600'
                }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('system_info')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">{t('version')}</p>
            <p className="text-gray-900 dark:text-white font-medium">1.0.0</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">{t('framework')}</p>
            <p className="text-gray-900 dark:text-white font-medium">TanStack Start</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">{t('database')}</p>
            <p className="text-gray-900 dark:text-white font-medium">PostgreSQL 15</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">{t('last_updated')}</p>
            <p className="text-gray-900 dark:text-white font-medium">Jan 7, 2026</p>
          </div>
        </div>
      </div>
    </div>
  )
}
