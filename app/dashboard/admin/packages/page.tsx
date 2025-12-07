'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { propertyService, PropertyPackageOrder } from '@/lib/property.service'

type PackageOrderWithDetails = PropertyPackageOrder & {
  package: any
  property: { title: string; status: string }
  agent: { name: string; email: string }
}

export default function AdminPackagesPage() {
  const [orders, setOrders] = useState<PackageOrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      router.push('/forbidden')
      return
    }

    setUser(user)
  }

  const loadData = async () => {
    try {
      const ordersData = await propertyService.getPropertyPackageOrders()
      setOrders(ordersData)

      // Calculate stats
      const statsData = {
        total: ordersData.length,
        pending: ordersData.filter(o => o.status === 'pending').length,
        paid: ordersData.filter(o => o.status === 'paid').length,
        expired: ordersData.filter(o => o.status === 'expired').length,
        canceled: ordersData.filter(o => o.status === 'canceled').length,
        revenue: ordersData
          .filter(o => o.status === 'paid')
          .reduce((sum, o) => sum + (o.package?.price || 0), 0)
      }
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setProcessing(orderId)

    try {
      if (newStatus === 'paid') {
        await propertyService.activatePropertyPackage(orderId, user.id)
      } else {
        // For other status changes, just update the order
        const { error } = await supabase
          .from('property_package_orders')
          .update({ status: newStatus })
          .eq('id', orderId)

        if (error) throw error
      }

      await loadData() // Reload data

      const messages = {
        paid: 'Paket berhasil diaktifkan',
        rejected: 'Order berhasil ditolak',
        canceled: 'Order berhasil dibatalkan'
      }

      alert(messages[newStatus as keyof typeof messages] || 'Status berhasil diubah')
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Gagal mengubah status order')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      expired: 'bg-gray-100 text-gray-800',
      canceled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manajemen Paket Upgrade</h1>
            <p className="text-gray-600 mt-2">Monitor dan kelola semua transaksi upgrade properti</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Order</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.paid}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Canceled</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.canceled}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Expired</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{propertyService.formatPackagePrice(stats.revenue)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada order paket</h3>
              <p className="mt-1 text-sm text-gray-500">Belum ada agent yang melakukan upgrade paket properti.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Package
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">#{order.id.slice(-8)}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.agent?.name}</div>
                        <div className="text-sm text-gray-500">{order.agent?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 line-clamp-2">{order.property?.title}</div>
                        <div className="text-sm text-gray-500">
                          Status: {order.property?.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {order.package?.name.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {propertyService.formatPackagePrice(order.package?.price || 0)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.package?.duration_days} hari
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status === 'pending' ? 'Menunggu' :
                           order.status === 'paid' ? 'Lunas' :
                           order.status === 'expired' ? 'Kadaluarsa' :
                           order.status === 'canceled' ? 'Dibatalkan' : order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">{order.payment_method}</div>
                        {order.paid_at && (
                          <div className="text-sm text-gray-500">
                            {new Date(order.paid_at).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(order.id, 'paid')}
                                disabled={processing === order.id}
                                className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md text-xs font-medium disabled:opacity-50"
                              >
                                {processing === order.id ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleStatusChange(order.id, 'canceled')}
                                disabled={processing === order.id}
                                className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md text-xs font-medium disabled:opacity-50"
                              >
                                {processing === order.id ? '...' : 'Reject'}
                              </button>
                            </>
                          )}
                          {order.status === 'paid' && (
                            <span className="text-green-600 text-xs">Aktif</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.total || 0}</div>
              <div className="text-sm text-gray-500">Total Order</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.paid || 0}</div>
              <div className="text-sm text-gray-500">Order Sukses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats ? Math.round((stats.paid / stats.total) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-500">Conversion Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}