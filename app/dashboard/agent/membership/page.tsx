'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { propertyService, AgentMembership } from '@/lib/property.service'

export default function AgentMembershipPage() {
  const [membership, setMembership] = useState<AgentMembership | null>(null)
  const [limits, setLimits] = useState<any>(null)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadMembership()
    }
  }, [user])

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

  const loadMembership = async () => {
    try {
      const membershipData = await propertyService.getAgentMembership(user.id)
      setMembership(membershipData)

      const limitsData = await propertyService.getAgentMembershipLimits(user.id)
      setLimits(limitsData)
    } catch (error) {
      console.error('Error loading membership:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: AgentMembership['tier']) => {
    if (tier === membership?.tier) return

    setUpgrading(tier)

    try {
      // For demo purposes, simulate payment success
      alert(`Upgrade ke membership ${tier.toUpperCase()} akan mengarahkan ke payment gateway. Untuk demo, membership akan langsung diupgrade.`)

      await propertyService.upgradeAgentMembership(user.id, tier)
      await loadMembership()

      alert(`Selamat! Membership Anda berhasil diupgrade ke ${tier.toUpperCase()}`)
    } catch (error) {
      console.error('Error upgrading membership:', error)
      alert('Gagal melakukan upgrade. Silakan coba lagi.')
    } finally {
      setUpgrading(null)
    }
  }

  const getMembershipConfig = (tier: string) => {
    const configs = {
      free: {
        name: 'Free',
        price: 0,
        maxListings: 5,
        features: ['5 listing properti', 'Support basic', 'Komunitas agent'],
        color: 'gray',
        icon: '🎁'
      },
      pro: {
        name: 'Pro',
        price: 50000,
        maxListings: 50,
        features: ['50 listing properti', 'Paket Featured', 'Support prioritas', 'Analytics dashboard', 'Marketing tools'],
        color: 'blue',
        icon: '⭐'
      },
      agency: {
        name: 'Agency',
        price: 500000,
        maxListings: -1,
        features: ['Unlimited listing', 'Semua paket premium', 'Dedicated support', 'Custom branding', 'API access', 'White-label solution'],
        color: 'purple',
        icon: '🏢'
      }
    }
    return configs[tier as keyof typeof configs]
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">Membership Agent</h1>
              <p className="text-gray-600 mt-2">Kelola dan upgrade membership Anda</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/agent')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ← Kembali ke Dashboard
            </button>
          </div>
        </div>

        {/* Current Membership Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Status Membership Saat Ini</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                membership?.tier === 'free' ? 'bg-gray-100' :
                membership?.tier === 'pro' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
                <span className="text-2xl">
                  {membership?.tier === 'free' ? '🎁' :
                   membership?.tier === 'pro' ? '⭐' : '🏢'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {membership?.tier || 'free'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {membership?.expired_at
                  ? `Berakhir: ${new Date(membership.expired_at).toLocaleDateString('id-ID')}`
                  : 'Tidak berakhir'
                }
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {limits?.maxListings === -1 ? '∞' : limits?.maxListings || 0}
              </div>
              <p className="text-sm text-gray-500">Maksimal Listing</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {limits?.canUseSuperPremium ? '✅' : limits?.canUsePremium ? '⭐' : limits?.canUseFeatured ? '💎' : '❌'}
              </div>
              <p className="text-sm text-gray-500">Paket Premium</p>
            </div>
          </div>
        </div>

        {/* Membership Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {['free', 'pro', 'agency'].map((tier) => {
            const config = getMembershipConfig(tier)
            const isCurrentPlan = membership?.tier === tier
            const isExpired = membership?.expired_at && new Date(membership.expired_at) < new Date()

            return (
              <div
                key={tier}
                className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                  tier === 'agency' ? 'ring-2 ring-purple-400 transform scale-105' :
                  tier === 'pro' ? 'ring-2 ring-blue-400' : ''
                } ${isCurrentPlan ? 'ring-2 ring-green-400' : ''}`}
              >
                {/* Header */}
                <div className={`p-6 text-center ${
                  tier === 'agency' ? 'bg-gradient-to-r from-purple-500 to-purple-700' :
                  tier === 'pro' ? 'bg-gradient-to-r from-blue-500 to-blue-700' :
                  'bg-gradient-to-r from-gray-500 to-gray-700'
                } text-white`}>
                  <div className="text-4xl mb-2">{config.icon}</div>
                  <h3 className="text-xl font-bold">{config.name}</h3>
                  <div className="text-3xl font-bold mt-2">
                    {config.price === 0 ? 'Gratis' : formatPrice(config.price)}
                    {config.price > 0 && <span className="text-sm font-normal">/bulan</span>}
                  </div>
                </div>

                {/* Features */}
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {config.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Status Badge */}
                  {isCurrentPlan && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-green-800 text-sm font-medium text-center">
                        ✓ Plan Aktif Saat Ini
                        {isExpired && membership?.tier === tier && (
                          <span className="block text-xs mt-1">Sudah kadaluarsa</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => handleUpgrade(tier as AgentMembership['tier'])}
                    disabled={upgrading === tier || isCurrentPlan}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      tier === 'agency'
                        ? 'bg-purple-500 hover:bg-purple-600 text-white disabled:bg-purple-300'
                        : tier === 'pro'
                        ? 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300'
                        : 'bg-gray-500 hover:bg-gray-600 text-white disabled:bg-gray-300'
                    } disabled:cursor-not-allowed`}
                  >
                    {upgrading === tier ? 'Memproses...' :
                     isCurrentPlan ? 'Plan Saat Ini' :
                     config.price === 0 ? 'Pilih Plan' : 'Upgrade Sekarang'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Usage Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistik Penggunaan</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {limits?.maxListings === -1 ? '∞' : limits?.maxListings || 0}
              </div>
              <div className="text-sm text-gray-500">Limit Listing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {limits?.canUseFeatured ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-500">Featured Package</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {limits?.canUsePremium ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-500">Premium Package</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {limits?.canUseSuperPremium ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-500">Super Premium</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pertanyaan Umum</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">Apa perbedaan antara Free, Pro, dan Agency?</h4>
              <p className="text-sm text-gray-600 mt-1">
                Free untuk agent pemula dengan limit 5 listing. Pro untuk agent aktif dengan 50 listing dan akses paket premium. Agency untuk kantor properti dengan unlimited listing dan fitur enterprise.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Bagaimana cara pembayaran?</h4>
              <p className="text-sm text-gray-600 mt-1">
                Pembayaran dilakukan melalui Midtrans/Xendit dengan berbagai metode: transfer bank, e-wallet, kartu kredit, dll.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Bisakah downgrade membership?</h4>
              <p className="text-sm text-gray-600 mt-1">
                Ya, Anda bisa downgrade membership kapan saja. Limit akan diterapkan pada periode berikutnya.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Ada refund jika tidak cocok?</h4>
              <p className="text-sm text-gray-600 mt-1">
                Refund tersedia dalam 7 hari pertama dengan syarat belum menggunakan fitur premium.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Butuh bantuan? Hubungi support kami di{' '}
            <a href="mailto:support@holanu.com" className="text-blue-600 hover:text-blue-500">
              support@holanu.com
            </a>
            {' '}atau WhatsApp{' '}
            <a href="https://wa.me/6281234567890" className="text-green-600 hover:text-green-500">
              +62 812-3456-7890
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}