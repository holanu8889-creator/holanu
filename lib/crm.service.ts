import { supabase } from './supabaseClient'

export interface Lead {
  id: string
  property_id?: string
  agent_id?: string
  user_name: string
  user_phone: string
  user_email?: string
  source: 'whatsapp' | 'contact_form' | 'call' | 'website'
  message?: string
  status: 'new' | 'contacted' | 'qualified' | 'not_interested' | 'converted' | 'lost'
  priority: 'low' | 'normal' | 'high'
  score: number
  last_contacted_at?: string
  converted_at?: string
  created_at: string
  updated_at: string
}

export interface LeadMessage {
  id: string
  lead_id: string
  from_role: 'visitor' | 'agent' | 'system'
  from_id?: string
  content: string
  channel: 'whatsapp' | 'web' | 'email' | 'call'
  message_type: 'text' | 'image' | 'file' | 'template'
  external_message_id?: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  delivered_at?: string
  read_at?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface LeadAssignment {
  id: string
  lead_id: string
  assigned_to: string
  assigned_by?: string
  assignment_type: 'auto' | 'manual' | 'escalation'
  notes?: string
  created_at: string
}

export interface LeadNote {
  id: string
  lead_id: string
  author_id: string
  note: string
  note_type: 'general' | 'follow_up' | 'complaint' | 'escalation'
  is_private: boolean
  created_at: string
}

export interface WhatsAppTemplate {
  id: string
  name: string
  template_text: string
  variables_json: string[]
  category: 'general' | 'greeting' | 'follow_up' | 'closing' | 'complaint'
  is_active: boolean
  usage_count: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface WhatsAppConversation {
  id: string
  phone_number: string
  whatsapp_id?: string
  lead_id?: string
  status: 'active' | 'blocked' | 'expired'
  last_message_at: string
  created_at: string
}

export interface CRMAnalytics {
  total_leads: number
  new_leads_today: number
  converted_leads: number
  conversion_rate: number
  avg_response_time: number
  messages_sent_today: number
  active_conversations: number
}

export interface AgentPerformance {
  agent_id: string
  agent_name: string
  leads_assigned: number
  leads_converted: number
  conversion_rate: number
  avg_response_time: number
  messages_sent: number
  customer_satisfaction: number
}

export class CRMService {
  // =========================================
  // LEAD MANAGEMENT
  // =========================================

  static async createLead(leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'score'>): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single()

    if (error) throw error

    // Calculate initial score
    const score = await this.calculateLeadScore(data.id)
    await this.updateLeadScore(data.id, score)

    // Auto-assign lead
    await this.autoAssignLead(data.id)

    return { ...data, score }
  }

  static async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getLeads(filters?: {
    agent_id?: string
    status?: string
    priority?: string
    source?: string
    limit?: number
    offset?: number
  }): Promise<{ leads: Lead[], total: number }> {
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filters?.agent_id) {
      query = query.eq('agent_id', filters.agent_id)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters?.source) {
      query = query.eq('source', filters.source)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1)
    }

    const { data, error, count } = await query
    if (error) throw error

