'use client'

import { useState } from 'react'
import { AdsService, AIDescription } from '@/lib/ads.service'

interface AIDescriptionGeneratorProps {
  propertyId: string
  onDescriptionSelect?: (description: string) => void
}

export default function AIDescriptionGenerator({ propertyId, onDescriptionSelect }: AIDescriptionGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [descriptions, setDescriptions] = useState<AIDescription[]>([])
  const [existingDescriptions, setExistingDescriptions] = useState<AIDescription[]>([])

  // Form state
  const [options, setOptions] = useState({
    tone: 'formal' as 'formal' | 'casual' | 'persuasive',
    length: 'medium' as 'short' | 'medium' | 'long',
    focus: 'selling_points' as 'seo' | 'selling_points' | 'family_friendly' | 'investment',
    variantCount: 3
  })

  const loadExistingDescriptions = async () => {
    try {
      const response = await fetch(`/api/ai/generate?property_id=${propertyId}`)
      const data = await response.json()
      if (data.descriptions) {
        setExistingDescriptions(data.descriptions)
      }
    } catch (error) {
      console.error('Error loading existing descriptions:', error)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: propertyId,
          ...options
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.upgrade_required) {
          alert('Limit AI description habis. Upgrade membership untuk generate lebih banyak.')
          return
        }
        throw new Error(data.error || 'Failed to generate descriptions')
      }

      setDescriptions(data.descriptions)
      setExistingDescriptions(prev => [...prev, ...data.descriptions])

      if (data.usage) {
        alert(`Deskripsi berhasil di-generate! Sisa limit: ${data.usage.remaining}`)
      }
    } catch (error) {
      console.error('Error generating descriptions:', error)
      alert('Gagal generate deskripsi. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDescription = (description: AIDescription) => {
    if (onDescriptionSelect) {
      onDescriptionSelect(description.generated_text)
    }
    setIsOpen(false)
  }

  const openModal = () => {
    setIsOpen(true)
    loadExistingDescriptions()
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Generate AI Description
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">AI Description Generator</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Generation Options */}
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan Generate</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tone
                  </label>
                  <select
                    value={options.tone}
                    onChange={(e) => setOptions(prev => ({ ...prev, tone: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="persuasive">Persuasif</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Panjang
                  </label>
                  <select
                    value={options.length}
                    onChange={(e) => setOptions(prev => ({ ...prev, length: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="short">Pendek (50-80 kata)</option>
                    <option value="medium">Sedang (120-180 kata)</option>
                    <option value="long">Panjang (250-350 kata)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fokus
                  </label>
                  <select
                    value={options.focus}
                    onChange={(e) => setOptions(prev => ({ ...prev, focus: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="selling_points">Keunggulan Penjualan</option>
                    <option value="seo">SEO Optimized</option>
                    <option value="family_friendly">Ramah Keluarga</option>
                    <option value="investment">Investasi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jumlah Varian
                  </label>
                  <select
                    value={options.variantCount}
                    onChange={(e) => setOptions(prev => ({ ...prev, variantCount: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value={1}>1 Varian</option>
                    <option value={2}>2 Varian</option>
                    <option value={3}>3 Varian</option>
                    <option value={4}>4 Varian</option>
                    <option value={5}>5 Varian</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Generate Descriptions
                  </>
                )}
              </button>
            </div>

            {/* Generated Descriptions */}
            {descriptions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Deskripsi yang Dihasilkan</h3>
                <div className="space-y-4">
                  {descriptions.map((desc, index) => (
                    <div key={desc.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-purple-600">
                          Varian {desc.variant_index}
                        </span>
                        <button
                          onClick={() => handleSelectDescription(desc)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Pilih Deskripsi Ini
                        </button>
                      </div>
                      <p className="text-gray-700 whitespace-pre-line">{desc.generated_text}</p>
                      <div className="mt-3 text-xs text-gray-500">
                        Model: {desc.model} | Token: {desc.tokens_used} | Cost: Rp {desc.cost_incurred.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Descriptions */}
            {existingDescriptions.length > 0 && descriptions.length === 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Deskripsi Sebelumnya</h3>
                <div className="space-y-4">
                  {existingDescriptions.map((desc) => (
                    <div key={desc.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-gray-600">
                          Varian {desc.variant_index} - {new Date(desc.created_at).toLocaleDateString('id-ID')}
                        </span>
                        <button
                          onClick={() => handleSelectDescription(desc)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Gunakan Lagi
                        </button>
                      </div>
                      <p className="text-gray-700 whitespace-pre-line">{desc.generated_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Tips Penggunaan AI</h4>
                  <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
                    <li>Pilih tone yang sesuai dengan target audiens Anda</li>
                    <li>SEO focus akan menyertakan kata kunci lokal</li>
                    <li>Anda bisa edit deskripsi yang dihasilkan sebelum menyimpan</li>
                    <li>Generate beberapa varian untuk pilihan yang lebih banyak</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}