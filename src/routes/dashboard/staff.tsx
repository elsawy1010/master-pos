import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTRPC } from '@/integrations/trpc/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { RoleGuard } from '@/components/RoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCircle,
  Mail,
  Phone,
  Shield,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getRoleColor } from '@/lib/auth'
import { admin } from '@/lib/auth-client'

export const Route = createFileRoute('/dashboard/staff')({
  component: () => (
    <RoleGuard allowedRoles={['admin']}>
      <StaffPage />
    </RoleGuard>
  ),
})

interface StaffMember {
  id: string // Changed from number to string (TEXT id)
  username: string
  fullName: string
  email: string | null
  phone: string | null
  role: string
  isActive: boolean
  createdAt: Date
}

function StaffPage() {
  const trpc = useTRPC()
  const { t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'server',
    password: '',
  })

  // Fetch staff from database
  const { data: staffData = [], isLoading, refetch } = useQuery(trpc.users.list.queryOptions())

  // State for mutation loading
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Update user mutation (for non-auth fields like role, phone)
  const updateUserMutation = useMutation(
    trpc.users.update.mutationOptions({
      onSuccess: () => {
        refetch()
        setEditingStaff(null)
      },
    })
  )

  // Delete user mutation - use better-auth admin API
  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('delete_staff_confirm'))) return

    try {
      const result = await admin.removeUser({ userId })
      if (result.error) {
        alert(`Failed to delete: ${result.error.message}`)
      } else {
        refetch()
      }
    } catch (err) {
      alert('Failed to delete user')
    }
  }

  // Transform staff data
  const staff: StaffMember[] = staffData.map((s) => ({
    id: s.id,
    username: s.username,
    fullName: s.fullName,
    email: s.email,
    phone: s.phone,
    role: s.role,
    isActive: s.isActive,
    createdAt: s.createdAt || new Date(),
  }))

  // Filter staff
  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Count by role
  const roleCounts = {
    all: staff.length,
    admin: staff.filter((s) => s.role === 'admin').length,
    manager: staff.filter((s) => s.role === 'manager').length,
    server: staff.filter((s) => s.role === 'server').length,
    counter: staff.filter((s) => s.role === 'counter').length,
    kitchen: staff.filter((s) => s.role === 'kitchen').length,
  }

  // Toggle active status
  const toggleActive = async (staffMember: StaffMember) => {
    if (staffMember.isActive) {
      // Ban user (set isActive = false)
      const result = await admin.banUser({
        userId: staffMember.id,
        banReason: 'Deactivated by admin'
      })
      if (!result.error) {
        refetch()
      }
    } else {
      // Unban user (set isActive = true)
      const result = await admin.unbanUser({ userId: staffMember.id })
      if (!result.error) {
        refetch()
      }
    }
  }

  // Add staff using better-auth admin API
  const handleAdd = async () => {
    if (!formData.username || !formData.password || !formData.fullName || !formData.email) {
      setCreateError('Please fill in all required fields')
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      // Create user with better-auth admin API
      // Note: better-auth only supports 'admin' and 'user' roles by default
      // We pass our custom role via the data field
      const result = await admin.createUser({
        email: formData.email,
        password: formData.password,
        name: formData.fullName,
        role: formData.role === 'admin' ? 'admin' : 'user',
        data: {
          username: formData.username,
          fullName: formData.fullName,
          phone: formData.phone || null,
          isActive: true,
          role: formData.role, // Store our custom POS role
        },
      })

      if (result.error) {
        setCreateError(result.error.message || 'Failed to create user')
      } else {
        setShowAddModal(false)
        setFormData({
          username: '',
          fullName: '',
          email: '',
          phone: '',
          role: 'server',
          password: '',
        })
        refetch()
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user')
    } finally {
      setIsCreating(false)
    }
  }

  // Save edit
  const handleSaveEdit = () => {
    if (editingStaff) {
      updateUserMutation.mutate({
        id: editingStaff.id,
        fullName: editingStaff.fullName,
        email: editingStaff.email || undefined,
        phone: editingStaff.phone || undefined,
        role: editingStaff.role as 'admin' | 'manager' | 'server' | 'counter' | 'kitchen',
      })
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('staff_title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('staff_subtitle')}</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-cyan-500 hover:bg-cyan-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('add_staff')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder={t('search_staff_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {Object.entries(roleCounts).map(([role, count]) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${roleFilter === role
                ? 'bg-cyan-500 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-transparent'
                }`}
            >
              {role === 'all' ? t('all_roles') : t(`role_${role}`)}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/20 text-gray-700 dark:text-white text-xs">
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('th_staff_member')}
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('th_contact')}
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('th_role')}
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('th_status')}
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('th_joined')}
                </th>
                <th className="text-right p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('th_actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredStaff.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-sm ${getRoleColor(member.role)}`}
                      >
                        {member.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.fullName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          @{member.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {member.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {member.phone}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white ${getRoleColor(member.role)}`}
                    >
                      <Shield className="w-3 h-3" />
                      {t(`role_${member.role}`)}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => toggleActive(member)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${member.isActive
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30'
                        : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
                        }`}
                    >
                      {member.isActive ? (
                        <>
                          <Check className="w-3 h-3" />
                          {t('status_active')}
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          {t('status_inactive')}
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingStaff(member)}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(member.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        disabled={member.role === 'admin'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStaff.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
              <UserCircle className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg">{t('no_staff_found')}</p>
              <p className="text-sm">{t('adjust_filters_hint')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingStaff) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingStaff ? t('edit_staff') : t('add_new_staff')}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('full_name_label')}</Label>
                <Input
                  value={editingStaff?.fullName || formData.fullName}
                  onChange={(e) =>
                    editingStaff
                      ? setEditingStaff({ ...editingStaff, fullName: e.target.value })
                      : setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                  placeholder={t('full_name_placeholder')}
                />
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('username_label')}</Label>
                <Input
                  value={editingStaff?.username || formData.username}
                  onChange={(e) =>
                    editingStaff
                      ? setEditingStaff({ ...editingStaff, username: e.target.value })
                      : setFormData({ ...formData, username: e.target.value })
                  }
                  className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                  placeholder={t('username_placeholder')}
                />
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('email_label')}</Label>
                <Input
                  type="email"
                  value={editingStaff?.email || formData.email}
                  onChange={(e) =>
                    editingStaff
                      ? setEditingStaff({ ...editingStaff, email: e.target.value })
                      : setFormData({ ...formData, email: e.target.value })
                  }
                  className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                  placeholder={t('email_placeholder')}
                />
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('phone_label')}</Label>
                <Input
                  value={editingStaff?.phone || formData.phone}
                  onChange={(e) =>
                    editingStaff
                      ? setEditingStaff({ ...editingStaff, phone: e.target.value })
                      : setFormData({ ...formData, phone: e.target.value })
                  }
                  className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                  placeholder={t('phone_placeholder')}
                />
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('role_label')}</Label>
                <select
                  value={editingStaff?.role || formData.role}
                  onChange={(e) =>
                    editingStaff
                      ? setEditingStaff({ ...editingStaff, role: e.target.value })
                      : setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
                >
                  <option value="server">{t('role_server')}</option>
                  <option value="counter">{t('role_counter')}</option>
                  <option value="kitchen">{t('role_kitchen')}</option>
                  <option value="manager">{t('role_manager')}</option>
                  <option value="admin">{t('role_admin')}</option>
                </select>
              </div>

              {!editingStaff && (
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">{t('password_label')}</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white mt-1"
                    placeholder={t('password_placeholder')}
                  />
                </div>
              )}

              {createError && (
                <div className="p-3 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {createError}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-white"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingStaff(null)
                  setCreateError(null)
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                onClick={editingStaff ? handleSaveEdit : handleAdd}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingStaff ? (
                  t('save_changes')
                ) : (
                  t('add_staff')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
