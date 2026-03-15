import { useCallback, useEffect, useMemo, useState } from 'react'
import { Shield, Search, Ban, Trash2, RefreshCw, Activity, Users, Filter, Gem, TicketPercent } from 'lucide-react'
import * as adminApi from '../api/adminApi'
import { extractApiError, notify } from '../lib/toast'

const defaultQuery = {
  search: '',
  role: 'ALL' as 'BASIC' | 'PREMIUM' | 'ADMIN' | 'ALL',
  status: 'all' as 'active' | 'banned' | 'all',
  sortBy: 'createdAt' as 'createdAt' | 'email' | 'name',
  sortOrder: 'desc' as 'asc' | 'desc'
}

function AdminPage() {
  const [query, setQuery] = useState(defaultQuery)
  const [users, setUsers] = useState<adminApi.AdminUserListItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<adminApi.AdminUserDetails | null>(null)
  const [logs, setLogs] = useState<adminApi.AdminAuditLog[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [promoCodes, setPromoCodes] = useState<adminApi.PromoCodeItem[]>([])
  const [promoCode, setPromoCode] = useState('')
  const [promoMaxUses, setPromoMaxUses] = useState('')
  const [promoExpiresAt, setPromoExpiresAt] = useState('')

  const selectedUserListItem = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  )

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      const response = await adminApi.getAdminUsers({
        search: query.search || undefined,
        role: query.role,
        status: query.status,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        page: 1,
        pageSize: 50
      })
      setUsers(response.users)

      if (!selectedUserId && response.users.length > 0) {
        setSelectedUserId(response.users[0].id)
      }

      if (selectedUserId && !response.users.some((u) => u.id === selectedUserId)) {
        setSelectedUserId(response.users[0]?.id || '')
      }
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to load users.'))
    } finally {
      setIsLoadingUsers(false)
    }
  }, [query, selectedUserId])

  const loadLogs = useCallback(async () => {
    try {
      const response = await adminApi.getAdminAuditLogs({ page: 1, pageSize: 30 })
      setLogs(response.logs)
    } catch {
      // no-op
    }
  }, [])

  const loadDetails = useCallback(async (id: string) => {
    if (!id) {
      setSelectedUser(null)
      return
    }

    setIsLoadingDetails(true)
    try {
      const details = await adminApi.getAdminUserDetails(id)
      setSelectedUser(details)
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to load user details.'))
      setSelectedUser(null)
    } finally {
      setIsLoadingDetails(false)
    }
  }, [])

  const loadPromoCodes = useCallback(async () => {
    try {
      const items = await adminApi.getPromoCodes()
      setPromoCodes(items)
    } catch {
      setPromoCodes([])
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  useEffect(() => {
    void loadDetails(selectedUserId)
  }, [selectedUserId, loadDetails])

  useEffect(() => {
    void loadPromoCodes()
  }, [loadPromoCodes])

  const handleToggleBan = async () => {
    if (!selectedUserListItem) return

    try {
      await adminApi.setAdminUserBan(selectedUserListItem.id, !selectedUserListItem.isBanned)
      notify.success(selectedUserListItem.isBanned ? 'User unbanned.' : 'User banned.')
      await Promise.all([loadUsers(), loadLogs(), loadDetails(selectedUserListItem.id)])
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to update ban status.'))
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUserListItem) return
    if (!window.confirm(`Delete ${selectedUserListItem.email} and all related data?`)) return

    try {
      await adminApi.deleteAdminUser(selectedUserListItem.id)
      notify.success('User deleted.')
      setSelectedUserId('')
      setSelectedUser(null)
      await Promise.all([loadUsers(), loadLogs()])
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to delete user.'))
    }
  }

  const handleSetRole = async (role: 'BASIC' | 'PREMIUM') => {
    if (!selectedUserListItem) return
    try {
      await adminApi.setAdminUserRole(selectedUserListItem.id, role)
      notify.success(`User role updated to ${role}.`)
      await Promise.all([loadUsers(), loadLogs(), loadDetails(selectedUserListItem.id)])
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to update user role.'))
    }
  }

  const handleCreatePromoCode = async () => {
    const code = promoCode.trim().toUpperCase()
    if (!code) {
      notify.warning('Promo code is required.')
      return
    }

    try {
      await adminApi.createPromoCode({
        code,
        maxRedemptions: promoMaxUses ? Number(promoMaxUses) : undefined,
        expiresAt: promoExpiresAt ? new Date(promoExpiresAt).toISOString() : undefined
      })
      notify.success('Promo code created.')
      setPromoCode('')
      setPromoMaxUses('')
      setPromoExpiresAt('')
      await loadPromoCodes()
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to create promo code.'))
    }
  }

  const handleTogglePromoCode = async (item: adminApi.PromoCodeItem) => {
    try {
      await adminApi.setPromoCodeState(item.id, !item.isActive)
      notify.success(item.isActive ? 'Promo code disabled.' : 'Promo code enabled.')
      await loadPromoCodes()
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to update promo code state.'))
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter flex items-center gap-2">
          <Shield size={26} className="text-primary" />
          Admin Panel
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-medium">
          Manage users, moderation actions and system audit logs.
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="md:col-span-2 flex items-center gap-2 rounded-xl border bg-background px-3">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query.search}
              onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search by name or email"
              className="h-11 w-full bg-transparent outline-none text-sm"
            />
          </label>
          <select
            value={query.role}
            onChange={(e) => setQuery((prev) => ({ ...prev, role: e.target.value as 'BASIC' | 'PREMIUM' | 'ADMIN' | 'ALL' }))}
            className="h-11 rounded-xl border bg-background px-3 text-sm"
          >
            <option value="ALL">All roles</option>
            <option value="BASIC">Basic</option>
            <option value="PREMIUM">Premium</option>
            <option value="ADMIN">Administrator</option>
          </select>
          <select
            value={query.status}
            onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value as 'active' | 'banned' | 'all' }))}
            className="h-11 rounded-xl border bg-background px-3 text-sm"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="h-11 rounded-xl border bg-background px-3 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <TicketPercent size={18} className="text-primary" />
          <h2 className="text-lg font-black tracking-tight">Premium Promo Codes</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.1fr,0.7fr,0.8fr,auto]">
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Code (e.g. SPRING2026)"
            className="h-11 rounded-xl border bg-background px-3 text-sm"
          />
          <input
            type="number"
            value={promoMaxUses}
            onChange={(e) => setPromoMaxUses(e.target.value)}
            placeholder="Max uses (optional)"
            className="h-11 rounded-xl border bg-background px-3 text-sm"
          />
          <input
            type="date"
            value={promoExpiresAt}
            onChange={(e) => setPromoExpiresAt(e.target.value)}
            className="h-11 rounded-xl border bg-background px-3 text-sm"
          />
          <button
            type="button"
            onClick={handleCreatePromoCode}
            className="h-11 rounded-xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
          >
            Create
          </button>
        </div>
        <div className="max-h-56 overflow-auto rounded-xl border bg-background">
          {promoCodes.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No promo codes yet.</p>
          ) : (
            promoCodes.map((item) => (
              <div key={item.id} className="border-b last:border-b-0 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{item.code}</p>
                  <button
                    type="button"
                    onClick={() => void handleTogglePromoCode(item)}
                    className="rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-muted"
                  >
                    {item.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Uses: {item.redemptionCount}{item.maxRedemptions ? ` / ${item.maxRedemptions}` : ''} | Expires: {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'Never'}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-1 rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-bold inline-flex items-center gap-2"><Users size={16} /> Users</p>
            {isLoadingUsers && <span className="text-xs text-muted-foreground">Loading...</span>}
          </div>
          <div className="max-h-[520px] overflow-auto p-2">
            {users.length === 0 && <p className="p-4 text-sm text-muted-foreground">No users found.</p>}
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={`w-full text-left rounded-xl p-3 transition-colors border mb-2 ${selectedUserId === user.id ? 'bg-primary/10 border-primary/30' : 'bg-background border-border hover:bg-muted'}`}
              >
                <p className="text-sm font-bold truncate">{user.name || 'Unnamed user'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="rounded-md border px-2 py-0.5">{user.role}</span>
                  <span className={`rounded-md border px-2 py-0.5 ${user.isBanned ? 'text-rose-600 border-rose-300' : 'text-emerald-600 border-emerald-300'}`}>
                    {user.isBanned ? 'BANNED' : 'ACTIVE'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="xl:col-span-2 space-y-6">
          <article className="rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-tight">User Details</h2>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSetRole('PREMIUM')}
                  disabled={!selectedUserListItem || selectedUserListItem.role === 'PREMIUM' || selectedUserListItem.role === 'ADMIN'}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold bg-background hover:bg-muted disabled:opacity-50 sm:text-sm"
                >
                  <Gem size={15} />
                  Set Premium
                </button>
                <button
                  type="button"
                  onClick={() => handleSetRole('BASIC')}
                  disabled={!selectedUserListItem || selectedUserListItem.role === 'BASIC' || selectedUserListItem.role === 'ADMIN'}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold bg-background hover:bg-muted disabled:opacity-50 sm:text-sm"
                >
                  <Users size={15} />
                  Set Basic
                </button>
                <button
                  type="button"
                  onClick={handleToggleBan}
                  disabled={!selectedUserListItem}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold bg-background hover:bg-muted disabled:opacity-50 sm:text-sm"
                >
                  <Ban size={15} />
                  {selectedUserListItem?.isBanned ? 'Unban' : 'Ban'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={!selectedUserListItem}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 sm:text-sm"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            </div>

            {!selectedUserId && <p className="mt-4 text-sm text-muted-foreground">Select a user from the list.</p>}
            {selectedUserId && isLoadingDetails && <p className="mt-4 text-sm text-muted-foreground">Loading details...</p>}
            {selectedUser && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Accounts" value={String(selectedUser.accounts.length)} />
                  <Stat label="Categories" value={String(selectedUser.categories.length)} />
                  <Stat label="Transactions" value={String(selectedUser.transactions.length)} />
                  <Stat label="Transfers" value={String(selectedUser.transferLogs.length)} />
                </div>
                <div className="rounded-xl border bg-background p-3 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {selectedUser.name || 'N/A'}</p>
                  <p><span className="text-muted-foreground">Email:</span> {selectedUser.email}</p>
                  <p><span className="text-muted-foreground">Role:</span> {selectedUser.role}</p>
                  <p><span className="text-muted-foreground">Status:</span> {selectedUser.isBanned ? 'BANNED' : 'ACTIVE'}</p>
                  <p><span className="text-muted-foreground">Subscription:</span> {selectedUser.subscription ? `${selectedUser.subscription.plan} / ${selectedUser.subscription.status}` : 'N/A'}</p>
                  {selectedUser.subscription?.billingInterval && (
                    <p><span className="text-muted-foreground">Billing:</span> {selectedUser.subscription.billingInterval}</p>
                  )}
                </div>
              </div>
            )}
          </article>

          <article className="rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight inline-flex items-center gap-2">
                <Activity size={18} className="text-primary" />
                Audit Logs
              </h2>
              <button
                type="button"
                onClick={() => void loadLogs()}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold bg-background hover:bg-muted"
              >
                <Filter size={15} />
                Reload
              </button>
            </div>
            <div className="mt-3 max-h-[300px] overflow-auto rounded-xl border bg-background">
              {logs.length === 0 && <p className="p-4 text-sm text-muted-foreground">No logs yet.</p>}
              {logs.map((log) => (
                <div key={log.id} className="border-b last:border-b-0 px-3 py-2 text-xs sm:text-sm">
                  <p className="font-semibold">{log.action}</p>
                  <p className="text-muted-foreground">
                    Actor: {log.actorUser?.email || 'System'} | Target: {log.targetUser?.email || 'N/A'}
                  </p>
                  <p className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-black tracking-tight">{value}</p>
    </div>
  )
}

export default AdminPage
