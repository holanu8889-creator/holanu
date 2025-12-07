'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { propertyService, Property, PropertyPackage } from '@/lib/property.service'
import Link from 'next/link'

export default function UpgradePropertyPage() {
  const [property, setProperty] = useState<Property | null>(null)
  const [packages, setPackages] = useState<PropertyPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [membershipLimits, setMembershipLimits] = useState<any>(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && params.id) {
      loadData()
    }
  }, [user, params.id])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is approved agent
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('email', user.email)
      .single()

    if (!agent || agent.status !== 'approved') {
      router.push('/forbidden')
      return
    }

    setUser(user)
  }

  const loadData = async () => {
    try {
      // Load property
      const propertyData = await propertyService.getPropertyById(params.id as string)

      // Check ownership
      if (propertyData.agent_id !== user.id) {
        router.push('/forbidden')
        return
      }

      // Check if property can be upgraded (not sold)
      if (propertyData.status === 'sold') {
        alert('Properti yang sudah terjual tidak dapat di-upgrade')
        router.push('/dashboard/agent/properties')
        return
      }

      setProperty(propertyData)

      // Load packages
      const packagesData = await propertyService.getPropertyPackages()
      setPackages(packagesData)

      // Load membership limits
      const limits = await propertyService.getAgentMembershipLimits(user.id)
      setMembershipLimits(limits)

    } catch (error) {
      console.error('Error loading data:', error)
      alert('Gagal memuat data')
      router.push('/dashboard/agent/properties')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (packageId: string) => {
    if (!property) return

    // Check if agent can use this package based on membership
    const selectedPackage = packages.find(p => p.id === packageId)
    if (!selectedPackage) return

    const canUse = await propertyService.canAgentUsePackage(user.id, selectedPackage.name)
    if (!canUse) {
      alert(`Membership Anda tidak mendukung paket ${selectedPackage.name}. Silakan upgrade membership terlebih dahulu.`)
      router.push('/dashboard/agent/membership')
      return
    }

    setUpgrading(packageId)

    try {
      // For demo purposes, we'll simulate payment success
      // In production, this would redirect to payment gateway
      alert(`Upgrade ke paket ${selectedPackage.name} akan mengarahkan ke payment gateway. Untuk demo, paket akan langsung diaktifkan.`)

      // Create order and activate immediately for demo
      const order = await propertyService.upgradePropertyPackage(property.id, packageId, user.id)
      await propertyService.activatePropertyPackage(order.id)

      alert('Paket berhasil diaktifkan!')
      router.push('/dashboard/agent/properties')

    } catch (error) {
      console.error('Error upgrading property:', error)
      alert('Gagal melakukan upgrade. Silakan coba lagi.')
    } finally {
      setUpgrading(null)
    }
  }

  const getPackageStatus = (packageName: string) => {
    if (!property) return null

    const now = new Date()
    const expiryField = `${packageName}_until`

    if (property[expiryField as keyof Property] && new Date(property[expiryField as keyof Property] as string) > now) {
      const expiryDate = new Date(property[expiryField as keyof Property] as string)
      return {
        active: true,
        expiryDate,
        daysLeft: Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    return { active: false }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Properti tidak ditemukan</h2>
          <Link
            href="/dashboard/agent/properties"
            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Kembali ke Daftar Properti
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upgrade Properti</h1>
              <p className="text-gray-600 mt-2">Tingkatkan visibilitas properti Anda</p>
            </div>
            <Link
              href="/dashboard/agent/properties"
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ← Kembali
            </Link>
          </div>
        </div>

        {/* Property Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Informasi Properti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{property.title}</h3>
              <p className="text-gray-600">{property.address}, {property.city}</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {propertyService.formatPrice(property.price)}
              </p>
            </div>
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                property.status === 'approved' ? 'bg-green-100 text-green-800' :
                property.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {propertyService.getStatusLabel(property.status)}
              </span>
              {property.status !== 'approved' && (
                <p className="text-sm text-gray-500 mt-2">
                  Properti harus disetujui admin terlebih dahulu sebelum dapat di-upgrade
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Current Active Packages */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Status Paket Aktif</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['featured', 'premium', 'super_premium'].map((packageName) => {
              const status = getPackageStatus(packageName)
              return (
                <div key={packageName} className={`p-4 rounded-lg border-2 ${
                  status?.active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{packageName}</span>
                    {status?.active ? (
                      <span className="text-green-600 text-sm">✓ Aktif</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Tidak aktif</span>
                    )}
                  </div>
                  {status?.active && (
                    <p className="text-sm text-gray-600 mt-1">
                      {status.daysLeft} hari tersisa
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Membership Info */}
        {membershipLimits && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Batasan Membership</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Max Listing:</span>
                <span className="ml-2 font-medium">
                  {membershipLimits.maxListings === -1 ? 'Unlimited' : membershipLimits.maxListings}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Featured:</span>
                <span className={`ml-2 font-medium ${membershipLimits.canUseFeatured ? 'text-green-600' : 'text-red-600'}`}>
                  {membershipLimits.canUseFeatured ? '✓' : '✗'}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Premium:</span>
                <span className={`ml-2 font-medium ${membershipLimits.canUsePremium ? 'text-green-600' : 'text-red-600'}`}>
                  {membershipLimits.canUsePremium ? '✓' : '✗'}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Super Premium:</span>
                <span className={`ml-2 font-medium ${membershipLimits.canUseSuperPremium ? 'text-green-600' : 'text-red-600'}`}>
                  {membershipLimits.canUseSuperPremium ? '✓' : '✗'}
                </span>
              </div>
            </div>
            <p className="text-blue-700 text-sm mt-3">
              Upgrade membership untuk akses paket premium: <Link href="/dashboard/agent/membership" className="underline hover:text-blue-800">Kelola Membership</Link>
            </p>
          </div>
        )}

        {/* Package Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.map((pkg) => {
            const status = getPackageStatus(pkg.name)
            const canUse = membershipLimits ? membershipLimits[`canUse${pkg.name.charAt(0).toUpperCase() + pkg.name.slice(1)}`] : false

            return (
              <div key={pkg.id} className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                pkg.name === 'super_premium' ? 'ring-2 ring-yellow-400 transform scale-105' :
                pkg.name === 'premium' ? 'ring-2 ring-blue-400' :
                'ring-2 ring-gray-400'
              }`}>
                {/* Header */}
                <div className={`p-6 ${
                  pkg.name === 'super_premium' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  pkg.name === 'premium' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                  'bg-gradient-to-r from-gray-400 to-gray-600'
                } text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold capitalize">{pkg.name.replace('_', ' ')}</h3>
                      <p className="text-sm opacity-90">{pkg.duration_days} hari aktif</p>
                    </div>
                    {pkg.name === 'super_premium' && (
                      <span className="text-2xl">🔥</span>
                    )}
                    {pkg.name === 'premium' && (
                      <span className="text-2xl">⭐</span>
                    )}
                    {pkg.name === 'featured' && (
                      <span className="text-2xl">💎</span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-gray-900">
                      {propertyService.formatPackagePrice(pkg.price)}
                    </div>
                    <div className="text-sm text-gray-500">per {pkg.duration_days} hari</div>
                  </div>

                  {/* Benefits */}
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Prioritas tampil #{pkg.name === 'super_premium' ? '1' : pkg.name === 'premium' ? '2' : '3'}
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Badge {pkg.name.replace('_', ' ')}
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Lebih banyak views
                    </li>
                    {pkg.name === 'super_premium' && (
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        Showcase khusus
                      </li>
                    )}
                  </ul>

                  {/* Status */}
                  {status?.active && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-green-800 text-sm font-medium text-center">
                        ✓ Aktif - {status.daysLeft} hari tersisa
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => handleUpgrade(pkg.id)}
                    disabled={upgrading === pkg.id || !canUse || property.status !== 'approved'}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      pkg.name === 'super_premium'
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white disabled:bg-yellow-300'
                        : pkg.name === 'premium'
                        ? 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300'
                        : 'bg-gray-500 hover:bg-gray-600 text-white disabled:bg-gray-300'
                    } disabled:cursor-not-allowed`}
                  >
                    {upgrading === pkg.id ? 'Memproses...' :
                     !canUse ? 'Upgrade Membership' :
                     property.status !== 'approved' ? 'Properti Belum Disetujui' :
                     status?.active ? 'Perpanjang' : 'Upgrade Sekarang'}
                  </button>

                  {!canUse && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Upgrade membership untuk akses paket ini
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Info */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Penting</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Prioritas Tampil</h4>
              <p>Super Premium → Premium → Featured → Regular</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Pembayaran</h4>
              <p>Melalui Midtrans/Xendit - aman & terpercaya</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Aktivasi</h4>
              <p>Otomatis aktif setelah pembayaran berhasil</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Support</h4>
              <p>WhatsApp: +62 812-3456-7890 | Email: support@holanu.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}