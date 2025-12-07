'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function RegisterAgentPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    whatsapp: '',
    city: '',
    agentType: 'individual'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    if (!formData.whatsapp.trim()) {
      setError('Nomor WhatsApp wajib diisi')
      return false
    }
    if (!/^\d+$/.test(formData.whatsapp.replace(/\D/g, ''))) {
      setError('Nomor WhatsApp hanya boleh angka')
      return false
    }
    if (!formData.city.trim()) {
      setError('Kota operasional wajib diisi')
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
      // Sign up user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'agent'
          }
        }
      })

      if (authError) {
        setError(authError.message)
        return
      }

      // Insert agent data
      const { error: agentError } = await supabase
        .from('agents')
        .insert({
          name: formData.fullName,
          email: formData.email,
          whatsapp: formData.whatsapp.replace(/\D/g, ''), // Remove non-numeric characters
          city: formData.city,
          agent_type: formData.agentType,
          status: 'pending'
        })

      if (agentError) {
        console.error('Agent insert error:', agentError)
        // If agent insert fails, we should still show success since auth succeeded
        // The agent data can be added later by admin
      }

      setSuccess('Pendaftaran berhasil! Akun Anda menunggu verifikasi admin. Kami akan mengirim notifikasi melalui email.')
      setTimeout(() => {
        router.push('/login')
      }, 5000)

    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-900 to-green-700 p-12 flex-col justify-center">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white mb-4">HOLANU</h1>
          <p className="text-xl text-green-100 mb-8">
            Bergabunglah sebagai Agent Properti Profesional
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="w-32 h-32 bg-white/20 rounded-xl mb-4 flex items-center justify-center">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <p className="text-white text-sm">
              Jadilah bagian dari jaringan agent properti terpercaya di Indonesia.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Register Agent Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                Pendaftaran Agent
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Daftar sebagai Agent</h2>
              <p className="text-gray-600">Bergabunglah dengan komunitas agent properti profesional</p>
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
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="nama@email.com"
                    required
                    suppressHydrationWarning
                  />
                  <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Min 8 karakter"
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
                    Konfirmasi
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Ulangi password"
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
              </div>

              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="81234567890"
                    required
                    suppressHydrationWarning
                  />
                  <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    Kota Operasional
                  </label>
                  <div className="relative">
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Jakarta"
                      required
                      suppressHydrationWarning
                    />
                    <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                </div>

                <div>
                  <label htmlFor="agentType" className="block text-sm font-medium text-gray-700 mb-2">
                    Jenis Agent
                  </label>
                  <div className="relative">
                    <select
                      id="agentType"
                      name="agentType"
                      value={formData.agentType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all appearance-none"
                      required
                      suppressHydrationWarning
                    >
                      <option value="individual">Perorangan</option>
                      <option value="office">Kantor Properti</option>
                    </select>
                    <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <svg className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" fill="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" suppressHydrationWarning>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {loading ? 'Mendaftarkan...' : 'Daftar sebagai Agent'}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">
                Daftar sebagai pembeli?{' '}
                <a href="/register" className="text-green-600 hover:text-green-500 transition-colors font-medium">
                  Daftar di sini
                </a>
              </p>
              <p className="text-sm text-gray-600">
                Sudah punya akun?{' '}
                <a href="/login" className="text-green-600 hover:text-green-500 transition-colors font-medium">
                  Masuk
                </a>
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Dengan mendaftar, Anda menyetujui{' '}
                <a href="/terms-of-service" className="text-green-600 hover:text-green-500 transition-colors">
                  Syarat & Ketentuan
                </a>
                {' '}dan{' '}
                <a href="/privacy-policy" className="text-green-600 hover:text-green-500 transition-colors">
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