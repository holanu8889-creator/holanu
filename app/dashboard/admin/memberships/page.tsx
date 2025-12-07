'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { propertyService, AgentMembership } from '@/lib/property.service'

type AgentWithMembership = {
  id: string
  name: string
  email: string
  whatsapp: string
  status: string
  membership: AgentMembership | null
}

export default function AdminMembershipsPage() {
  const [agents, setAgents] = useState<AgentWithMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      router.push('/forbidden')
      return
    }

    setUser(user)
  }

  const loadData = async () => {
    try {
      // Load all agents with their memberships
      const { data: agentsData, error } = await supabase
        .from('agents')
        .select(`
          *,
          memberships:agent_memberships(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const agentsWithMembership = agentsData.map(agent => ({
        ...agent,
        membership: agent.memberships?.[0] || null
      }))

      setAgents(agentsWithMembership)

      // Calculate stats
      const statsData = {
        total: agentsWithMembership.length,
        free: agentsWithMembership.filter(a => !a.membership || a.membership.tier === 'free').length,
        pro: agentsWithMembership.filter(a => a.membership?.tier === 'pro').length,
        agency: agentsWithMembership.filter(a => a.membership?.tier === 'agency').length,
        active: agentsWithMembership.filter(a => a.membership && (!a.membership.expired_at || new Date(a.membership.expired_at) > new Date())).length,
        expired: agentsWithMembership.filter(a => a.membership?.expired_at && new Date(a.membership.expired_at) <= new Date()).length
      }
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMembershipChange = async (agentId: string, newTier: AgentMembership['tier']) => {
    setProcessing(agentId)

    try {
      await propertyService.upgradeAgentMembership(agentId, newTier)
      await loadData()

      alert(`Membership agent berhasil diubah ke ${newTier.toUpperCase()}`)
    } catch (error) {
      console.error('Error updating membership:', error)
      alert('Gagal mengubah membership')
    } finally {
      setProcessing(null)
    }
  }

  const getMembershipColor = (tier: string | undefined) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      agency: 'bg-purple-100 text-purple-800'
    }
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const isExpired = (membership: AgentMembership | null) => {
    return membership?.expired_at && new Date(membership.expired_at) <= new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manajemen Membership Agent</h1>
            <p className="text-gray-600 mt-2">Monitor dan kelola membership semua agent</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Agent</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Free</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.free}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pro</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pro}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Agency</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.agency}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Aktif</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Kadaluarsa</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agents Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {agents.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada agent terdaftar</h3>
              <p className="mt-1 text-sm text-gray-500">Belum ada agent yang mendaftar ke platform.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Membership
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expired
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {agent.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                            <div className="text-sm text-gray-500">{agent.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(agent.status)}`}>
                          {agent.status === 'pending' ? 'Menunggu' :
                           agent.status === 'approved' ? 'Aktif' :
                           agent.status === 'rejected' ? 'Ditolak' : agent.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMembershipColor(agent.membership?.tier)}`}>
                          {agent.membership?.tier ? agent.membership.tier.toUpperCase() : 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.membership?.expired_at ? (
                          <div>
                            <div>{new Date(agent.membership.expired_at).toLocaleDateString('id-ID')}</div>
                            {isExpired(agent.membership) && (
                              <span className="text-red-600 text-xs">Kadaluarsa</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {['free', 'pro', 'agency'].map((tier) => (
                            <button
                              key={tier}
                              onClick={() => handleMembershipChange(agent.id, tier as AgentMembership['tier'])}
                              disabled={processing === agent.id || agent.membership?.tier === tier}
                              className={`px-3 py-1 text-xs font-medium rounded ${
                                tier === 'free'
                                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50'
                                  : tier === 'pro'
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-blue-50'
                                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:bg-purple-50'
                              } disabled:cursor-not-allowed`}
                            >
                              {processing === agent.id ? '...' : tier.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Membership</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.total || 0}</div>
              <div className="text-sm text-gray-500">Total Agent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
              <div className="text-sm text-gray-500">Membership Aktif</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats ? Math.round((stats.active / stats.total) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-500">Tingkat Aktivasi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats ? stats.pro + stats.agency : 0}
              </div>
              <div className="text-sm text-gray-500">Premium Members</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}