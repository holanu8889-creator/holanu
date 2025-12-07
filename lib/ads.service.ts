import { supabase } from './supabaseClient'
import { propertyService } from './property.service'

export interface AdCampaign {
  id: string
  agent_id: string
  name: string
  campaign_type: 'featured' | 'premium' | 'super_premium' | 'banner'
  target_location?: {
    province?: string
    city?: string
    district?: string
  }
  budget: number
  bid_type: 'flat_fee' | 'cpc' | 'cpm'
  bid_amount: number
  start_at: string
  end_at: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface AdImpression {
  id: string
  campaign_id: string
  property_id?: string
  user_id?: string
  timestamp: string
  event_type: 'impression' | 'click' | 'whatsapp_click'
  meta: Record<string, any>
  session_id?: string
  cost_incurred: number
}

export interface AdTransaction {
  id: string
  campaign_id: string
  agent_id: string
  amount: number
  payment_method: string
  external_payment_id?: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  notes?: string
  created_at: string
  updated_at: string
}

export interface AdSlot {
  id: string
  slot_name: string
  position: string
  description?: string
  max_width: number
  max_height: number
  is_active: boolean
  priority: number
  created_at: string
}

export interface AIDescription {
  id: string
  property_id: string
  agent_id: string
  prompt_used: string
  model: string
  generated_text: string
  variant_index: number
  tokens_used?: number
  cost_incurred: number
  created_at: string
}

export interface CampaignAnalytics {
  impressions: number
  clicks: number
  whatsapp_clicks: number
  ctr: number // Click-through rate
  total_spend: number
  remaining_budget: number
  days_remaining: number
}

export class AdsService {
  // =========================================
  // CAMPAIGN MANAGEMENT
  // =========================================

