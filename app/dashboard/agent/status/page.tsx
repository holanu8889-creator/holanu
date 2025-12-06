'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Card from '@/components/Card'
import Toast from '@/components/Toast'

export default function AgentStatusPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Status Agent Pending</h1>
          <p className="text-gray-600 text-lg">Akun agent Anda sedang dalam proses verifikasi</p>
        </div>

        {/* Status Card */}
        <Card className="mb-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium mb-4">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Menunggu Verifikasi
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Halo, {user?.user_metadata?.full_name || 'Agent'}!</h2>
            <p className="text-gray-600 mb-6">
              Terima kasih telah mendaftar sebagai agent HOLANU.
              Tim kami sedang memverifikasi data Anda untuk memastikan kualitas layanan.
            </p>
          </div>
        </Card>

        {/* What to expect */}
        <Card className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Apa yang akan terjadi selanjutnya?</h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Verifikasi Data</h4>
                <p className="text-gray-600 text-sm">Tim kami akan memverifikasi identitas dan dokumen Anda dalam 1-3 hari kerja.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Pelatihan</h4>
                <p className="text-gray-600 text-sm">Setelah verifikasi, Anda akan mendapat akses ke platform dan pelatihan singkat.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Go Live</h4>
                <p className="text-gray-600 text-sm">Akhirnya, Anda dapat mulai menambah listing properti dan melayani klien.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Support */}
        <Card className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Butuh Bantuan?</h3>
          <p className="text-gray-600 mb-4">
            Jika Anda memiliki pertanyaan atau ingin mempercepat proses verifikasi,
            silakan hubungi tim support kami.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:support@holanu.com"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all text-center"
            >
              📧 Email Support
            </a>
            <a
              href="https://wa.me/6281234567890"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all text-center"
            >
              💬 WhatsApp
            </a>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all"
          >
            🔄 Refresh Status
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-all"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  )
}