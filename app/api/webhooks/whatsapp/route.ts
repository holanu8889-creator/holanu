import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { CRMService } from '@/lib/crm.service'

// Webhook verification for WhatsApp Business API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verify webhook (this should match your WhatsApp Business API configuration)
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WhatsApp webhook verified')
    return new Response(challenge, { status: 200 })
  }

  console.log('❌ WhatsApp webhook verification failed')
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// Handle incoming WhatsApp messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📱 WhatsApp webhook received:', JSON.stringify(body, null, 2))

    // Verify webhook signature (recommended for production)
    const signature = request.headers.get('x-hub-signature-256')
    if (signature && !verifySignature(JSON.stringify(body), signature)) {
      console.log('❌ Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Process the webhook payload
    const processed = await processWhatsAppWebhook(body)

    return NextResponse.json({
      success: true,
      processed: processed
    })
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Verify webhook signature (implement proper signature verification)
function verifySignature(payload: string, signature: string): boolean {
  // This is a placeholder - implement proper HMAC SHA256 verification
  // using your WhatsApp App Secret
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) return true // Skip verification if not configured

  // TODO: Implement proper signature verification
  return true
}

// Process WhatsApp webhook payload
async function processWhatsAppWebhook(payload: any): Promise<number> {
  let processedCount = 0

  try {
    // Handle different webhook types
    if (payload.object === 'whatsapp_business_account') {
      const entries = payload.entry || []

      for (const entry of entries) {
        const changes = entry.changes || []

        for (const change of changes) {
          if (change.field === 'messages') {
            const messages = change.value.messages || []
            const contacts = change.value.contacts || []

            // Create contact map
            const contactMap: Record<string, any> = {}
            contacts.forEach((contact: any) => {
              contactMap[contact.wa_id] = contact
            })

            // Process messages
            for (const message of messages) {
              await processIncomingMessage(message, contactMap)
              processedCount++
            }
          }

          // Handle message status updates
          if (change.field === 'message_status') {
            const statuses = change.value.statuses || []
            for (const status of statuses) {
              await processMessageStatus(status)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error)
  }

  return processedCount
}

// Process incoming message
async function processIncomingMessage(message: any, contactMap: Record<string, any>) {
  try {
    const from = message.from // WhatsApp ID (phone number)
    const messageId = message.id
    const timestamp = message.timestamp

    // Skip if it's a status message or from us
    if (message.type === 'status' || !from) {
      return
    }

    // Extract message content based on type
    let content = ''
    let messageType = 'text'

    switch (message.type) {
      case 'text':
        content = message.text?.body || ''
        break
      case 'image':
        content = message.image?.caption || '[Image]'
        messageType = 'image'
        break
      case 'document':
        content = message.document?.caption || '[Document]'
        messageType = 'file'
        break
      case 'audio':
        content = '[Audio message]'
        messageType = 'file'
        break
      case 'video':
        content = message.video?.caption || '[Video]'
        messageType = 'file'
        break
      default:
        content = `[${message.type} message]`
    }

    if (!content.trim()) {
      return // Skip empty messages
    }

    // Get contact info
    const contact = contactMap[from]
    const displayName = contact?.profile?.name || `WhatsApp User ${from.slice(-4)}`

    // Check for existing lead
    let lead = await CRMService.getLeadByPhone(from)

    if (!lead) {
      // Create new lead
      lead = await CRMService.createLead({
        user_name: displayName,
        user_phone: from,
        source: 'whatsapp',
        message: content,
        status: 'new',
        priority: 'normal'
      })

      console.log(`📝 New lead created: ${lead.id} for ${displayName}`)
    }

    // Add message to conversation
    await CRMService.addMessage({
      lead_id: lead.id,
      from_role: 'visitor',
      content: content,
      channel: 'whatsapp',
      message_type: messageType as any,
      external_message_id: messageId,
      status: 'delivered',
      metadata: {
        whatsapp_message_type: message.type,
        whatsapp_timestamp: timestamp
      }
    })

    // Update conversation
    await CRMService.getOrCreateConversation(from, lead.id)

    console.log(`💬 Message processed: ${messageId} from ${displayName}`)

    // Check for auto-responses (like STOP command)
    if (content.toUpperCase().includes('STOP')) {
      // Mark conversation as blocked
      await supabase
        .from('whatsapp_conversations')
        .update({ status: 'blocked' })
        .eq('phone_number', from)

      console.log(`🚫 Conversation blocked for ${from} due to STOP command`)
    }

  } catch (error) {
    console.error('Error processing incoming message:', error)
  }
}

// Process message status updates
async function processMessageStatus(status: any) {
  try {
    const messageId = status.id
    const statusType = status.status // sent, delivered, read, failed

    // Map WhatsApp status to our status
    let ourStatus: 'sent' | 'delivered' | 'read' | 'failed' = 'sent'
    let deliveredAt: string | undefined
    let readAt: string | undefined

    switch (statusType) {
      case 'delivered':
        ourStatus = 'delivered'
        deliveredAt = new Date().toISOString()
        break
      case 'read':
        ourStatus = 'read'
        readAt = new Date().toISOString()
        break
      case 'failed':
        ourStatus = 'failed'
        break
    }

    // Update message status
    await CRMService.updateMessageStatus(messageId, ourStatus, deliveredAt, readAt)

    console.log(`📊 Message status updated: ${messageId} -> ${ourStatus}`)
  } catch (error) {
    console.error('Error processing message status:', error)
  }
}