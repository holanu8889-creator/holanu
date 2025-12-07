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
  featured_until?: string
  premium_until?: string
  super_premium_until?: string
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
  package_orders?: PropertyPackageOrder[]
}

export interface PropertyImage {
  id: string
  property_id: string
  image_url: string
  created_at: string
}

export interface PropertyPackage {
  id: string
  name: 'featured' | 'premium' | 'super_premium'
  price: number
  duration_days: number
  created_at: string
}

export interface PropertyPackageOrder {
  id: string
  property_id: string
  agent_id: string
  package_id: string
  status: 'pending' | 'paid' | 'expired' | 'canceled'
  payment_method: string
  paid_at?: string
  expired_at?: string
  created_at: string
  package?: PropertyPackage
}

export interface AgentMembership {
  id: string
  agent_id: string
  tier: 'free' | 'pro' | 'agency'
  expired_at?: string
  created_at: string
}

export interface MembershipPayment {
  id: string
  agent_id: string
  tier: 'free' | 'pro' | 'agency'
  amount: number
  payment_method: string
  status: 'pending' | 'paid' | 'expired' | 'canceled'
  paid_at?: string
  expired_at?: string
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
        images:property_images(*),
        package_orders:property_package_orders(
          *,
          package:property_packages(*)
        )
      `)

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

    // Get data first, then sort by priority
    const { data, error, count } = await query

    if (error) throw error

    // Sort by priority: Super Premium > Premium > Featured > Regular
    const sortedData = (data as Property[]).sort((a, b) => {
      const now = new Date()

      // Check active packages
      const aSuperPremium = a.super_premium_until && new Date(a.super_premium_until) > now ? 4 : 0
      const aPremium = a.premium_until && new Date(a.premium_until) > now ? 3 : 0
      const aFeatured = a.featured_until && new Date(a.featured_until) > now ? 2 : 0
      const aPriority = aSuperPremium || aPremium || aFeatured || 1

      const bSuperPremium = b.super_premium_until && new Date(b.super_premium_until) > now ? 4 : 0
      const bPremium = b.premium_until && new Date(b.premium_until) > now ? 3 : 0
      const bFeatured = b.featured_until && new Date(b.featured_until) > now ? 2 : 0
      const bPriority = bSuperPremium || bPremium || bFeatured || 1

      // Higher priority first, then by creation date
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Apply pagination after sorting
    const from = (page - 1) * limit
    const to = from + limit - 1
    const paginatedData = sortedData.slice(from, to + 1)

    return {
      properties: paginatedData,
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

  // Package management methods
  async getPropertyPackages() {
    const { data, error } = await supabase
      .from('property_packages')
      .select('*')
      .order('price', { ascending: true })

    if (error) throw error

    return data as PropertyPackage[]
  }

  async upgradePropertyPackage(propertyId: string, packageId: string, agentId: string) {
    // Verify property ownership
    const { data: property } = await supabase
      .from('properties')
      .select('agent_id')
      .eq('id', propertyId)
      .single()

    if (!property || property.agent_id !== agentId) {
      throw new Error('Unauthorized to upgrade this property')
    }

    // Get package details
    const { data: packageData } = await supabase
      .from('property_packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (!packageData) {
      throw new Error('Package not found')
    }

    // Create order
    const expiredAt = new Date()
    expiredAt.setDate(expiredAt.getDate() + packageData.duration_days)

    const { data: order, error: orderError } = await supabase
      .from('property_package_orders')
      .insert({
        property_id: propertyId,
        agent_id: agentId,
        package_id: packageId,
        status: 'pending',
        payment_method: 'midtrans', // Default, will be updated by payment gateway
        expired_at: expiredAt.toISOString()
      })
      .select()
      .single()

    if (orderError) throw orderError

    return order as PropertyPackageOrder
  }

  async activatePropertyPackage(orderId: string, adminId?: string) {
    // Get order details
    const { data: order } = await supabase
      .from('property_package_orders')
      .select(`
        *,
        package:property_packages(*),
        property:properties(id, agent_id)
      `)
      .eq('id', orderId)
      .single()

    if (!order) {
      throw new Error('Order not found')
    }

    // Update order status
    const { error: orderUpdateError } = await supabase
      .from('property_package_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (orderUpdateError) throw orderUpdateError

    // Update property package status
    const packageName = order.package.name
    const expiredAt = order.expired_at

    const updateData: any = {}
    updateData[`${packageName}_until`] = expiredAt
    updateData[`is_${packageName}`] = true
    updateData.updated_at = new Date().toISOString()

    const { error: propertyUpdateError } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', order.property_id)

    if (propertyUpdateError) throw propertyUpdateError

    return order
  }

  async getPropertyPackageOrders(agentId?: string) {
    let query = supabase
      .from('property_package_orders')
      .select(`
        *,
        package:property_packages(*),
        property:properties(title, status),
        agent:agents(name, email)
      `)
      .order('created_at', { ascending: false })

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data, error } = await query

    if (error) throw error

    return data as (PropertyPackageOrder & {
      package: PropertyPackage
      property: { title: string; status: string }
      agent: { name: string; email: string }
    })[]
  }

  // Membership management
  async getAgentMembership(agentId: string) {
    const { data, error } = await supabase
      .from('agent_memberships')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned

    return data as AgentMembership | null
  }

  async upgradeAgentMembership(agentId: string, tier: AgentMembership['tier']) {
    const membershipConfig = {
      free: { duration: 0, price: 0 },
      pro: { duration: 30, price: 50000 },
      agency: { duration: 365, price: 500000 }
    }

    const config = membershipConfig[tier]
    const expiredAt = tier === 'free' ? null : new Date(Date.now() + config.duration * 24 * 60 * 60 * 1000).toISOString()

    // Create or update membership
    const { data, error } = await supabase
      .from('agent_memberships')
      .upsert({
        agent_id: agentId,
        tier,
        expired_at: expiredAt
      })
      .select()
      .single()

    if (error) throw error

    return data as AgentMembership
  }

  async getAgentMembershipLimits(agentId: string) {
    const membership = await this.getAgentMembership(agentId)

    const limits = {
      free: { maxListings: 5, canUseFeatured: false, canUsePremium: false, canUseSuperPremium: false },
      pro: { maxListings: 50, canUseFeatured: true, canUsePremium: false, canUseSuperPremium: false },
      agency: { maxListings: -1, canUseFeatured: true, canUsePremium: true, canUseSuperPremium: true } // -1 = unlimited
    }

    return membership ? limits[membership.tier] : limits.free
  }

  async canAgentCreateListing(agentId: string) {
    const limits = await this.getAgentMembershipLimits(agentId)

    if (limits.maxListings === -1) return true // Unlimited

    // Count current approved listings
    const { count } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .in('status', ['pending', 'approved'])

    return (count || 0) < limits.maxListings
  }

  async canAgentUsePackage(agentId: string, packageName: string) {
    const limits = await this.getAgentMembershipLimits(agentId)

    switch (packageName) {
      case 'featured':
        return limits.canUseFeatured
      case 'premium':
        return limits.canUsePremium
      case 'super_premium':
        return limits.canUseSuperPremium
      default:
        return false
    }
  }

  // Cron job simulation - check expired packages
  async checkExpiredPackages() {
    const now = new Date().toISOString()

    // Update properties where packages have expired
    const { error } = await supabase.rpc('check_expired_property_packages', { current_time: now })

    if (error) {
      // Fallback if RPC doesn't exist
      console.log('RPC function not found, using manual update')

      // Reset expired featured
      await supabase
        .from('properties')
        .update({
          is_featured: false,
          featured_until: null,
          updated_at: now
        })
        .lt('featured_until', now)
        .eq('is_featured', true)

      // Reset expired premium
      await supabase
        .from('properties')
        .update({
          is_premium: false,
          premium_until: null,
          updated_at: now
        })
        .lt('premium_until', now)
        .eq('is_premium', true)

      // Reset expired super premium
      await supabase
        .from('properties')
        .update({
          is_super_premium: false,
          super_premium_until: null,
          updated_at: now
        })
        .lt('super_premium_until', now)
        .eq('is_super_premium', true)
    }
  }

  // Get package priority for sorting
  getPropertyPriority(property: Property): number {
    const now = new Date()

    if (property.super_premium_until && new Date(property.super_premium_until) > now) return 4
    if (property.premium_until && new Date(property.premium_until) > now) return 3
    if (property.featured_until && new Date(property.featured_until) > now) return 2

    return 1 // Regular
  }

  // Format package price
  formatPackagePrice(price: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }
}

export const propertyService = new PropertyService()