import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Grid,
  List,
  Loader2,
  FolderPlus,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/dashboard/products')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <ProductsPage />
    </RoleGuard>
  ),
})

interface Product {
  id: number
  name: string
  price: string
  categoryId: number | null
  categoryName: string | null
  emoji: string | null
  stock: number | null
  isAvailable: boolean
}

function ProductsPage() {
  const trpc = useTRPC()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '0',
    categoryId: 1,
    emoji: '🍽️',
  })

  // Category form state
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    icon: '',
  })

  // Fetch products from database
  const { data: productsData = [], isLoading: productsLoading } = useQuery(
    trpc.products.list.queryOptions()
  )

  // Fetch categories
  const { data: categories = [] } = useQuery(trpc.categories.list.queryOptions())

  // Create product mutation
  const createProductMutation = useMutation(
    trpc.products.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['products']] })
        setShowAddModal(false)
        setFormData({ name: '', price: '0', categoryId: 1, emoji: '🍽️' })
      },
    })
  )

  // Update product mutation
  const updateProductMutation = useMutation(
    trpc.products.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['products']] })
        setEditingProduct(null)
      },
    })
  )

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation(
    trpc.products.toggleAvailability.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['products']] })
      },
    })
  )

  // Delete product mutation
  const deleteProductMutation = useMutation(
    trpc.products.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['products']] })
      },
    })
  )

  // Create category mutation
  const createCategoryMutation = useMutation(
    trpc.categories.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['categories']] })
        setShowCategoryModal(false)
        setCategoryFormData({ name: '', description: '', icon: '' })
      },
    })
  )

  // Transform products data
  const products: Product[] = productsData.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    emoji: p.emoji,
    stock: p.stock || 0,
    isAvailable: p.isAvailable,
  }))

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Toggle availability
  const toggleAvailability = (productId: number) => {
    toggleAvailabilityMutation.mutate({ id: productId })
  }

  // Delete product
  const handleDelete = (productId: number) => {
    if (confirm(t('delete_product_confirm'))) {
      deleteProductMutation.mutate({ id: productId })
    }
  }

  // Add product
  const handleAdd = () => {
    createProductMutation.mutate({
      name: formData.name,
      price: formData.price,
      categoryId: formData.categoryId,
      emoji: formData.emoji,
    })
  }

  // Save edit
  const handleSaveEdit = () => {
    if (editingProduct) {
      updateProductMutation.mutate({
        id: editingProduct.id,
        name: editingProduct.name,
        price: editingProduct.price,
        categoryId: editingProduct.categoryId || undefined,
        emoji: editingProduct.emoji || undefined,
      })
    }
  }

  // Add category
  const handleAddCategory = () => {
    if (!categoryFormData.name.trim()) return
    createCategoryMutation.mutate({
      name: categoryFormData.name,
      description: categoryFormData.description || undefined,
      icon: categoryFormData.icon || undefined,
    })
  }

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('products_title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('products_subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCategoryModal(true)}
            variant="outline"
            className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            {t('add_category')}
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('add_product')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder={t('search_products_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter === 'all' ? 'all' : categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:border-cyan-500 shadow-sm"
          >
            <option value="all">{t('all_categories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-slate-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-slate-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white dark:bg-slate-800 rounded-xl border ${product.isAvailable ? 'border-gray-200 dark:border-slate-700' : 'border-red-500/30'} overflow-hidden group shadow-sm`}
            >
              <div className="p-4 text-center">
                <div className="text-5xl mb-3">{product.emoji || '🍽️'}</div>
                <h3 className="font-medium text-gray-900 dark:text-white truncate">{product.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{product.categoryName}</p>
                <p className="text-cyan-400 font-bold mt-1">
                  {formatCurrency(parseFloat(product.price), i18n.language)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('stock_label', { count: product.stock })}</p>
              </div>
              <div className="p-3 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => toggleAvailability(product.id)}
                  className={`text-xs px-2 py-1 rounded ${product.isAvailable
                    ? 'bg-green-500/20 text-green-700'
                    : 'bg-red-500/20 text-red-400'
                    }`}
                >
                  {product.isAvailable ? t('available') : t('unavailable')}
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(product)}
                    className="p-1.5 rounded text-gray-400 hover:text-cyan-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">{t('th_product')}</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">{t('th_category')}</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">{t('th_price')}</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">{t('th_stock')}</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600 dark:text-gray-400">{t('th_status')}</th>
                <th className="text-right p-4 text-sm font-medium text-gray-600 dark:text-gray-400">{t('th_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{product.emoji || '🍽️'}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">{product.categoryName}</td>
                  <td className="p-4 text-cyan-400 font-medium">{formatCurrency(parseFloat(product.price), i18n.language)}</td>
                  <td className="p-4 text-gray-700 dark:text-gray-300">{product.stock}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => toggleAvailability(product.id)}
                      className={`text-xs px-2 py-1 rounded ${product.isAvailable
                        ? 'bg-green-500/20 text-green-700'
                        : 'bg-red-500/20 text-red-400'
                        }`}
                    >
                      {product.isAvailable ? t('available') : t('unavailable')}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(product)}
                        className="p-2 rounded text-gray-400 hover:text-white hover:bg-slate-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="p-2 rounded text-gray-400 hover:text-red-400 hover:bg-slate-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500">
          <Package className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-lg">{t('no_products_found')}</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingProduct ? t('edit_product') : t('add_new_product')}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('product_name')}</Label>
                <Input
                  value={editingProduct?.name || formData.name}
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({ ...editingProduct, name: e.target.value })
                      : setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                  placeholder={t('product_name_placeholder')}
                />
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('price_label')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingProduct?.price || formData.price}
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({ ...editingProduct, price: e.target.value })
                      : setFormData({ ...formData, price: e.target.value })
                  }
                  className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('category_label')}</Label>
                <select
                  value={editingProduct?.categoryId || formData.categoryId}
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({ ...editingProduct, categoryId: parseInt(e.target.value) })
                      : setFormData({ ...formData, categoryId: parseInt(e.target.value) })
                  }
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('emoji_label')}</Label>
                <Input
                  value={editingProduct?.emoji || formData.emoji}
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({ ...editingProduct, emoji: e.target.value })
                      : setFormData({ ...formData, emoji: e.target.value })
                  }
                  className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                  placeholder={t('emoji_placeholder')}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingProduct(null)
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                onClick={editingProduct ? handleSaveEdit : handleAdd}
              >
                {editingProduct ? t('save_changes') : t('add_product')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('add_new_category')}</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('category_name')}</Label>
                <Input
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, name: e.target.value })
                  }
                  className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                  placeholder={t('category_name_placeholder')}
                />
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('description_label')}</Label>
                <Input
                  value={categoryFormData.description}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, description: e.target.value })
                  }
                  className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                  placeholder={t('description_placeholder')}
                />
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('icon_name')}</Label>
                <Input
                  value={categoryFormData.icon}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, icon: e.target.value })
                  }
                  className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                  placeholder={t('icon_name_placeholder')}
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('icon_hint')}</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => {
                  setShowCategoryModal(false)
                  setCategoryFormData({ name: '', description: '', icon: '' })
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                onClick={handleAddCategory}
                disabled={!categoryFormData.name.trim() || createCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {t('add_category')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
