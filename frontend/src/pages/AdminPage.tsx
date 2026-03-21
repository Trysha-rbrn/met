import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  Ban,
  Database,
  Edit3,
  Mail,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  UserMinus,
  Users
} from 'lucide-react'
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
  const [selectedUserId, setSelectedUserId] = useState('')
  const [logs, setLogs] = useState<adminApi.AdminAuditLog[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [promoCodes, setPromoCodes] = useState<adminApi.PromoCodeItem[]>([])
  const [promoCode, setPromoCode] = useState('')
  const [promoMaxUses, setPromoMaxUses] = useState('')
  const [promoExpiresAt, setPromoExpiresAt] = useState('')

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
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
      if (selectedUserId && !response.users.some((user) => user.id === selectedUserId)) {
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
      setLogs([])
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
    void loadPromoCodes()
  }, [loadPromoCodes])

  const metrics = useMemo(() => {
    const totalUsers = users.length
    const premiumUsers = users.filter((u) => u.role === 'PREMIUM').length
    const admins = users.filter((u) => u.role === 'ADMIN').length
    const weeklyNew = users.filter((u) => {
      const createdAt = new Date(u.createdAt).getTime()
      return Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000
    }).length
    const monthlyNew = users.filter((u) => {
      const createdAt = new Date(u.createdAt).getTime()
      return Date.now() - createdAt <= 30 * 24 * 60 * 60 * 1000
    }).length
    const banned = users.filter((u) => u.isBanned).length
    const subscriptionRate = totalUsers ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0.0'
    const estimatedMonthlyRevenue = premiumUsers * 12

    return {
      totalUsers,
      premiumUsers,
      admins,
      weeklyNew,
      monthlyNew,
      banned,
      subscriptionRate,
      estimatedMonthlyRevenue
    }
  }, [users])

  const handleSetRole = async (id: string, role: 'BASIC' | 'PREMIUM') => {
    try {
      await adminApi.setAdminUserRole(id, role)
      notify.success(`User role updated to ${role}.`)
      await Promise.all([loadUsers(), loadLogs()])
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to update user role.'))
    }
  }

  const handleToggleBan = async (id: string, isBanned: boolean) => {
    try {
      await adminApi.setAdminUserBan(id, !isBanned)
      notify.success(isBanned ? 'User unbanned.' : 'User banned.')
      await Promise.all([loadUsers(), loadLogs()])
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to update ban status.'))
    }
  }

  const handleDeleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Delete ${email} and all related data?`)) return
    try {
      await adminApi.deleteAdminUser(id)
      notify.success('User deleted.')
      if (selectedUserId === id) setSelectedUserId('')
      await Promise.all([loadUsers(), loadLogs()])
    } catch (error: unknown) {
      notify.error(extractApiError(error, 'Failed to delete user.'))
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

  const handleQuickAction = async (action: 'flush-cache' | 'backup-db' | 'send-report' | 'view-logs') => {
    if (action === 'flush-cache') {
      await Promise.all([loadUsers(), loadPromoCodes()])
      notify.success('Admin cache refreshed.')
      return
    }
    if (action === 'view-logs') {
      await loadLogs()
      notify.success('Audit logs refreshed.')
      return
    }
    if (action === 'backup-db') {
      notify.info('Database backup tool is not wired yet.')
      return
    }
    notify.info('Report delivery tool is not wired yet.')
  }

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <header className="mb-8">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#64748b]">Administration</p>
        <h1 className="text-2xl font-extrabold tracking-tight">System Overview</h1>
        <p className="mt-1 text-sm text-[#64748b]">Real-time platform metrics and user management.</p>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Users size={12} />}
          label="Total Users"
          value={formatNumber(metrics.totalUsers)}
          meta={`+${metrics.weeklyNew} this week`}
          metaTone="positive"
        />
        <MetricCard
          icon={<Star size={12} />}
          label="Subscriptions"
          value={formatNumber(metrics.premiumUsers)}
          meta={`${metrics.subscriptionRate}% rate`}
          metaTone="accent"
        />
        <MetricCard
          icon={<ShieldCheck size={12} />}
          label="Monthly Revenue"
          value={`$${formatNumber(metrics.estimatedMonthlyRevenue)}`}
          meta={`~$12 x ${metrics.premiumUsers} premium`}
          metaTone="positive"
        />
        <MetricCard
          icon={<UserMinus size={12} />}
          label="Churned"
          value={formatNumber(metrics.banned)}
          meta="banned accounts"
          metaTone="muted"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="flex flex-col gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold">Recent Users</h3>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={query.search}
                  onChange={(event) => setQuery((prev) => ({ ...prev, search: event.target.value }))}
                  placeholder="Search user"
                  className="h-8 rounded-md border border-white/10 bg-black/30 px-2.5 text-[11px] outline-none placeholder:text-[#64748b]"
                />
                <button
                  type="button"
                  onClick={() => void loadUsers()}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-[#ff9eff] hover:underline"
                >
                  <RefreshCw size={12} />
                  {isLoadingUsers ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-[#ff9eff] hover:underline"
                >
                  View All <ArrowRight size={12} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-[#64748b]">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">User</th>
                    <th className="px-6 py-3.5 font-semibold">Plan</th>
                    <th className="px-6 py-3.5 font-semibold">Joined</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-[#64748b]">
                        No users found.
                      </td>
                    </tr>
                  )}
                  {users.map((user) => {
                    const initials = getInitials(user.name || user.email)
                    const planLabel = user.role === 'ADMIN' ? 'Admin' : user.role === 'PREMIUM' ? 'Pro' : 'Free'
                    const statusLabel = user.isBanned ? 'Inactive' : 'Active'
                    const rowActive = selectedUserId === user.id

                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-white/10 transition last:border-b-0 hover:bg-[#ff9eff]/[0.025] ${rowActive ? 'bg-[#ff9eff]/[0.05]' : ''}`}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-[#2e1850] to-[#5c2878] text-[10px] font-bold">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-[#f1f5f9]">{user.name || 'Unnamed user'}</p>
                              <p className="text-[10px] text-[#64748b]">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#f1f5f9]">{planLabel}</td>
                        <td className="px-6 py-4 text-[#64748b]">{formatDate(user.createdAt)}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${user.isBanned ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-3 text-[#64748b]">
                            <button
                              type="button"
                              title={user.role === 'PREMIUM' ? 'Set Basic' : 'Set Premium'}
                              disabled={user.role === 'ADMIN'}
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleSetRole(user.id, user.role === 'PREMIUM' ? 'BASIC' : 'PREMIUM')
                              }}
                              className="transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              title={user.isBanned ? 'Unban user' : 'Ban user'}
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleToggleBan(user.id, user.isBanned)
                              }}
                              className="transition-colors hover:text-yellow-400"
                            >
                              <Ban size={15} />
                            </button>
                            <button
                              type="button"
                              title="Delete user"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDeleteUser(user.id, user.email)
                              }}
                              className="transition-colors hover:text-red-400"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Revenue Growth</h3>
                <p className="mt-0.5 text-[10px] text-[#64748b]">May - October 2026</p>
              </div>
              <span className="rounded-md bg-[#ff9eff]/10 px-2 py-1 text-[10px] font-medium text-[#ff9eff]">6M</span>
            </div>
            <div className="relative h-44 w-full">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff9eff" />
                    <stop offset="100%" stopColor="#6a4d8b" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="0" x2="400" y2="0" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <rect x="18" y="72" width="38" height="48" rx="5" fill="url(#barGrad)" />
                <rect x="82" y="60" width="38" height="60" rx="5" fill="url(#barGrad)" />
                <rect x="146" y="78" width="38" height="42" rx="5" fill="url(#barGrad)" />
                <rect x="210" y="40" width="38" height="80" rx="5" fill="url(#barGrad)" />
                <rect x="274" y="24" width="38" height="96" rx="5" fill="url(#barGrad)" />
                <rect x="338" y="10" width="38" height="110" rx="5" fill="url(#barGrad)" />
              </svg>
            </div>
            <div className="mt-3 flex justify-between px-3 text-[10px] font-bold text-[#64748b]">
              <span>MAY</span>
              <span>JUN</span>
              <span>JUL</span>
              <span>AUG</span>
              <span>SEP</span>
              <span>OCT</span>
            </div>
          </section>
        </div>

        <div className="col-span-12 space-y-6 lg:col-span-4">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="mb-6 text-sm font-bold">System Status</h3>
            <div className="space-y-5">
              <StatusRow label="API Infrastructure" value="Operational" tone="ok" />
              <StatusRow label="Database Cluster" value="Operational" tone="ok" />
              <StatusRow label="Payment Gateway" value="Degraded" tone="warn" />
            </div>

            <div className="mt-6 space-y-5 border-t border-white/10 pt-6">
              <ProgressRow label="Server Load" value={42} />
              <ProgressRow label="Memory Usage" value={68} />
              <ProgressRow label="Storage" value={81} warn />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="mb-4 text-sm font-bold">Maintenance Tools</h3>
            <div className="grid grid-cols-2 gap-3">
              <ToolButton icon={<RefreshCw size={16} className="text-[#ff9eff]" />} label="Flush Cache" onClick={() => void handleQuickAction('flush-cache')} />
              <ToolButton icon={<Database size={16} className="text-[#ff9eff]" />} label="Backup DB" onClick={() => void handleQuickAction('backup-db')} />
              <ToolButton icon={<Mail size={16} className="text-[#dc89e1]" />} label="Send Report" onClick={() => void handleQuickAction('send-report')} />
              <ToolButton icon={<Activity size={16} className="text-[#dc89e1]" />} label="View Logs" onClick={() => void handleQuickAction('view-logs')} />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="mb-4 text-sm font-bold">Selected User</h3>
            {!selectedUser ? (
              <p className="text-xs text-[#64748b]">Select a user from the table to inspect quick stats.</p>
            ) : (
              <div className="space-y-2 text-xs">
                <p className="font-bold text-[#f1f5f9]">{selectedUser.name || 'Unnamed user'}</p>
                <p className="text-[#64748b]">{selectedUser.email}</p>
                <p className="text-[#64748b]">Role: {selectedUser.role}</p>
                <p className="text-[#64748b]">Status: {selectedUser.isBanned ? 'Inactive' : 'Active'}</p>
                <p className="text-[#64748b]">Joined: {formatDate(selectedUser.createdAt)}</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h3 className="mb-4 text-sm font-bold">Promo Codes</h3>
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr,140px,170px,auto]">
            <input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder="Code (e.g. SPRING2026)"
              className="h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-xs outline-none placeholder:text-[#64748b]"
            />
            <input
              type="number"
              value={promoMaxUses}
              onChange={(event) => setPromoMaxUses(event.target.value)}
              placeholder="Max uses"
              className="h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-xs outline-none placeholder:text-[#64748b]"
            />
            <input
              type="date"
              value={promoExpiresAt}
              onChange={(event) => setPromoExpiresAt(event.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => void handleCreatePromoCode()}
              className="h-10 rounded-lg border border-white/10 bg-white/5 px-4 text-xs font-bold hover:bg-white/10"
            >
              Create
            </button>
          </div>

          <div className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/20">
            {promoCodes.length === 0 ? (
              <p className="p-3 text-xs text-[#64748b]">No promo codes yet.</p>
            ) : (
              promoCodes.map((item) => (
                <div key={item.id} className="border-b border-white/10 p-3 text-xs last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{item.code}</p>
                    <button
                      type="button"
                      onClick={() => void handleTogglePromoCode(item)}
                      className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold hover:bg-white/10"
                    >
                      {item.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                  <p className="mt-1 text-[#64748b]">
                    Uses: {item.redemptionCount}
                    {item.maxRedemptions ? ` / ${item.maxRedemptions}` : ''} | Expires: {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Audit Logs</h3>
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-[#ff9eff] hover:underline"
            >
              <RefreshCw size={12} />
              Reload
            </button>
          </div>

          <div className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/20">
            {logs.length === 0 ? (
              <p className="p-3 text-xs text-[#64748b]">No logs yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border-b border-white/10 px-3 py-2 text-xs last:border-b-0">
                  <p className="font-semibold text-[#f1f5f9]">{log.action}</p>
                  <p className="text-[#64748b]">Actor: {log.actorUser?.email || 'System'} | Target: {log.targetUser?.email || 'N/A'}</p>
                  <p className="text-[#64748b]">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
        Active in last 30 days: {metrics.monthlyNew} users · Admin accounts: {metrics.admins}
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  meta,
  metaTone
}: {
  icon: ReactNode
  label: string
  value: string
  meta: string
  metaTone: 'positive' | 'accent' | 'muted'
}) {
  const metaClass =
    metaTone === 'positive'
      ? 'bg-emerald-400/10 text-emerald-400'
      : metaTone === 'accent'
        ? 'text-[#ff9eff]'
        : 'text-[#64748b]'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#64748b]">
        {icon}
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl font-extrabold">{value}</h2>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${metaClass}`}>{meta}</span>
      </div>
    </div>
  )
}

function StatusRow({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone: 'ok' | 'warn'
}) {
  const dotClass = tone === 'ok' ? 'bg-emerald-500' : 'bg-yellow-400'
  const textClass = tone === 'ok' ? 'text-emerald-400' : 'text-yellow-400'

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${dotClass} relative`}>
          <div className={`absolute inset-0 animate-ping rounded-full ${dotClass}`} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wide ${textClass}`}>{value}</span>
    </div>
  )
}

function ProgressRow({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs">
        <span className="font-medium text-[#64748b]">{label}</span>
        <span className={`font-bold ${warn ? 'text-yellow-400' : ''}`}>{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: warn
              ? 'linear-gradient(90deg,#dc89e1,#facc15)'
              : 'linear-gradient(90deg,#dc89e1,#ff9eff)'
          }}
        />
      </div>
    </div>
  )
}

function ToolButton({
  icon,
  label,
  onClick
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-[11px] font-bold transition-all hover:border-[#ff9eff]/20 hover:bg-white/[0.07]"
    >
      {icon}
      {label}
    </button>
  )
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

export default AdminPage
