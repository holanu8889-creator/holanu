'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  views: number
  whatsapp_clicks: number
  created_at: string
}

interface Stats {
  totalListings: number
  totalViews: number
  totalClicks: number
}

export default function AgentDashboard() {
  const [user, setUser] = useState<any>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [stats, setStats] = useState<Stats>({ totalListings: 0, totalViews: 0, totalClicks: 0 })
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; property: Property | null }>({ isOpen: false, property: null })
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })

  useEffect(() => {
    fetchUserAndData()
  }, [])

  const fetchUserAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUser(user)

      // Fetch properties for this agent
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProperties(properties || [])

      // Calculate stats
      const totalListings = properties?.length || 0
      const totalViews = properties?.reduce((sum, p) => sum + (p.views || 0), 0) || 0
      const totalClicks = properties?.reduce((sum, p) => sum + (p.whatsapp_clicks || 0), 0) || 0

      setStats({ totalListings, totalViews, totalClicks })
    } catch (error) {
      console.error('Error fetching data:', error)
      showToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000)
  }

  const handleDelete = async () => {
    if (!deleteModal.property) return

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', deleteModal.property.id)

      if (error) throw error

      setProperties(properties.filter(p => p.id !== deleteModal.property!.id))
      setDeleteModal({ isOpen: false, property: null })
      showToast('Listing berhasil dihapus', 'success')
    } catch (error) {
      console.error('Error deleting property:', error)
      showToast('Gagal menghapus listing', 'error')
    }
  }

  const updateStatus = async (propertyId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', propertyId)

      if (error) throw error

      setProperties(properties.map(p =>
        p.id === propertyId ? { ...p, status: newStatus } : p
      ))
      showToast('Status berhasil diperbarui', 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Gagal memperbarui status', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Selamat Datang, {user?.user_metadata?.full_name || 'Agent'}</h1>
        <p className="text-gray-600">Kelola listing properti Anda dengan mudah</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl">
              <span className="text-2xl">🏠</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Listing</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalListings}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl">
              <span className="text-2xl">👁️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl">
              <span className="text-2xl">💬</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">WhatsApp Clicks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClicks}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard/agent/add"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all text-center"
          >
            ➕ Tambah Listing Baru
          </Link>
          <Link
            href="/dashboard/agent/list"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all text-center"
          >
            📋 Lihat Semua Listing
          </Link>
        </div>
      </Card>

      {/* Recent Listings */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Listing Terbaru</h2>
          <Link href="/dashboard/agent/list" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
            Lihat Semua →
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Belum ada listing</p>
            <Link
              href="/dashboard/agent/add"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-all"
            >
              Buat Listing Pertama
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.slice(0, 5).map((property) => (
              <div key={property.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{property.title}</h3>
                  <p className="text-sm text-gray-600">{property.type} • Rp {property.price.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      property.status === 'live' ? 'bg-green-100 text-green-800' :
                      property.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      property.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {property.status}
                    </span>
                    {property.badge && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {property.badge}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={property.status}
                    onChange={(e) => updateStatus(property.id, e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="live">Live</option>
                    <option value="sold">Sold</option>
                  </select>
                  <Link
                    href={`/dashboard/agent/edit/${property.id}`}
                    className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteModal({ isOpen: true, property })}
                    className="text-red-600 hover:text-red-500 text-sm font-medium"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, property: null })}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Apakah Anda yakin ingin menghapus listing "{deleteModal.property?.title}"?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteModal({ isOpen: false, property: null })}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl transition-all"
            >
              Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}