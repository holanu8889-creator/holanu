'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Card from '@/components/Card'
import Modal from '@/components/Modal'
import Toast from '@/components/Toast'

interface Agent {
  id: string
  email: string
  full_name: string
  role: string
  agent_status: string
  created_at: string
  total_listings: number
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'suspended', label: 'Suspended', color: 'bg-red-100 text-red-800' },
]

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; agent: Agent | null; reason: string }>({
    isOpen: false,
    agent: null,
    reason: ''
  })
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    suspended: 0,
  })
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    filterAgents()
    calculateStats()
  }, [agents, searchTerm, statusFilter])

  const fetchAgents = async () => {
    try {
      // Fetch agents with their listing counts
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          properties:properties(count)
        `)
        .eq('role', 'agent')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = data?.map(agent => ({
        ...agent,
        total_listings: agent.properties?.[0]?.count || 0
      })) || []

      setAgents(formattedData)
    } catch (error) {
      console.error('Error fetching agents:', error)
      showToast('Gagal memuat data agent', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterAgents = () => {
    let filtered = agents

    if (searchTerm) {
      filtered = filtered.filter(agent =>
        agent.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter) {
      filtered = filtered.filter(agent => agent.agent_status === statusFilter)
    }

    setFilteredAgents(filtered)
  }

  const calculateStats = () => {
    const total = agents.length
    const pending = agents.filter(a => a.agent_status === 'pending').length
    const active = agents.filter(a => a.agent_status === 'active').length
    const suspended = agents.filter(a => a.agent_status === 'suspended').length

    setStats({ total, pending, active, suspended })
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000)
  }

  const handleApprove = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ agent_status: 'active' })
        .eq('id', agentId)

      if (error) throw error

      setAgents(prev => prev.map(agent =>
        agent.id === agentId ? { ...agent, agent_status: 'active' } : agent
      ))
      showToast('Agent berhasil diverifikasi!', 'success')
    } catch (error) {
      console.error('Error approving agent:', error)
      showToast('Gagal memverifikasi agent', 'error')
    }
  }

  const handleReject = async () => {
    if (!rejectModal.agent || !rejectModal.reason.trim()) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          agent_status: 'suspended',
          suspension_reason: rejectModal.reason
        })
        .eq('id', rejectModal.agent.id)

      if (error) throw error

      setAgents(prev => prev.map(agent =>
        agent.id === rejectModal.agent!.id ? { ...agent, agent_status: 'suspended' } : agent
      ))
      showToast('Agent berhasil ditangguhkan', 'success')
      setRejectModal({ isOpen: false, agent: null, reason: '' })
    } catch (error) {
      console.error('Error rejecting agent:', error)
      showToast('Gagal menangguhkan agent', 'error')
    }
  }

  const handleSuspend = async (agentId: string) => {
    setRejectModal({
      isOpen: true,
      agent: agents.find(a => a.id === agentId) || null,
      reason: ''
    })
  }

  const handleReactivate = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ agent_status: 'active' })
        .eq('id', agentId)

      if (error) throw error

      setAgents(prev => prev.map(agent =>
        agent.id === agentId ? { ...agent, agent_status: 'active' } : agent
      ))
      showToast('Agent berhasil diaktifkan kembali!', 'success')
    } catch (error) {
      console.error('Error reactivating agent:', error)
      showToast('Gagal mengaktifkan agent', 'error')
    }
  }

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status)
    return option ? (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${option.color}`}>
        {option.label}
      </span>
    ) : null
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-16 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verifikasi Agent</h1>
          <p className="text-gray-600">Kelola dan verifikasi agent HOLANU</p>
        </div>
        <button
          onClick={fetchAgents}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-all flex items-center"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Agent</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
            <div className="text-sm text-gray-600">Suspended</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cari</label>
            <input
              type="text"
              placeholder="Nama, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua Status</option>
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl transition-all"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </Card>

      {/* Agents Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Agent</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Listings</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Bergabung</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {agent.full_name?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{agent.full_name || 'Unnamed Agent'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900">{agent.email}</td>
                  <td className="py-4 px-4">{getStatusBadge(agent.agent_status)}</td>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">{agent.total_listings}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {new Date(agent.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {agent.agent_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(agent.id)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1 px-2 rounded transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleSuspend(agent.id)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1 px-2 rounded transition-all"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {agent.agent_status === 'suspended' && (
                        <button
                          onClick={() => handleReactivate(agent.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1 px-2 rounded transition-all"
                        >
                          Reactivate
                        </button>
                      )}
                      {agent.agent_status === 'active' && (
                        <button
                          onClick={() => handleSuspend(agent.id)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold py-1 px-2 rounded transition-all"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAgents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Tidak ada agent ditemukan</p>
            </div>
          )}
        </div>
      </Card>

      {/* Reject/Suspend Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, agent: null, reason: '' })}
        title={rejectModal.agent?.agent_status === 'active' ? 'Suspend Agent' : 'Reject Agent'}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Berikan alasan {rejectModal.agent?.agent_status === 'active' ? 'penangguhan' : 'penolakan'} untuk agent "{rejectModal.agent?.full_name}":
          </p>
          <textarea
            value={rejectModal.reason}
            onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Alasan..."
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            required
          />
          <div className="flex gap-3">
            <button
              onClick={() => setRejectModal({ isOpen: false, agent: null, reason: '' })}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectModal.reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-xl transition-all"
            >
              {rejectModal.agent?.agent_status === 'active' ? 'Suspend Agent' : 'Reject Agent'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}