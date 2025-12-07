'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { propertyService, Property, PropertyFilters } from '@/lib/property.service'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<PropertyFilters>({
    status: 'approved'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadProperties()
  }, [filters, currentPage])

  const loadProperties = async () => {
    try {
      setLoading(true)
      const result = await propertyService.getProperties(filters, currentPage, 12)
      setProperties(result.properties)
      setTotalPages(result.totalPages)
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: Partial<PropertyFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleWhatsappClick = async (property: Property) => {
    if (property.agent?.whatsapp) {
      // Increment WhatsApp click count
      await propertyService.incrementWhatsappClicks(property.id)

      // Open WhatsApp
      const message = `Halo, saya tertarik dengan properti "${property.title}" dengan harga ${propertyService.formatPrice(property.price)}. Bisakah saya mendapatkan informasi lebih detail?`
      const whatsappUrl = `https://wa.me/${property.agent.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
    }
  }

  const clearFilters = () => {
    setFilters({ status: 'approved' })
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Properti Dijual</h1>
              <p className="text-gray-600 mt-1">Temukan properti impian Anda</p>
            </div>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ← Kembali ke Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Filter</h2>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  {showFilters ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>

              <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipe Properti
                  </label>
                  <select
                    value={filters.property_type || ''}
                    onChange={(e) => handleFilterChange({
                      property_type: e.target.value || undefined
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Semua Tipe</option>
                    <option value="rumah">Rumah</option>
                    <option value="tanah">Tanah</option>
                    <option value="kost">Kost</option>
                    <option value="hotel">Hotel</option>
                    <option value="homestay">Homestay</option>
                    <option value="villa">Villa</option>
                    <option value="apartement">Apartemen</option>
                    <option value="ruko">Ruko</option>
                    <option value="gudang">Gudang</option>
                    <option value="komersial">Komersial</option>
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Kota
                  </label>
                  <input
                    type="text"
                    placeholder="Cari kota..."
                    value={filters.city || ''}
                    onChange={(e) => handleFilterChange({ city: e.target.value || undefined })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Rentang Harga
                  </label>
                  <div className="space-y-3">
                    <input
                      type="number"
                      placeholder="Harga Minimum"
                      value={filters.min_price || ''}
                      onChange={(e) => handleFilterChange({
                        min_price: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Harga Maksimum"
                      value={filters.max_price || ''}
                      onChange={(e) => handleFilterChange({
                        max_price: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Featured Properties */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.is_featured || false}
                      onChange={(e) => handleFilterChange({ is_featured: e.target.checked || undefined })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Hanya properti featured</span>
                  </label>
                </div>

                {/* Premium Properties */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.is_premium || false}
                      onChange={(e) => handleFilterChange({ is_premium: e.target.checked || undefined })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Hanya properti premium</span>
                  </label>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={clearFilters}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Hapus Filter
                </button>
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          <div className="lg:w-3/4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                    <div className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada properti ditemukan</h3>
                <p className="mt-1 text-sm text-gray-500">Coba ubah filter pencarian Anda.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                  {properties.map((property) => (
                    <div key={property.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                      {/* Property Image */}
                      <div className="relative">
                        {property.images && property.images.length > 0 ? (
                          <img
                            src={property.images[0].image_url}
                            alt={property.title}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                            <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          {property.is_featured && (
                            <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                              Featured
                            </span>
                          )}
                          {property.is_premium && (
                            <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium">
                              Premium
                            </span>
                          )}
                        </div>

                        {/* Views */}
                        <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                          {property.views_count || 0} views
                        </div>
                      </div>

                      {/* Property Info */}
                      <div className="p-6">
                        <div className="mb-2">
                          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            {propertyService.getPropertyTypeLabel(property.property_type)}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          <Link
                            href={`/properties/${property.id}`}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {property.title}
                          </Link>
                        </h3>

                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {property.address}, {property.district}, {property.city}, {property.province}
                        </p>

                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold text-green-600">
                            {propertyService.formatPrice(property.price)}
                          </span>
                        </div>

                        {/* Agent Info */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center">
                            <div className="text-sm">
                              <p className="text-gray-900 font-medium">{property.agent?.name}</p>
                              <p className="text-gray-500">Agent</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleWhatsappClick(property)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                            </svg>
                            WhatsApp
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center">
                    <nav className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Sebelumnya
                      </button>

                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-2 rounded-md text-sm font-medium ${
                                page === currentPage
                                  ? 'text-blue-600 bg-blue-50 border border-blue-500'
                                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return <span key={page} className="px-2 text-gray-400">...</span>
                        }
                        return null
                      })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Selanjutnya →
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}