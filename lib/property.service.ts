import { supabase } from './supabaseClient'

export interface Property {
  id: string
  agent_id: string
  title: string
  price: number
  property_type: 'rumah' | 'tanah' | 'kost' | 'hotel' | 'homestay' | 'villa' | 'apartement' | 'ruko' | 'gudang' | 'komersial'
  province: string
  city: string
  district: string
  address: string
  description: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'sold' | 'expired'
  is_featured: boolean
  is_premium: boolean
  is_super_premium: boolean
  views_count: number
  whatsapp_click: number
  created_at: string
  updated_at: string
  agent?: {
    name: string
    email: string
    whatsapp: string
  }
  images?: PropertyImage[]
}

export interface PropertyImage {
  id: string
  property_id: string
  image_url: string
  created_at: string
}

export interface CreatePropertyData {
  title: string
  price: number
  property_type: Property['property_type']
  province: string
  city: string
  district: string
  address: string
  description: string
  status: Property['status']
  is_featured?: boolean
  is_premium?: boolean
  is_super_premium?: boolean
}

export interface UpdatePropertyData extends Partial<CreatePropertyData> {
  id: string
}

export interface PropertyFilters {
  property_type?: string
  city?: string
  min_price?: number
  max_price?: number
  status?: string
  is_featured?: boolean
  is_premium?: boolean
  agent_id?: string
}

class PropertyService {
  // Get all properties with filters and pagination
  async getProperties(filters: PropertyFilters = {}, page = 1, limit = 12) {
    let query = supabase
      .from('properties')
      .select(`
        *,
        agent:agents(name, email, whatsapp),
        images:property_images(*)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.property_type) {
      query = query.eq('property_type', filters.property_type)
    }
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`)
    }
    if (filters.min_price !== undefined) {
      query = query.gte('price', filters.min_price)
    }
    if (filters.max_price !== undefined) {
      query = query.lte('price', filters.max_price)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.is_featured !== undefined) {
      query = query.eq('is_featured', filters.is_featured)
    }
    if (filters.is_premium !== undefined) {
      query = query.eq('is_premium', filters.is_premium)
    }
    if (filters.agent_id) {
      query = query.eq('agent_id', filters.agent_id)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      properties: data as Property[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  }

  // Get single property by ID
  async getPropertyById(id: string) {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        agent:agents(name, email, whatsapp),
        images:property_images(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    // Increment views count
    await this.incrementViews(id)

    return data as Property
  }

  // Get property by slug (for public pages)
  async getPropertyBySlug(slug: string) {
    // For now, we'll use ID as slug. In production, you might want a separate slug field
    return this.getPropertyById(slug)
  }

  // Create new property
  async createProperty(propertyData: CreatePropertyData, agentId: string) {
    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        agent_id: agentId,
        views_count: 0,
        whatsapp_click: 0
      })
      .select()
      .single()

    if (error) throw error

    return data as Property
  }

  // Update property
  async updateProperty(updateData: UpdatePropertyData) {
    const { id, ...data } = updateData

    const { data: updatedProperty, error } = await supabase
      .from('properties')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return updatedProperty as Property
  }

  // Delete property
  async deleteProperty(id: string, agentId?: string) {
    let query = supabase.from('properties').delete().eq('id', id)

    // If agentId provided, ensure agent can only delete their own properties
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { error } = await query

    if (error) throw error

    // Also delete associated images
    await this.deletePropertyImages(id)
  }

  // Update property status (admin only)
  async updatePropertyStatus(id: string, status: Property['status'], adminReason?: string) {
    const { data, error } = await supabase
      .from('properties')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return data as Property
  }

