import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { propertyService } from '@/lib/property.service'
import { SEOUtils } from '@/lib/seo.utils'

interface CategoryPageProps {
  params: {
    category: string
  }
  searchParams: {
    kota?: string
    page?: string
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const category = params.category
  const location = searchParams.kota

  const seo = SEOUtils.generateCategorySEO(category, location)
  return SEOUtils.toNextMetadata(seo)
}

// Server component
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const category = params.category
  const location = searchParams.kota
  const page = parseInt(searchParams.page || '1')

  // Validate category
  const validCategories = [
    'rumah', 'tanah', 'kost', 'hotel', 'homestay', 'villa',
    'apartement', 'ruko', 'gudang', 'komersial'
  ]

  if (!validCategories.includes(category)) {
    notFound()
  }

  // Build filters
  const filters: any = {
    property_type: category,
    status: 'approved'
  }

  if (location) {
    filters.city = location
  }

  // Get properties
  const { properties, total, totalPages } = await propertyService.getProperties(filters, page, 12)

  // Get category display name
  const categoryNames: Record<string, string> = {
    rumah: 'Rumah',
    tanah: 'Tanah',
    kost: 'Kost',
    hotel: 'Hotel',
    homestay: 'Homestay',
    villa: 'Villa',
    apartement: 'Apartemen',
    ruko: 'Ruko',
    gudang: 'Gudang',
    komersial: 'Komersial'
  }

  const categoryName = categoryNames[category] || category
  const locationText = location ? ` di ${location}` : ''
  const pageTitle = `${categoryName} Dijual${locationText} | HOLANU Marketplace`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Link href="/" className="hover:text-blue-600">Home</Link>
                <span>/</span>
                <Link href="/properties" className="hover:text-blue-600">Properti</Link>
                <span>/</span>
                <span className="text-gray-900">{categoryName}{locationText}</span>
              </nav>
              <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
              <p className="text-gray-600 mt-2">
                Temukan {categoryName.toLowerCase()} terbaik{locationText} dengan harga terjangkau
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{total}</div>
              <div className="text-sm text-gray-500">Total Properti</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <Link
                href={`/properti/${category}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !location ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Semua Kota
              </Link>
              {['Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Semarang'].map((city) => (
                <Link
                  key={city}
                  href={`/properti/${category}?kota=${city}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location === city ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Properties Grid */}
        {properties.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Tidak ada {categoryName.toLowerCase()} ditemukan{locationText}
            </h3>
            <p className="mt-2 text-gray-500">
              Coba ubah filter atau cari di kategori lain
            </p>
            <div className="mt-6">
              <Link
                href="/properties"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Lihat Semua Properti
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {properties.map((property) => {
                const priority = propertyService.getPropertyPriority(property)
                const isSuperPremium = priority === 4
                const isPremium = priority === 3
                const isFeatured = priority === 2

                return (
                  <Link
                    key={property.id}
                    href={`/properties/${property.id}`}
                    className={`bg-white rounded-lg shadow hover:shadow-lg transition-all block ${
                      isSuperPremium ? 'ring-2 ring-yellow-400 transform hover:scale-105' :
                      isPremium ? 'ring-2 ring-blue-400' :
                      isFeatured ? 'ring-2 ring-purple-400' : ''
                    }`}
                  >
                    {/* Property Image */}
                    <div className="relative">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={property.images[0].image_url}
                          alt={property.title}
                          className={`w-full object-cover rounded-t-lg ${
                            isSuperPremium ? 'h-56' : 'h-48'
                          }`}
                        />
                      ) : (
                        <div className={`w-full bg-gray-200 rounded-t-lg flex items-center justify-center ${
                          isSuperPremium ? 'h-56' : 'h-48'
                        }`}>
                          <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {isSuperPremium && (
                          <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            🔥 SUPER PREMIUM
                          </span>
                        )}
                        {isPremium && !isSuperPremium && (
                          <span className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            ⭐ PREMIUM
                          </span>
                        )}
                        {isFeatured && !isPremium && !isSuperPremium && (
                          <span className="bg-gradient-to-r from-purple-400 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            💎 FEATURED
                          </span>
                        )}
                      </div>

                      {/* Views & Priority Indicator */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                          👁 {property.views_count || 0}
                        </div>
                        {priority > 1 && (
                          <div className={`text-white px-2 py-1 rounded text-xs font-bold ${
                            isSuperPremium ? 'bg-yellow-500' :
                            isPremium ? 'bg-blue-500' : 'bg-purple-500'
                          }`}>
                            #{priority - 1}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Property Info */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {property.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {property.city}, {property.province}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-green-600">
                          {propertyService.formatPrice(property.price)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(property.created_at).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <nav className="flex items-center space-x-2">
                  {page > 1 && (
                    <Link
                      href={`/properti/${category}${location ? `?kota=${location}&` : '?'}page=${page - 1}`}
                      className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      ← Previous
                    </Link>
                  )}

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                    if (pageNum > totalPages) return null

                    return (
                      <Link
                        key={pageNum}
                        href={`/properti/${category}${location ? `?kota=${location}&` : '?'}page=${pageNum}`}
                        className={`px-3 py-2 rounded-lg ${
                          pageNum === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </Link>
                    )
                  })}

                  {page < totalPages && (
                    <Link
                      href={`/properti/${category}${location ? `?kota=${location}&` : '?'}page=${page + 1}`}
                      className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Next →
                    </Link>
                  )}
                </nav>
              </div>
            )}
          </>
        )}

        {/* Related Categories */}
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategori Lainnya</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {validCategories.filter(cat => cat !== category).map((cat) => (
              <Link
                key={cat}
                href={`/properti/${cat}`}
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors"
              >
                <div className="text-lg font-medium text-gray-900 capitalize">
                  {categoryNames[cat]}
                </div>
                <div className="text-sm text-gray-500">Dijual</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}