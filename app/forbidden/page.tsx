'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ForbiddenPage() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center transform transition-all duration-300 hover:shadow-3xl">
          {/* Icon with animation */}
          <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Title with gradient */}
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
            Akses Ditolak
          </h1>

          {/* Description */}
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            Anda tidak memiliki izin untuk mengakses halaman ini.
            Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
          </p>

          {/* Actions with hover effects */}
          <div className="space-y-4">
            <button
              onClick={() => router.back()}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              ← Kembali ke Halaman Sebelumnya
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:bg-gray-50 hover:shadow-md"
            >
              🏠 Ke Dashboard
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              🚪 Logout
            </button>
          </div>

          {/* Footer with contact */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">
              Mengalami masalah akses?
            </p>
            <div className="flex justify-center space-x-4">
              <a
                href="mailto:support@holanu.com"
                className="text-blue-600 hover:text-blue-500 transition-colors font-medium"
              >
                📧 Email Support
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="https://wa.me/6281234567890"
                className="text-green-600 hover:text-green-500 transition-colors font-medium"
              >
                💬 WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute bottom-10 right-10 w-16 h-16 bg-purple-200 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  )
}