  // Increment views count
  async incrementViews(id: string) {
    // Get current views count
    const { data: current } = await supabase
      .from('properties')
      .select('views_count')
      .eq('id', id)
      .single()

    if (current) {
      await supabase
        .from('properties')
        .update({
          views_count: (current.views_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    }
  }

  // Increment WhatsApp clicks
  async incrementWhatsappClicks(id: string) {
    // Get current whatsapp clicks
    const { data: current } = await supabase
      .from('properties')
      .select('whatsapp_click')
      .eq('id', id)
      .single()

    if (current) {
      await supabase
        .from('properties')
        .update({
          whatsapp_click: (current.whatsapp_click || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    }
  }

  // Image management
  async uploadPropertyImage(propertyId: string, file: File, agentId: string) {
    // Verify property ownership
    const { data: property } = await supabase
      .from('properties')
      .select('agent_id')
      .eq('id', propertyId)
      .single()

    if (!property || property.agent_id !== agentId) {
      throw new Error('Unauthorized to upload images for this property')
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${propertyId}/${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName)

    // Save to database
    const { data, error } = await supabase
      .from('property_images')
      .insert({
        property_id: propertyId,
        image_url: urlData.publicUrl
      })
      .select()
      .single()

    if (error) throw error

    return data as PropertyImage
  }

  // Delete property image
  async deletePropertyImage(imageId: string, agentId: string) {
    // Get image data first
    const { data: image, error: fetchError } = await supabase
      .from('property_images')
      .select('image_url, property_id')
      .eq('id', imageId)
      .single()

    if (fetchError) throw fetchError

    // Verify property ownership
    const { data: property } = await supabase
      .from('properties')
      .select('agent_id')
      .eq('id', image.property_id)
      .single()

    if (!property || property.agent_id !== agentId) {
      throw new Error('Unauthorized to delete this image')
    }

    // Delete from storage
    const fileName = image.image_url.split('/').pop()
    if (fileName) {
      await supabase.storage
        .from('property-images')
        .remove([`${image.property_id}/${fileName}`])
    }

    // Delete from database
    const { error } = await supabase
      .from('property_images')
      .delete()
      .eq('id', imageId)

    if (error) throw error
  }

  // Delete all images for a property
  async deletePropertyImages(propertyId: string) {
    // Get all images
    const { data: images } = await supabase
      .from('property_images')
      .select('image_url')
      .eq('property_id', propertyId)

    if (images && images.length > 0) {
      // Delete from storage
      const fileNames = images.map(img => {
        const fileName = img.image_url.split('/').pop()
        return fileName ? `${propertyId}/${fileName}` : null
      }).filter(Boolean)

      if (fileNames.length > 0) {
        await supabase.storage
          .from('property-images')
          .remove(fileNames as string[])
      }
    }

    // Delete from database
    await supabase
      .from('property_images')
      .delete()
      .eq('property_id', propertyId)
  }

  // Get property statistics
  async getPropertyStats(agentId?: string) {
    let query = supabase
      .from('properties')
      .select('status, views_count, whatsapp_click')

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data.length,
      draft: data.filter(p => p.status === 'draft').length,
      pending: data.filter(p => p.status === 'pending').length,
      approved: data.filter(p => p.status === 'approved').length,
      rejected: data.filter(p => p.status === 'rejected').length,
      sold: data.filter(p => p.status === 'sold').length,
      totalViews: data.reduce((sum, p) => sum + (p.views_count || 0), 0),
      totalWhatsappClicks: data.reduce((sum, p) => sum + (p.whatsapp_click || 0), 0)
    }

    return stats
  }

  // Generate property slug (for future use)
  generateSlug(title: string, id: string): string {
    return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${id}`
  }

  // Format price to Rupiah
  formatPrice(price: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  // Get property type label
  getPropertyTypeLabel(type: Property['property_type']): string {
    const labels = {
      rumah: 'Rumah',
      tanah: 'Tanah',
      kost: 'Kost',
      hotel: 'Hotel',
      homestay: 'Homestay',
      villa: 'Villa',
      apartement: 'Apartemen',
      ruko: 'Ruko',
      gudang: 'Gudang',
      komersial: 'Komersial'
    }
    return labels[type] || type
  }

  // Get status label
  getStatusLabel(status: Property['status']): string {
    const labels = {
      draft: 'Draft',
      pending: 'Menunggu Review',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      sold: 'Terjual',
      expired: 'Kadaluarsa'
    }
    return labels[status] || status
  }

  // Get status color
  getStatusColor(status: Property['status']): string {
    const colors = {
      draft: 'gray',
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      sold: 'blue',
      expired: 'gray'
    }
    return colors[status] || 'gray'
  }
}

export const propertyService = new PropertyService()