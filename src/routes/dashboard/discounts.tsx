import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Percent,
  DollarSign,
  Calendar,
  X,
  Loader2,
  Tag,
  Hash,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatLocalDate } from '@/lib/utils'

export const Route = createFileRoute('/dashboard/discounts')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <DiscountsPage />
    </RoleGuard>
  ),
})

type DiscountFormData = {
  code: string
  description: string
  type: 'percentage' | 'fixed'
  value: string
  startDate: string
  endDate: string
  isActive: boolean
  maxUsage: string
}

const initialFormState: DiscountFormData = {
  code: '',
  description: '',
  type: 'percentage',
  value: '',
  startDate: '',
  endDate: '',
  isActive: true,
  maxUsage: '',
}

function DiscountsPage() {
  const trpc = useTRPC()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<any>(null)
  const [formData, setFormData] = useState<DiscountFormData>(initialFormState)
  const [error, setError] = useState<string | null>(null)

  // Fetch discounts
  const { data: discounts = [], isLoading } = useQuery(trpc.discounts.list.queryOptions())

  // Mutations
  const createMutation = useMutation(
    trpc.discounts.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['discounts']] })
        setShowModal(false)
        setFormData(initialFormState)
        setError(null)
      },
      onError: (err) => setError(err.message),
    })
  )

  const updateMutation = useMutation(
    trpc.discounts.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['discounts']] })
        setShowModal(false)
        setEditingDiscount(null)
        setFormData(initialFormState)
        setError(null)
      },
      onError: (err) => setError(err.message),
    })
  )

  const deleteMutation = useMutation(
    trpc.discounts.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['discounts']] })
      },
    })
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code || !formData.value) {
      setError(t('fill_required_fields'))
      return
    }

    const payload = {
      code: formData.code,
      description: formData.description,
      type: formData.type,
      value: parseFloat(formData.value),
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      isActive: formData.isActive,
      maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : undefined,
    }

    if (editingDiscount) {
      updateMutation.mutate({ ...payload, id: editingDiscount.id })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = (id: number) => {
    if (confirm(t('delete_discount_confirm'))) {
      deleteMutation.mutate({ id })
    }
  }

  const openEditModal = (discount: any) => {
    setEditingDiscount(discount)
    setFormData({
      code: discount.code,
      description: discount.description || '',
      type: discount.type,
      value: String(discount.value),
      startDate: discount.startDate ? new Date(discount.startDate).toISOString().split('T')[0] : '',
      endDate: discount.endDate ? new Date(discount.endDate).toISOString().split('T')[0] : '',
      isActive: discount.isActive,
      maxUsage: discount.maxUsage ? String(discount.maxUsage) : '',
    })
    setShowModal(true)
  }

  const filteredDiscounts = discounts.filter((d) =>
    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleActive = (discount: any) => {
    updateMutation.mutate({
      id: discount.id,
      isActive: !discount.isActive,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Percent className="w-7 h-7 text-cyan-500" />
            {t('discounts_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('discounts_subtitle')}</p>
        </div>
        <Button onClick={() => {
          setEditingDiscount(null)
          setFormData(initialFormState)
          setShowModal(true)
        }} className="bg-cyan-500 hover:bg-cyan-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          {t('add_discount')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <Input
          placeholder={t('search_discounts')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDiscounts.map((discount) => (
          <div
            key={discount.id}
            className={`bg-white dark:bg-slate-800 rounded-xl border ${discount.isActive ? 'border-gray-200 dark:border-slate-700' : 'border-gray-200 dark:border-slate-700 opacity-60'
              } p-6 shadow-sm relative overflow-hidden group`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${discount.type === 'percentage'
                  ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                  : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                  }`}>
                  {discount.type === 'percentage' ? (
                    <Percent className="w-5 h-5" />
                  ) : (
                    <DollarSign className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{discount.code}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(discount.maxUsage && (discount.usageCount || 0) >= discount.maxUsage)
                        ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                        : discount.isActive
                          ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                      }`}>
                      {(discount.maxUsage && (discount.usageCount || 0) >= discount.maxUsage) ? t('finished') : discount.isActive ? t('active') : t('inactive')}
                    </span>
                    {discount.type === 'percentage' ? t('percentage') : t('fixed_amount')}
                  </div>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(discount)}
                  disabled={!!(discount.maxUsage && (discount.usageCount || 0) >= discount.maxUsage)}
                  className={`p-2 rounded-lg transition-colors ${(discount.maxUsage && (discount.usageCount || 0) >= discount.maxUsage)
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-cyan-500 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(discount.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {discount.type === 'percentage'
                  ? `${discount.value}%`
                  : formatCurrency(Number(discount.value), i18n.language)
                }
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 min-h-[1.25rem]">
                {discount.description || t('no_description')}
              </p>
            </div>

            <div className={`mb-4 flex items-center gap-2 text-sm ${discount.maxUsage && (discount.usageCount || 0) >= discount.maxUsage
              ? 'text-red-500 dark:text-red-400 font-medium'
              : 'text-gray-500 dark:text-gray-400'
              }`}>
              <Hash className="w-4 h-4" />
              <span>
                {t('usage_count', { count: discount.usageCount || 0 })}
                {discount.maxUsage && <span className="opacity-75"> / {discount.maxUsage}</span>}
              </span>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex flex-wrap gap-y-2 justify-between items-center text-sm">
              <div className="flex flex-col gap-1 text-gray-500 dark:text-gray-400">
                {(discount.startDate || discount.endDate) ? (
                  <>
                    {discount.startDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {t('valid_from')}: {formatLocalDate(new Date(discount.startDate))}
                      </span>
                    )}
                    {discount.endDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {t('valid_until')}: {formatLocalDate(new Date(discount.endDate))}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" /> {t('always_active')}
                  </span>
                )}
              </div>

              <button
                disabled={!!(discount.maxUsage && (discount.usageCount || 0) >= discount.maxUsage)}
                onClick={() => toggleActive(discount)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${(discount.maxUsage && (discount.usageCount || 0) >= discount.maxUsage)
                    ? 'border-gray-200 dark:border-slate-700 text-gray-400 cursor-not-allowed'
                    : discount.isActive
                      ? 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                      : 'bg-green-500 text-white border-transparent hover:bg-green-600'
                  }`}
              >
                {(discount.maxUsage && (discount.usageCount || 0) >= discount.maxUsage) ? t('finished') : discount.isActive ? t('deactivate') : t('activate')}
              </button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredDiscounts.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Tag className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('no_discounts_found')}</h3>
            <p className="max-w-sm mx-auto mb-6">{t('create_discount_hint')}</p>
            <Button onClick={() => {
              setEditingDiscount(null)
              setFormData(initialFormState)
              setShowModal(true)
            }} className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              {t('create_first_discount')}
            </Button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingDiscount ? t('edit_discount') : t('add_new_discount')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-900/30">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">{t('code_label')}</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder={t('code_placeholder')}
                  className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 uppercase font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">{t('type_label')}</Label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="percentage">{t('percentage')}</option>
                    <option value="fixed">{t('fixed_amount')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">{t('value_label')}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 pr-8"
                      required
                      placeholder={t('value_placeholder')}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      {formData.type === 'percentage' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">{t('max_usage_label')} ({t('optional')})</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={formData.maxUsage}
                  onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                  className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">{t('description_label')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 resize-none"
                  rows={3}
                  placeholder={t('discount_description_placeholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">{t('start_date')} ({t('optional')})</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">{t('end_date')} ({t('optional')})</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${formData.isActive ? 'bg-cyan-500' : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
                <Label className="text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}>
                  {t('active_status')}
                </Label>
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300"
                  onClick={() => setShowModal(false)}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingDiscount ? t('save_changes') : t('create_discount')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
