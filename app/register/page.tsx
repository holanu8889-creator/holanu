'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Nama lengkap wajib diisi')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email wajib diisi')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Format email tidak valid')
      return false
    }
    if (formData.password.length < 8) {
      setError('Password minimal 8 karakter')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Konfirmasi password tidak cocok')
      return false
    }
    return true
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'user'
          }
        }
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.')
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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 to-blue-700 p-12 flex-col justify-center">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white mb-4">HOLANU</h1>
          <p className="text-xl text-blue-100 mb-8">
            Marketplace Properti Modern Indonesia
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="w-32 h-32 bg-white/20 rounded-xl mb-4 flex items-center justify-center">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <p className="text-white text-sm">
              Daftar sekarang dan temukan properti impian Anda dengan mudah.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Daftar ke Holanu</h2>
              <p className="text-gray-600">Buat akun untuk mulai menjelajahi properti</p>
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

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Nama lengkap Anda"
                    required
                    suppressHydrationWarning
                  />
                  <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="nama@email.com"
                    required
                    suppressHydrationWarning
                  />
                  <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Minimal 8 karakter"
                    required
                    suppressHydrationWarning
                  />
                  <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                  </svg>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92 1.11-1.11c1.73-4.39 6-7.5 11-7.5-1.73-4.39-6-7.5-11-7.5S2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5 0-.55.45-1 1-1 0-2.76-2.24-5-5-5z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Ulangi password Anda"
                    required
                    suppressHydrationWarning
                  />
                  <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                  </svg>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92 1.11-1.11c1.73-4.39 6-7.5 11-7.5-1.73-4.39-6-7.5-11-7.5S2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5 0-.55.45-1 1-1 0-2.76-2.24-5-5-5z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" suppressHydrationWarning>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {loading ? 'Mendaftarkan...' : 'Daftar'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Sudah punya akun?{' '}
                <a href="/login" className="text-blue-600 hover:text-blue-500 transition-colors font-medium">
                  Masuk
                </a>
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Dengan mendaftar, Anda menyetujui{' '}
                <a href="/terms-of-service" className="text-blue-600 hover:text-blue-500 transition-colors">
                  Syarat & Ketentuan
                </a>
                {' '}dan{' '}
                <a href="/privacy-policy" className="text-blue-600 hover:text-blue-500 transition-colors">
                  Kebijakan Privasi
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}