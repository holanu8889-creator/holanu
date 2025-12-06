'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import FormInput from '@/components/FormInput'
import FileUploader from '@/components/FileUploader'
import Toast from '@/components/Toast'

const PROPERTY_TYPES = [
  { value: 'rumah', label: 'Rumah' },
  { value: 'tanah', label: 'Tanah' },
  { value: 'kost', label: 'Kost' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'villa', label: 'Villa' },
  { value: 'apartemen', label: 'Apartemen' },
  { value: 'ruko', label: 'Ruko' },
  { value: 'gudang', label: 'Gudang' },
]

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'live', label: 'Live' },
  { value: 'sold', label: 'Sold' },
]

const BADGES = [
  { value: '', label: 'Tidak ada' },
  { value: 'free', label: 'Free' },
  { value: 'featured', label: 'Featured' },
  { value: 'premium', label: 'Premium' },
  { value: 'super_premium', label: 'Super Premium' },
]

interface Property {
  id: string
  title: string
  type: string
  status: string
  description: string
  price: number
  location_prov: string
  location_kota: string
  location_kecamatan: string
  badge: string
  images: string[]
}

export default function EditListingPage() {
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    status: 'draft',
    description: '',
    price: '',
    location_prov: '',
    location_kota: '',
    location_kecamatan: '',
    badge: '',
  })
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })
  const router = useRouter()
  const params = useParams()
  const propertyId = params.id as string

  useEffect(() => {
    fetchProperty()
  }, [propertyId])

  const fetchProperty = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('agent_id', user.id)
        .single()

      if (error || !data) {
        showToast('Listing tidak ditemukan', 'error')
        router.push('/dashboard/agent')
        return
      }

      setFormData({
        title: data.title || '',
        type: data.type || '',
        status: data.status || 'draft',
        description: data.description || '',
        price: data.price?.toString() || '',
        location_prov: data.location_prov || '',
        location_kota: data.location_kota || '',
        location_kecamatan: data.location_kecamatan || '',
        badge: data.badge || '',
      })
      setExistingImages(data.images || [])
    } catch (error) {
      console.error('Error fetching property:', error)
      showToast('Gagal memuat data listing', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.title || !formData.type || !formData.price || !formData.location_prov || !formData.location_kota) {
      showToast('Mohon lengkapi semua field yang wajib', 'error')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      let allImages = [...existingImages]

      // Upload new images
      if (newFiles.length > 0) {
        for (const file of newFiles) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `properties/${user.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(filePath, file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(filePath)

          allImages.push(publicUrl)
        }
      }

      // Update property record
      const { error } = await supabase
        .from('properties')
        .update({
          title: formData.title,
          type: formData.type,
          status: formData.status,
          description: formData.description,
          price: parseInt(formData.price),
          location_prov: formData.location_prov,
          location_kota: formData.location_kota,
          location_kecamatan: formData.location_kecamatan,
          badge: formData.badge,
          images: allImages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId)
        .eq('agent_id', user.id)

      if (error) throw error

      showToast('Listing berhasil diperbarui!', 'success')
      setTimeout(() => router.push('/dashboard/agent'), 2000)

    } catch (error) {
      console.error('Error updating listing:', error)
      showToast('Gagal memperbarui listing. Silakan coba lagi.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
        <p className="text-gray-600">Perbarui informasi listing properti</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput
            label="Judul Properti"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Contoh: Rumah Minimalis 2 Lantai"
            required
          />

          <FormInput
            label="Jenis Properti"
            name="type"
            type="select"
            value={formData.type}
            onChange={handleInputChange}
            options={PROPERTY_TYPES}
            required
          />

          <FormInput
            label="Status Listing"
            name="status"
            type="select"
            value={formData.status}
            onChange={handleInputChange}
            options={STATUSES}
          />

          <FormInput
            label="Harga (Rp)"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleInputChange}
            placeholder="Contoh: 500000000"
            required
          />

          <FormInput
            label="Provinsi"
            name="location_prov"
            value={formData.location_prov}
            onChange={handleInputChange}
            placeholder="Contoh: Jawa Barat"
            required
          />

          <FormInput
            label="Kota/Kabupaten"
            name="location_kota"
            value={formData.location_kota}
            onChange={handleInputChange}
            placeholder="Contoh: Bandung"
            required
          />

          <FormInput
            label="Kecamatan"
            name="location_kecamatan"
            value={formData.location_kecamatan}
            onChange={handleInputChange}
            placeholder="Contoh: Cidadap"
          />

          <FormInput
            label="Badge"
            name="badge"
            type="select"
            value={formData.badge}
            onChange={handleInputChange}
            options={BADGES}
          />
        </div>

        <FormInput
          label="Deskripsi"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Jelaskan detail properti, fasilitas, keunggulan, dll."
          rows={4}
        />

        <FileUploader
          onFilesChange={setNewFiles}
          maxFiles={10}
          maxFileSize={5}
          existingFiles={existingImages}
        />

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </>
            ) : (
              'Simpan Perubahan'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}