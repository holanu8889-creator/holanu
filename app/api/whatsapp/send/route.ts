import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { CRMService } from '@/lib/crm.service'

export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is agent
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'agent') {
      return NextResponse.json({ error: 'Only agents can send WhatsApp messages' }, { status: 403 })
    }

    const body = await request.json()
    const {
      lead_id,
      message,
      template_id,
      attachment_url
    } = body

    if (!lead_id || (!message && !template_id)) {
      return NextResponse.json({ error: 'lead_id and message or template_id are required' }, { status: 400 })
    }

    // Get lead details
    const lead = await CRMService.getLeadById(lead_id)
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Check if agent has access to this lead
    if (lead.agent_id !== user.id) {
      return NextResponse.json({ error: 'You do not have access to this lead' }, { status: 403 })
    }

    // Prepare message content
    let finalMessage = message

    if (template_id) {
      // Get template and fill variables
      const templates = await CRMService.getTemplates()
      const template = templates.find(t => t.id === template_id)

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      // Simple variable replacement (would be more sophisticated in production)
      finalMessage = template.template_text
      if (message) {
        // Replace variables with provided values
        const variables = JSON.parse(message) // Assuming message contains variable values
        template.variables_json.forEach((varName, index) => {
          finalMessage = finalMessage.replace(`{{${varName}}}`, variables[varName] || '')
        })
      }

      // Increment template usage
      await CRMService.incrementTemplateUsage(template_id)
    }

    // Send WhatsApp message
    const result = await CRMService.sendWhatsAppMessage(
      lead.user_phone,
      finalMessage
    )

    if (!result.success) {
      return NextResponse.json({
        error: 'Failed to send WhatsApp message',
        details: result.error
      }, { status: 500 })
    }

    // Save message to database
    const savedMessage = await CRMService.addMessage({
      lead_id: lead_id,
      from_role: 'agent',
      from_id: user.id,
      content: finalMessage,
      channel: 'whatsapp',
      message_type: attachment_url ? 'image' : 'text',
      external_message_id: result.messageId,
      status: 'sent',
      metadata: attachment_url ? { attachment_url } : undefined
    })

    // Update lead last contacted
    await CRMService.updateLead(lead_id, {
      last_contacted_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: savedMessage,
      whatsapp_message_id: result.messageId
    })
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/whatsapp/send - Get message templates
export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const templates = await CRMService.getTemplates(category || undefined)

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}