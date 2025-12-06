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
  location_kota: string
  views: number
  whatsapp_clicks: number
  created_at: string
  images: string[]
}

export default function ListListingsPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; property: Property | null }>({ isOpen: false, property: null })
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    filterProperties()
  }, [properties, searchTerm, statusFilter, typeFilter])

  const fetchProperties = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProperties(data || [])
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
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location_kota.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter) {
      filtered = filtered.filter(property => property.status === statusFilter)
    }

    if (typeFilter) {
      filtered = filtered.filter(property => property.type === typeFilter)
    }

    setFilteredProperties(filtered)
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Listing</h1>
          <p className="text-gray-600">Kelola semua listing properti Anda</p>
        </div>
        <Link
          href="/dashboard/agent/add"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-all flex items-center justify-center"
        >
          ➕ Tambah Listing
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
            <input
              type="text"
              placeholder="Judul atau lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="live">Live</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua Jenis</option>
              <option value="rumah">Rumah</option>
              <option value="tanah">Tanah</option>
              <option value="kost">Kost</option>
              <option value="apartemen">Apartemen</option>
              <option value="ruko">Ruko</option>
              <option value="villa">Villa</option>
              <option value="hotel">Hotel</option>
              <option value="gudang">Gudang</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setTypeFilter('')
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-all"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </Card>

      {/* Listings Table */}
      <Card>
        {filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {properties.length === 0 ? 'Belum ada listing' : 'Tidak ada listing yang sesuai filter'}
            </p>
            {properties.length === 0 && (
              <Link
                href="/dashboard/agent/add"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-all"
              >
                Buat Listing Pertama
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Properti</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WA Clicks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProperties.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {property.images && property.images.length > 0 && (
                          <img
                            className="h-10 w-10 rounded-lg object-cover mr-3"
                            src={property.images[0]}
                            alt={property.title}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{property.title}</div>
                          <div className="text-sm text-gray-500">{property.location_kota}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{property.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={property.status}
                        onChange={(e) => updateStatus(property.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full ${
                          property.status === 'live' ? 'bg-green-100 text-green-800' :
                          property.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          property.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="live">Live</option>
                        <option value="sold">Sold</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rp {property.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {property.views || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {property.whatsapp_clicks || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/dashboard/agent/edit/${property.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, property })}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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