  static async createCampaign(campaignData: Omit<AdCampaign, 'id' | 'created_at' | 'updated_at'>): Promise<AdCampaign> {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .insert([campaignData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateCampaign(id: string, updates: Partial<AdCampaign>): Promise<AdCampaign> {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getCampaigns(agentId?: string): Promise<AdCampaign[]> {
    let query = supabase.from('ad_campaigns').select('*').order('created_at', { ascending: false })

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  static async getCampaignById(id: string): Promise<AdCampaign | null> {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async activateCampaign(id: string, paymentId?: string): Promise<void> {
    const updates: Partial<AdCampaign> = { status: 'active' }

    if (paymentId) {
      // Create transaction record
      await this.createTransaction({
        campaign_id: id,
        agent_id: '', // Will be set from campaign
        amount: 0, // Will be calculated
        payment_method: 'gateway',
        external_payment_id: paymentId,
        status: 'paid'
      })
    }

    await this.updateCampaign(id, updates)
  }

  static async pauseCampaign(id: string): Promise<void> {
    await this.updateCampaign(id, { status: 'paused' })
  }

  static async cancelCampaign(id: string): Promise<void> {
    await this.updateCampaign(id, { status: 'cancelled' })
  }

  // =========================================
  // IMPRESSION TRACKING
  // =========================================

  static async trackImpression(
    campaignId: string,
    propertyId?: string,
    eventType: 'impression' | 'click' | 'whatsapp_click' = 'impression',
    meta: Record<string, any> = {}
  ): Promise<void> {
    // Check if campaign is active and within budget
    const campaign = await this.getCampaignById(campaignId)
    if (!campaign || campaign.status !== 'active') return

    // Check date range
    const now = new Date()
    const startDate = new Date(campaign.start_at)
    const endDate = new Date(campaign.end_at)

    if (now < startDate || now > endDate) return

    // Calculate cost
    const cost = await this.calculateCost(campaignId, eventType)
    if (cost === null) return // Invalid event type for bid type

    // Check budget
    if (!await this.checkBudget(campaignId, cost)) return

    // Create session ID for deduplication
    const sessionId = this.generateSessionId(meta)

    // Check for recent duplicate (30 second window)
    const isDuplicate = await this.checkDuplicateImpression(campaignId, sessionId, eventType)
    if (isDuplicate) return

    // Record impression
    const { error } = await supabase
      .from('ad_impressions')
      .insert([{
        campaign_id: campaignId,
        property_id: propertyId,
        event_type: eventType,
        meta,
        session_id: sessionId,
        cost_incurred: cost
      }])

    if (error) throw error
  }

  static async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const { data: impressions, error } = await supabase
      .from('ad_impressions')
      .select('event_type, cost_incurred')
      .eq('campaign_id', campaignId)

    if (error) throw error

    const analytics = {
      impressions: 0,
      clicks: 0,
      whatsapp_clicks: 0,
      ctr: 0,
      total_spend: 0,
      remaining_budget: 0,
      days_remaining: 0
    }

    impressions?.forEach(imp => {
      analytics.total_spend += imp.cost_incurred

      switch (imp.event_type) {
        case 'impression':
          analytics.impressions++
          break
        case 'click':
          analytics.clicks++
          break
        case 'whatsapp_click':
          analytics.whatsapp_clicks++
          break
      }
    })

    // Calculate CTR
    if (analytics.impressions > 0) {
      analytics.ctr = ((analytics.clicks + analytics.whatsapp_clicks) / analytics.impressions) * 100
    }

    // Get campaign for budget and dates
    const campaign = await this.getCampaignById(campaignId)
    if (campaign) {
      analytics.remaining_budget = campaign.budget - analytics.total_spend

      const endDate = new Date(campaign.end_at)
      const now = new Date()
      analytics.days_remaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    }

    return analytics
  }

  // =========================================
  // PAYMENT & TRANSACTIONS
  // =========================================

  static async createTransaction(transactionData: Omit<AdTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<AdTransaction> {
    const { data, error } = await supabase
      .from('ad_transactions')
      .insert([transactionData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateTransactionStatus(id: string, status: AdTransaction['status'], externalId?: string): Promise<void> {
    const updates: Partial<AdTransaction> = { status }
    if (externalId) updates.external_payment_id = externalId

    const { error } = await supabase
      .from('ad_transactions')
      .update(updates)
      .eq('id', id)

    if (error) throw error
  }

  // =========================================
  // AI DESCRIPTION GENERATOR
  // =========================================

  static async generateAIDescription(
    propertyId: string,
    agentId: string,
    options: {
      tone: 'formal' | 'casual' | 'persuasive'
      length: 'short' | 'medium' | 'long'
      focus: 'seo' | 'selling_points' | 'family_friendly' | 'investment'
      variantCount?: number
    }
  ): Promise<AIDescription[]> {
    // Get property data
    const property = await propertyService.getPropertyById(propertyId)
    if (!property) throw new Error('Property not found')

    // Build prompt
    const prompt = this.buildAIPrompt(property, options)

    // Call AI API (placeholder - will be implemented with actual LLM)
    const variants = await this.callAIGenerator(prompt, options.variantCount || 3)

    // Save to database
    const descriptions: Omit<AIDescription, 'id' | 'created_at'>[] = variants.map((text, index) => ({
      property_id: propertyId,
      agent_id: agentId,
      prompt_used: prompt,
      model: 'gpt-3.5-turbo', // placeholder
      generated_text: text,
      variant_index: index + 1,
      tokens_used: Math.floor(text.length / 4), // rough estimate
      cost_incurred: 0.002 // placeholder cost
    }))

    const { data, error } = await supabase
      .from('ai_descriptions')
      .insert(descriptions)
      .select()

    if (error) throw error
    return data || []
  }

  static async getAIDescriptions(propertyId: string, agentId: string): Promise<AIDescription[]> {
    const { data, error } = await supabase
      .from('ai_descriptions')
      .select('*')
      .eq('property_id', propertyId)
      .eq('agent_id', agentId)
      .order('variant_index')

    if (error) throw error
    return data || []
  }

  // =========================================
  // AD SLOTS MANAGEMENT
  // =========================================

  static async getActiveAdSlots(): Promise<AdSlot[]> {
    const { data, error } = await supabase
      .from('ad_slots')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async getAdSlots(): Promise<AdSlot[]> {
    const { data, error } = await supabase
      .from('ad_slots')
      .select('*')
      .order('priority', { ascending: false })

    if (error) throw error
    return data || []
  }

  // =========================================
  // UTILITY FUNCTIONS
  // =========================================

  private static async calculateCost(campaignId: string, eventType: string): Promise<number | null> {
    const { data, error } = await supabase
      .rpc('calculate_campaign_cost', {
        campaign_id: campaignId,
        event_type: eventType
      })

    if (error) throw error
    return data
  }

  private static async checkBudget(campaignId: string, additionalCost: number): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('check_campaign_budget', {
        campaign_id: campaignId
      })

    if (error) throw error
    return data
  }

  private static generateSessionId(meta: Record<string, any>): string {
    const components = [
      meta.ip || 'unknown',
      meta.user_agent || 'unknown',
      Date.now().toString().slice(0, -3) // Minute precision for session
    ]
    return btoa(components.join('|')).slice(0, 50)
  }

  private static async checkDuplicateImpression(
    campaignId: string,
    sessionId: string,
    eventType: string
  ): Promise<boolean> {
    const thirtySecondsAgo = new Date(Date.now() - 30000)

    const { data, error } = await supabase
      .from('ad_impressions')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('session_id', sessionId)
      .eq('event_type', eventType)
      .gte('timestamp', thirtySecondsAgo.toISOString())
      .limit(1)

    if (error) throw error
    return (data?.length || 0) > 0
  }

  private static buildAIPrompt(property: any, options: any): string {
    const { tone, length, focus } = options

    const toneInstructions = {
      formal: 'Gunakan bahasa yang sopan dan profesional',
      casual: 'Gunakan bahasa yang ramah dan santai',
      persuasive: 'Gunakan bahasa yang persuasif dan menarik'
    }

    const lengthInstructions = {
      short: 'Buat deskripsi singkat 50-80 kata',
      medium: 'Buat deskripsi sedang 120-180 kata',
      long: 'Buat deskripsi lengkap 250-350 kata'
    }

    const focusInstructions = {
      seo: 'Sertakan kata kunci untuk SEO seperti "dijual", "lokasi strategis", "harga terjangkau"',
      selling_points: 'Fokus pada keunggulan dan fasilitas properti',
      family_friendly: 'Tekankan kesesuaian untuk keluarga',
      investment: 'Soroti potensi investasi dan keuntungan'
    }

    return `Buat deskripsi properti dalam bahasa Indonesia untuk listing berikut:

TIPE PROPERTI: ${property.property_type}
LOKASI: ${property.address}, ${property.district}, ${property.city}, ${property.province}
HARGA: ${propertyService.formatPrice(property.price)}
FASILITAS: ${property.description || 'Tidak ada deskripsi tambahan'}

INSTRUKSI:
- ${toneInstructions[tone as keyof typeof toneInstructions]}
- ${lengthInstructions[length as keyof typeof lengthInstructions]}
- ${focusInstructions[focus as keyof typeof focusInstructions]}
- Buat deskripsi yang menarik dan informatif
- Sertakan detail lokasi dan aksesibilitas
- Sebutkan keunggulan properti`
  }

  private static async callAIGenerator(prompt: string, variantCount: number): Promise<string[]> {
    // Placeholder for AI API call
    // In production, this would call OpenAI, Anthropic, or other LLM APIs

    const variants = []
    for (let i = 0; i < variantCount; i++) {
      // Mock AI response - replace with actual API call
      variants.push(`${prompt}\n\n[AI Generated Description Variant ${i + 1}]\n\nDeskripsi properti yang menarik dan informatif dengan fokus pada keunggulan lokasi dan fasilitas yang tersedia.`)
    }

    return variants
  }

  // =========================================
  // ADMIN FUNCTIONS
  // =========================================

  static async getAllCampaigns(filters?: {
    status?: string
    campaign_type?: string
    agent_id?: string
  }): Promise<AdCampaign[]> {
    let query = supabase.from('ad_campaigns').select('*').order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.campaign_type) query = query.eq('campaign_type', filters.campaign_type)
    if (filters?.agent_id) query = query.eq('agent_id', filters.agent_id)

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  static async getSystemAnalytics(): Promise<{
    total_campaigns: number
    active_campaigns: number
    total_revenue: number
    total_impressions: number
    total_clicks: number
  }> {
    // This would be implemented with complex queries
    // For now, return mock data
    return {
      total_campaigns: 0,
      active_campaigns: 0,
      total_revenue: 0,
      total_impressions: 0,
      total_clicks: 0
    }
  }
}