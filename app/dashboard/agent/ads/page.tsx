'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { AdsService, AdCampaign, CampaignAnalytics } from '@/lib/ads.service'

export default function AgentAdsPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [analytics, setAnalytics] = useState<Record<string, CampaignAnalytics>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    campaign_type: 'featured' as AdCampaign['campaign_type'],
    target_location: {
      province: '',
      city: '',
      district: ''
    },
    budget: '',
    bid_type: 'flat_fee' as AdCampaign['bid_type'],
    bid_amount: '',
    start_at: '',
    end_at: ''
  })

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadCampaigns()
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is agent
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'agent') {
      router.push('/forbidden')
      return
    }

    setUser(user)
  }

  const loadCampaigns = async () => {
    try {
      const campaignsData = await AdsService.getCampaigns(user.id)
      setCampaigns(campaignsData)

      // Load analytics for each campaign
      const analyticsData: Record<string, CampaignAnalytics> = {}
      for (const campaign of campaignsData) {
        if (campaign.status === 'active' || campaign.status === 'completed') {
          analyticsData[campaign.id] = await AdsService.getCampaignAnalytics(campaign.id)
        }
      }
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const campaign = await AdsService.createCampaign({
        agent_id: user.id,
        name: formData.name,
        campaign_type: formData.campaign_type,
        target_location: formData.target_location,
        budget: parseInt(formData.budget),
        bid_type: formData.bid_type,
        bid_amount: parseInt(formData.bid_amount),
        start_at: formData.start_at,
        end_at: formData.end_at,
        status: 'draft'
      })

      setCampaigns(prev => [campaign, ...prev])
      setShowCreateForm(false)
      setFormData({
        name: '',
        campaign_type: 'featured',
        target_location: { province: '', city: '', district: '' },
        budget: '',
        bid_type: 'flat_fee',
        bid_amount: '',
        start_at: '',
        end_at: ''
      })

      alert('Kampanye berhasil dibuat!')
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Gagal membuat kampanye')
    }
  }

  const handleStatusChange = async (campaignId: string, action: 'activate' | 'pause' | 'cancel') => {
    try {
      switch (action) {
        case 'activate':
          await AdsService.activateCampaign(campaignId)
          break
        case 'pause':
          await AdsService.pauseCampaign(campaignId)
          break
        case 'cancel':
          await AdsService.cancelCampaign(campaignId)
          break
      }

      await loadCampaigns()
      alert(`Kampanye berhasil ${action === 'activate' ? 'diaktifkan' : action === 'pause' ? 'dijeda' : 'dibatalkan'}`)
    } catch (error) {
      console.error('Error updating campaign:', error)
      alert('Gagal mengupdate kampanye')
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getCampaignTypeLabel = (type: string) => {
    const labels = {
      featured: 'Featured',
      premium: 'Premium',
      super_premium: 'Super Premium',
      banner: 'Banner'
    }
    return labels[type as keyof typeof labels] || type
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manajemen Iklan</h1>
              <p className="text-gray-600 mt-2">Kelola kampanye iklan properti Anda</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Buat Kampanye Baru
            </button>
          </div>
        </div>

        {/* Create Campaign Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Buat Kampanye Iklan</h2>

              <form onSubmit={handleCreateCampaign} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Kampanye
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contoh: Promosi Rumah Jakarta Selatan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Kampanye
                  </label>
                  <select
                    value={formData.campaign_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, campaign_type: e.target.value as AdCampaign['campaign_type'] }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="featured">Featured - Rp 50.000/hari</option>
                    <option value="premium">Premium - Rp 100.000/hari</option>
                    <option value="super_premium">Super Premium - Rp 200.000/hari</option>
                    <option value="banner">Banner - Rp 25.000/hari</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provinsi Target
                    </label>
                    <input
                      type="text"
                      value={formData.target_location.province}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        target_location: { ...prev.target_location, province: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="DKI Jakarta"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kota Target
                    </label>
                    <input
                      type="text"
                      value={formData.target_location.city}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        target_location: { ...prev.target_location, city: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Jakarta Selatan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kecamatan Target
                    </label>
                    <input
                      type="text"
                      value={formData.target_location.district}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        target_location: { ...prev.target_location, district: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Setiabudi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model Penagihan
                    </label>
                    <select
                      value={formData.bid_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, bid_type: e.target.value as AdCampaign['bid_type'] }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="flat_fee">Flat Fee - Total Biaya</option>
                      <option value="cpc">CPC - Per Klik</option>
                      <option value="cpm">CPM - Per 1000 Impression</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="100000"
                      min="10000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Biaya per Unit (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.bid_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, bid_amount: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="50000"
                      min="1000"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Mulai
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_at: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Selesai
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.end_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_at: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Buat Kampanye
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Campaigns List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Kampanye Iklan Anda</h2>
          </div>

          {campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Belum ada kampanye iklan</h3>
              <p className="mt-2 text-gray-500">Buat kampanye pertama Anda untuk mempromosikan properti</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Buat Kampanye Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kampanye
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Analytics
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign) => {
                    const campaignAnalytics = analytics[campaign.id]
                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(campaign.start_at).toLocaleDateString('id-ID')} - {new Date(campaign.end_at).toLocaleDateString('id-ID')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {getCampaignTypeLabel(campaign.campaign_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                            {campaign.status === 'draft' ? 'Draft' :
                             campaign.status === 'active' ? 'Aktif' :
                             campaign.status === 'paused' ? 'Dijeda' :
                             campaign.status === 'completed' ? 'Selesai' :
                             campaign.status === 'cancelled' ? 'Dibatalkan' : campaign.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Rp {campaign.budget.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {campaignAnalytics ? (
                            <div>
                              <div>👁 {campaignAnalytics.impressions}</div>
                              <div>👆 {campaignAnalytics.clicks}</div>
                              <div>💰 Rp {campaignAnalytics.total_spend.toLocaleString('id-ID')}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {campaign.status === 'draft' && (
                              <button
                                onClick={() => handleStatusChange(campaign.id, 'activate')}
                                className="text-green-600 hover:text-green-900 px-3 py-1 text-xs bg-green-100 rounded"
                              >
                                Aktifkan
                              </button>
                            )}
                            {campaign.status === 'active' && (
                              <button
                                onClick={() => handleStatusChange(campaign.id, 'pause')}
                                className="text-yellow-600 hover:text-yellow-900 px-3 py-1 text-xs bg-yellow-100 rounded"
                              >
                                Jeda
                              </button>
                            )}
                            {(campaign.status === 'draft' || campaign.status === 'paused') && (
                              <button
                                onClick={() => handleStatusChange(campaign.id, 'cancel')}
                                className="text-red-600 hover:text-red-900 px-3 py-1 text-xs bg-red-100 rounded"
                              >
                                Batal
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}