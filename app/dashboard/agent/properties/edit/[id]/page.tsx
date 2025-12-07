'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { propertyService, Property, UpdatePropertyData } from '@/lib/property.service'
import Link from 'next/link'

export default function EditPropertyPage() {
  const [property, setProperty] = useState<Property | null>(null)
  const [formData, setFormData] = useState<UpdatePropertyData>({
    id: '',
    title: '',
    price: 0,
    property_type: 'rumah',
    province: '',
    city: '',
    district: '',
    address: '',
    description: ''
  })
  const [existingImages, setExistingImages] = useState<any[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && params.id) {
      loadProperty()
    }
  }, [user, params.id])

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

  const loadProperty = async () => {
    try {
      const propertyData = await propertyService.getPropertyById(params.id as string)

      // Check if user owns this property
      if (propertyData.agent_id !== user.id) {
        router.push('/forbidden')
        return
      }

      // Check if property can be edited (not sold)
      if (propertyData.status === 'sold') {
        alert('Properti yang sudah terjual tidak dapat diedit')
        router.push('/dashboard/agent/properties')
        return
      }

      setProperty(propertyData)
      setFormData({
        id: propertyData.id,
        title: propertyData.title,
        price: propertyData.price,
        property_type: propertyData.property_type,
        province: propertyData.province,
        city: propertyData.city,
        district: propertyData.district,
        address: propertyData.address,
        description: propertyData.description
      })
      setExistingImages(propertyData.images || [])
    } catch (error) {
      console.error('Error loading property:', error)
      alert('Gagal memuat data properti')
      router.push('/dashboard/agent/properties')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseInt(value) || 0 : value
    }))
  }

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewImages(prev => [...prev, ...files])

    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setNewImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeExistingImage = async (imageId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus foto ini?')) return

    try {
      await propertyService.deletePropertyImage(imageId, user.id)
      setExistingImages(prev => prev.filter(img => img.id !== imageId))
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Gagal menghapus foto')
    }
  }

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index))
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const validateForm = () => {
    if (!formData.title?.trim()) {
      alert('Judul properti wajib diisi')
      return false
    }
    if (!formData.price || formData.price <= 0) {
      alert('Harga properti wajib diisi dan harus lebih dari 0')
      return false
    }
    if (!formData.province?.trim()) {
      alert('Provinsi wajib diisi')
      return false
    }
    if (!formData.city?.trim()) {
      alert('Kota wajib diisi')
      return false
    }
    if (!formData.district?.trim()) {
      alert('Kecamatan wajib diisi')
      return false
    }
    if (!formData.address?.trim()) {
      alert('Alamat lengkap wajib diisi')
      return false
    }
    if (!formData.description?.trim()) {
      alert('Deskripsi properti wajib diisi')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setSaving(true)

    try {
      await propertyService.updateProperty(formData)

      // Upload new images if any
      if (newImages.length > 0) {
        for (const image of newImages) {
          await propertyService.uploadPropertyImage(params.id as string, image, user.id)
        }
      }

      alert('Properti berhasil diperbarui')
      router.push('/dashboard/agent/properties')
    } catch (error) {
      console.error('Error updating property:', error)
      alert('Gagal memperbarui properti. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Properti tidak ditemukan</h2>
          <Link
            href="/dashboard/agent/properties"
            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Kembali ke Daftar Properti
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Properti</h1>
              <p className="text-gray-600 mt-2">Perbarui informasi properti Anda</p>
            </div>
            <Link
              href="/dashboard/agent/properties"
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ← Kembali
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Informasi Dasar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Judul Properti *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Harga (Rp) *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  required
                />
              </div>

              <div>
                <label htmlFor="property_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Properti *
                </label>
                <select
                  id="property_type"
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="rumah">Rumah</option>
                  <option value="tanah">Tanah</option>
                  <option value="kost">Kost</option>
                  <option value="hotel">Hotel</option>
                  <option value="homestay">Homestay</option>
                  <option value="villa">Villa</option>
                  <option value="apartement">Apartemen</option>
                  <option value="ruko">Ruko</option>
                  <option value="gudang">Gudang</option>
                  <option value="komersial">Komersial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Informasi Lokasi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
                  Provinsi *
                </label>
                <input
                  type="text"
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  Kota/Kabupaten *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-2">
                  Kecamatan *
                </label>
                <input
                  type="text"
                  id="district"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Alamat Lengkap *
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Deskripsi Properti</h2>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi Lengkap *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Foto Properti</h2>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Foto Saat Ini</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {existingImages.map((image) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.image_url}
                        alt="Property"
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(image.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Images */}
            <div>
              <label htmlFor="newImages" className="block text-sm font-medium text-gray-700 mb-2">
                Tambah Foto Baru
              </label>
              <input
                type="file"
                id="newImages"
                multiple
                accept="image/*"
                onChange={handleNewImageChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Format: JPG, PNG, WEBP. Maksimal 5MB per foto.
              </p>
            </div>

            {/* New Image Previews */}
            {newImagePreviews.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Foto Baru</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {newImagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`New preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}