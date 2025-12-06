'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Card from '@/components/Card'
import { StatCard, BarChart, LineChart } from '@/components/Chart'
import Toast from '@/components/Toast'

interface Stats {
  totalListings: number
  totalAgents: number
  totalViews: number
  totalWhatsAppClicks: number
  listingsByStatus: { label: string; value: number; color: string }[]
  viewsByDay: { label: string; value: number }[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalListings: 0,
    totalAgents: 0,
    totalViews: 0,
    totalWhatsAppClicks: 0,
    listingsByStatus: [],
    viewsByDay: [],
  })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch total listings
      const { count: totalListings } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })

      // Fetch total agents
      const { count: totalAgents } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agent')

      // Fetch total views and WhatsApp clicks
      const { data: properties } = await supabase
        .from('properties')
        .select('views, whatsapp_clicks')

      const totalViews = properties?.reduce((sum, prop) => sum + (prop.views || 0), 0) || 0
      const totalWhatsAppClicks = properties?.reduce((sum, prop) => sum + (prop.whatsapp_clicks || 0), 0) || 0

      // Fetch listings by status
      const { data: statusData } = await supabase
        .from('properties')
        .select('status')

      const statusCounts = statusData?.reduce((acc, prop) => {
        acc[prop.status] = (acc[prop.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const listingsByStatus = [
        { label: 'Live', value: statusCounts.live || 0, color: 'bg-green-500' },
        { label: 'Pending', value: statusCounts.pending || 0, color: 'bg-yellow-500' },
        { label: 'Draft', value: statusCounts.draft || 0, color: 'bg-gray-500' },
        { label: 'Sold', value: statusCounts.sold || 0, color: 'bg-red-500' },
      ]

      // Mock data for views by day (last 7 days)
      const viewsByDay = [
        { label: 'Mon', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Tue', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Wed', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Thu', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Fri', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Sat', value: Math.floor(Math.random() * 100) + 50 },
        { label: 'Sun', value: Math.floor(Math.random() * 100) + 50 },
      ]

      setStats({
        totalListings: totalListings || 0,
        totalAgents: totalAgents || 0,
        totalViews,
        totalWhatsAppClicks,
        listingsByStatus,
        viewsByDay,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      showToast('Gagal memuat statistik', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-gray-600">Pantau performa marketplace HOLANU</p>
        </div>
        <button
          onClick={fetchStats}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-all flex items-center"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Listing"
          value={stats.totalListings}
          icon="🏠"
          change="+12% dari bulan lalu"
          changeType="positive"
        />
        <StatCard
          title="Active Agent"
          value={stats.totalAgents}
          icon="👥"
          change="+5% dari bulan lalu"
          changeType="positive"
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews.toLocaleString()}
          icon="👁️"
          change="+8% dari minggu lalu"
          changeType="positive"
        />
        <StatCard
          title="WhatsApp Clicks"
          value={stats.totalWhatsAppClicks.toLocaleString()}
          icon="💬"
          change="+15% dari minggu lalu"
          changeType="positive"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart
          data={stats.listingsByStatus}
          title="Listing berdasarkan Status"
          height={300}
        />
        <LineChart
          data={stats.viewsByDay}
          title="Views dalam 7 hari terakhir"
          height={300}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              ✅
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Listing "Villa Mewah Bandung" disetujui</p>
              <p className="text-xs text-gray-500">2 jam yang lalu</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              👤
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Agent baru "Ahmad Surya" diverifikasi</p>
              <p className="text-xs text-gray-500">4 jam yang lalu</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              ⭐
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Listing "Apartemen Premium" di-set Featured</p>
              <p className="text-xs text-gray-500">6 jam yang lalu</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}