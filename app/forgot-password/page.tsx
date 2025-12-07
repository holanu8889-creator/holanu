'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Email wajib diisi')
      setLoading(false)
      return
    }

    if (!validateEmail(email)) {
      setError('Format email tidak valid')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Link reset password telah dikirim ke email Anda. Silakan cek inbox Anda.')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-900 to-purple-700 p-12 flex-col justify-center">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white mb-4">HOLANU</h1>
          <p className="text-xl text-purple-100 mb-8">
            Reset Password Anda dengan Mudah
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="w-32 h-32 bg-white/20 rounded-xl mb-4 flex items-center justify-center">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
              </svg>
            </div>
            <p className="text-white text-sm">
              Kami akan mengirim link reset password ke email Anda dalam hitungan detik.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Lupa Password</h2>
              <p className="text-gray-600">Masukkan email Anda untuk menerima link reset password</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="nama@email.com"
                    required
                    suppressHydrationWarning
                  />
                  <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" suppressHydrationWarning>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {loading ? 'Mengirim...' : 'Kirim Link Reset Password'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Ingat password Anda?{' '}
                <a href="/login" className="text-purple-600 hover:text-purple-500 transition-colors font-medium">
                  Kembali ke Login
                </a>
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Belum punya akun?{' '}
                <a href="/register" className="text-purple-600 hover:text-purple-500 transition-colors font-medium">
                  Daftar sekarang
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}