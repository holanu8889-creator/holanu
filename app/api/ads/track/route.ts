import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { AdsService } from '@/lib/ads.service'

// POST /api/ads/track - Track ad impressions and clicks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      campaign_id,
      property_id,
      event_type = 'impression',
      meta = {}
    } = body

    // Validate required fields
    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
    }

    if (!['impression', 'click', 'whatsapp_click'].includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
    }

    // Add request metadata
    const enhancedMeta = {
      ...meta,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      referrer: request.headers.get('referer') || 'unknown',
      timestamp: new Date().toISOString()
    }

    // Track the event
    await AdsService.trackImpression(
      campaign_id,
      property_id,
      event_type as 'impression' | 'click' | 'whatsapp_click',
      enhancedMeta
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking ad event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/ads/track - Get active campaigns for property (for impression tracking)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const location = searchParams.get('location') // city or province

    if (!propertyId) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
    }

    // Get active campaigns that target this property/location
    const { data: campaigns, error } = await supabase
      .from('ad_campaigns')
      .select(`
        id,
        campaign_type,
        target_location,
        bid_type,
        bid_amount,
        agent_id
      `)
      .eq('status', 'active')
      .lte('start_at', new Date().toISOString())
      .gte('end_at', new Date().toISOString())

    if (error) throw error

    // Filter campaigns that match the property location
    const matchingCampaigns = campaigns?.filter(campaign => {
      if (!campaign.target_location) return true // All locations

      const target = campaign.target_location as any
      if (location) {
        return target.city === location ||
               target.province === location ||
               !target.city // Province-wide
      }
      return true
    }) || []

    // Get agent details for matching campaigns
    const agentIds = matchingCampaigns.map(c => c.agent_id)
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, whatsapp')
      .in('id', agentIds)

    const agentMap = (agents || []).reduce((acc, agent) => {
      acc[agent.id] = agent
      return acc
    }, {} as Record<string, any>)

    // Return campaign data for frontend tracking
    const campaignData = matchingCampaigns.map(campaign => ({
      id: campaign.id,
      type: campaign.campaign_type,
      bid_type: campaign.bid_type,
      bid_amount: campaign.bid_amount,
      agent: agentMap[campaign.agent_id] || null
    }))

    return NextResponse.json({
      campaigns: campaignData,
      property_id: propertyId
    })
  } catch (error) {
    console.error('Error fetching active campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}