    return { leads: data || [], total: count || 0 }
  }

  static async getLeadById(id: string): Promise<Lead | null> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async getLeadByPhone(phone: string): Promise<Lead | null> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  // =========================================
  // LEAD MESSAGES
  // =========================================

  static async addMessage(messageData: Omit<LeadMessage, 'id' | 'created_at'>): Promise<LeadMessage> {
    const { data, error } = await supabase
      .from('lead_messages')
      .insert([messageData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getLeadMessages(leadId: string): Promise<LeadMessage[]> {
    const { data, error } = await supabase
      .from('lead_messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async updateMessageStatus(messageId: string, status: LeadMessage['status'], deliveredAt?: string, readAt?: string): Promise<void> {
    const updates: Partial<LeadMessage> = { status }
    if (deliveredAt) updates.delivered_at = deliveredAt
    if (readAt) updates.read_at = readAt

    const { error } = await supabase
      .from('lead_messages')
      .update(updates)
      .eq('id', messageId)

    if (error) throw error
  }

  // =========================================
  // LEAD ASSIGNMENTS
  // =========================================

  static async assignLead(leadId: string, agentId: string, assignedBy?: string, notes?: string): Promise<LeadAssignment> {
    // Create assignment record
    const { data: assignment, error: assignmentError } = await supabase
      .from('lead_assignments')
      .insert([{
        lead_id: leadId,
        assigned_to: agentId,
        assigned_by: assignedBy,
        assignment_type: assignedBy ? 'manual' : 'auto',
        notes
      }])
      .select()
      .single()

    if (assignmentError) throw assignmentError

    // Update lead
    await this.updateLead(leadId, { agent_id: agentId })

    return assignment
  }

  static async getLeadAssignments(leadId: string): Promise<LeadAssignment[]> {
    const { data, error } = await supabase
      .from('lead_assignments')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // =========================================
  // LEAD NOTES
  // =========================================

  static async addNote(noteData: Omit<LeadNote, 'id' | 'created_at'>): Promise<LeadNote> {
    const { data, error } = await supabase
      .from('lead_notes')
      .insert([noteData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getLeadNotes(leadId: string): Promise<LeadNote[]> {
    const { data, error } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // =========================================
  // WHATSAPP TEMPLATES
  // =========================================

  static async getTemplates(category?: string): Promise<WhatsAppTemplate[]> {
    let query = supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  static async incrementTemplateUsage(templateId: string): Promise<void> {
    const { error } = await supabase
      .rpc('increment', {
        table_name: 'whatsapp_templates',
        column_name: 'usage_count',
        row_id: templateId
      })

    if (error) throw error
  }

  // =========================================
  // WHATSAPP CONVERSATIONS
  // =========================================

  static async getOrCreateConversation(phoneNumber: string, leadId?: string): Promise<WhatsAppConversation> {
    // Try to find existing conversation
    let { data: existing, error: findError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()

    if (findError && findError.code !== 'PGRST116') throw findError

    if (existing) {
      // Update lead_id if provided and different
      if (leadId && existing.lead_id !== leadId) {
        await supabase
          .from('whatsapp_conversations')
          .update({ lead_id: leadId })
          .eq('id', existing.id)
      }
      return existing
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .insert([{
        phone_number: phoneNumber,
        lead_id: leadId,
        status: 'active'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  // =========================================
  // ANALYTICS & REPORTING
  // =========================================

  static async getCRMAnalytics(agentId?: string): Promise<CRMAnalytics> {
    const today = new Date().toISOString().split('T')[0]

    // Build base query
    let leadsQuery = supabase.from('leads').select('*', { count: 'exact' })
    let messagesQuery = supabase.from('lead_messages').select('*', { count: 'exact' })
    let conversationsQuery = supabase.from('whatsapp_conversations').select('*', { count: 'exact' })

    if (agentId) {
      leadsQuery = leadsQuery.eq('agent_id', agentId)
      messagesQuery = messagesQuery.eq('from_id', agentId).eq('from_role', 'agent')
    }

    // Get total leads
    const { count: totalLeads } = await leadsQuery

    // Get new leads today
    const { count: newLeadsToday } = await leadsQuery
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)

    // Get converted leads
    const { count: convertedLeads } = await leadsQuery.eq('status', 'converted')

    // Get messages sent today
    const { count: messagesSentToday } = await messagesQuery
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)

    // Get active conversations
    const { count: activeConversations } = await conversationsQuery.eq('status', 'active')

    // Calculate conversion rate
    const conversionRate = totalLeads && totalLeads > 0 ? (convertedLeads || 0) / totalLeads * 100 : 0

    // Calculate average response time (simplified)
    const avgResponseTime = 45 // minutes - would be calculated from actual data

    return {
      total_leads: totalLeads || 0,
      new_leads_today: newLeadsToday || 0,
      converted_leads: convertedLeads || 0,
      conversion_rate: conversionRate,
      avg_response_time: avgResponseTime,
      messages_sent_today: messagesSentToday || 0,
      active_conversations: activeConversations || 0
    }
  }

  static async getAgentPerformance(agentId: string, periodDays: number = 30): Promise<AgentPerformance> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Get agent profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', agentId)
      .single()

    // Get leads assigned
    const { count: leadsAssigned } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId)
      .gte('created_at', startDate.toISOString())

    // Get leads converted
    const { count: leadsConverted } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId)
      .eq('status', 'converted')
      .gte('created_at', startDate.toISOString())

    // Get messages sent
    const { count: messagesSent } = await supabase
      .from('lead_messages')
      .select('*', { count: 'exact' })
      .eq('from_id', agentId)
      .eq('from_role', 'agent')
      .gte('created_at', startDate.toISOString())

    const conversionRate = leadsAssigned && leadsAssigned > 0 ? (leadsConverted || 0) / leadsAssigned * 100 : 0

    return {
      agent_id: agentId,
      agent_name: profile?.full_name || 'Unknown Agent',
      leads_assigned: leadsAssigned || 0,
      leads_converted: leadsConverted || 0,
      conversion_rate: conversionRate,
      avg_response_time: 45, // Would be calculated from actual response times
      messages_sent: messagesSent || 0,
      customer_satisfaction: 4.2 // Would be calculated from feedback
    }
  }

  // =========================================
  // UTILITY FUNCTIONS
  // =========================================

  private static async calculateLeadScore(leadId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('calculate_lead_score', { lead_id: leadId })

    if (error) throw error
    return data || 0
  }

  private static async updateLeadScore(leadId: string, score: number): Promise<void> {
    const { error } = await supabase
      .from('leads')
      .update({ score })
      .eq('id', leadId)

    if (error) throw error
  }

  private static async autoAssignLead(leadId: string): Promise<void> {
    const { error } = await supabase
      .rpc('auto_assign_lead', { new_lead_id: leadId })

    if (error) throw error
  }

  // =========================================
  // WHATSAPP BUSINESS API INTEGRATION
  // =========================================

  static async sendWhatsAppMessage(
    phoneNumber: string,
    message: string,
    templateId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // This would integrate with actual WhatsApp Business API
      // For now, we'll simulate the API call

      const provider = process.env.WHATSAPP_PROVIDER || '360dialog'
      const apiKey = process.env.WHATSAPP_API_KEY
      const apiUrl = process.env.WHATSAPP_API_URL

      if (!apiKey || !apiUrl) {
        throw new Error('WhatsApp API credentials not configured')
      }

      // Simulate API call - replace with actual implementation
      const response = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          type: 'text',
          text: { body: message }
        })
      })

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`)
      }

      const result = await response.json()

      return {
        success: true,
        messageId: result.messages?.[0]?.id
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async processIncomingWhatsAppMessage(payload: any): Promise<void> {
    // This would process incoming WhatsApp webhooks
    // Implementation depends on the specific WhatsApp provider

    const { from, body, messageId } = payload

    // Clean phone number
    const cleanPhone = from.replace(/\D/g, '')

    // Try to find existing lead
    let lead = await this.getLeadByPhone(cleanPhone)

    if (!lead) {
      // Create new lead
      lead = await this.createLead({
        user_name: `WhatsApp User ${cleanPhone.slice(-4)}`,
        user_phone: cleanPhone,
        source: 'whatsapp',
        message: body,
        status: 'new',
        priority: 'normal'
      })
    }

    // Add message to conversation
    await this.addMessage({
      lead_id: lead.id,
      from_role: 'visitor',
      content: body,
      channel: 'whatsapp',
      message_type: 'text',
      external_message_id: messageId,
      status: 'delivered'
    })

    // Update conversation
    await this.getOrCreateConversation(cleanPhone, lead.id)
  }

  // =========================================
  // EXPORT FUNCTIONS
  // =========================================

  static async exportLeads(filters?: any): Promise<any[]> {
    const { leads } = await this.getLeads({ ...filters, limit: 10000 })
    return leads.map(lead => ({
      'ID': lead.id,
      'Nama': lead.user_name,
      'Telepon': lead.user_phone,
      'Email': lead.user_email || '',
      'Sumber': lead.source,
      'Status': lead.status,
      'Prioritas': lead.priority,
      'Score': lead.score,
      'Pesan': lead.message || '',
      'Dibuat': new Date(lead.created_at).toLocaleDateString('id-ID'),
      'Terakhir Dihubungi': lead.last_contacted_at ?
        new Date(lead.last_contacted_at).toLocaleDateString('id-ID') : ''
    }))
  }
}