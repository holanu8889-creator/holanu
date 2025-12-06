'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Card from '@/components/Card'
import Modal from '@/components/Modal'
import Toast from '@/components/Toast'

interface Property {
  id: string
  title: string
  type: string
  status: string
  badge: string
  price: number
  location_kota: string
  views: number
  whatsapp_clicks: number
  created_at: string
  agent_name: string
  images: string[]
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'live', label: 'Live', color: 'bg-green-100 text-green-800' },
  { value: 'sold', label: 'Sold', color: 'bg-red-100 text-red-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
]

const BADGE_OPTIONS = [
  { value: '', label: 'Tidak ada', color: 'bg-gray-100 text-gray-800' },
  { value: 'free', label: 'Free', color: 'bg-blue-100 text-blue-800' },
  { value: 'featured', label: 'Featured', color: 'bg-purple-100 text-purple-800' },
  { value: 'premium', label: 'Premium', color: 'bg-orange-100 text-orange-800' },
  { value: 'super_premium', label: 'Super Premium', color: 'bg-pink-100 text-pink-800' },
]

export default function AdminListingsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; property: Property | null; reason: string }>({
    isOpen: false,
    property: null,
    reason: ''
  })
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    filterProperties()
  }, [properties, searchTerm, statusFilter, typeFilter])

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          users:agent_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = data?.map(prop => ({
        ...prop,
        agent_name: prop.users?.full_name || 'Unknown Agent'
      })) || []

      setProperties(formattedData)
    } catch (error) {
      console.error('Error fetching properties:', error)
      showToast('Gagal memuat data listing', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterProperties = () => {
    let filtered = properties

    if (searchTerm) {
      filtered = filtered.filter(prop =>
        prop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prop.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prop.location_kota.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter) {
      filtered = filtered.filter(prop => prop.status === statusFilter)
    }

    if (typeFilter) {
      filtered = filtered.filter(prop => prop.type === typeFilter)
    }

    setFilteredProperties(filtered)
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000)
  }

  const handleApprove = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'live' })
        .eq('id', propertyId)

      if (error) throw error

      setProperties(prev => prev.map(prop =>
        prop.id === propertyId ? { ...prop, status: 'live' } : prop
      ))
      showToast('Listing berhasil disetujui!', 'success')
    } catch (error) {
      console.error('Error approving property:', error)
      showToast('Gagal menyetujui listing', 'error')
    }
  }

  const handleReject = async () => {
    if (!rejectModal.property || !rejectModal.reason.trim()) return

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          status: 'rejected',
          rejection_reason: rejectModal.reason
        })
        .eq('id', rejectModal.property.id)

      if (error) throw error

      setProperties(prev => prev.map(prop =>
        prop.id === rejectModal.property!.id ? { ...prop, status: 'rejected' } : prop
      ))
      showToast('Listing berhasil ditolak', 'success')
      setRejectModal({ isOpen: false, property: null, reason: '' })
    } catch (error) {
      console.error('Error rejecting property:', error)
      showToast('Gagal menolak listing', 'error')
    }
  }

  const handleSetBadge = async (propertyId: string, badge: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ badge })
        .eq('id', propertyId)

      if (error) throw error

      setProperties(prev => prev.map(prop =>
        prop.id === propertyId ? { ...prop, badge } : prop
      ))
      showToast(`Badge berhasil diubah!`, 'success')
    } catch (error) {
      console.error('Error updating badge:', error)
      showToast('Gagal mengubah badge', 'error')
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

  const getBadgeDisplay = (badge: string) => {
    const option = BADGE_OPTIONS.find(opt => opt.value === badge)
    return option ? (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${option.color}`}>
        {option.label}
      </span>
    ) : (
      <span className="text-gray-400 text-xs">-</span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="h-16 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Daftar Listing</h1>
          <p className="text-gray-600">Kelola semua listing properti</p>
        </div>
        <button
          onClick={fetchProperties}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-all flex items-center"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cari</label>
            <input
              type="text"
              placeholder="Judul, agent, lokasi..."
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua Jenis</option>
              <option value="rumah">Rumah</option>
              <option value="tanah">Tanah</option>
              <option value="kost">Kost</option>
              <option value="apartemen">Apartemen</option>
              <option value="ruko">Ruko</option>
              <option value="villa">Villa</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setTypeFilter('')
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl transition-all"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </Card>

      {/* Listings Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Listing</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Agent</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Badge</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Harga</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Views</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredProperties.map((property) => (
                <tr key={property.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          🏠
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{property.title}</div>
                        <div className="text-sm text-gray-500">{property.location_kota}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900">{property.agent_name}</td>
                  <td className="py-4 px-4">{getStatusBadge(property.status)}</td>
                  <td className="py-4 px-4">{getBadgeDisplay(property.badge)}</td>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">
                    Rp {property.price.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900">{property.views}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {property.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(property.id)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1 px-2 rounded transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectModal({ isOpen: true, property, reason: '' })}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1 px-2 rounded transition-all"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <select
                        value={property.badge}
                        onChange={(e) => handleSetBadge(property.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        {BADGE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProperties.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Tidak ada listing ditemukan</p>
            </div>
          )}
        </div>
      </Card>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, property: null, reason: '' })}
        title="Tolak Listing"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Berikan alasan penolakan untuk listing "{rejectModal.property?.title}":
          </p>
          <textarea
            value={rejectModal.reason}
            onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Alasan penolakan..."
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            required
          />
          <div className="flex gap-3">
            <button
              onClick={() => setRejectModal({ isOpen: false, property: null, reason: '' })}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectModal.reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-xl transition-all"
            >
              Tolak Listing
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}