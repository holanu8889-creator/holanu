import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { AdsService } from '@/lib/ads.service'

// GET /api/ads - List campaigns for current user
export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is agent or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['agent', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const campaigns = await AdsService.getCampaigns(
      profile.role === 'agent' ? user.id : undefined
    )

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/ads - Create new campaign
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
      return NextResponse.json({ error: 'Only agents can create campaigns' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      campaign_type,
      target_location,
      budget,
      bid_type,
      bid_amount,
      start_at,
      end_at
    } = body

    // Validate required fields
    if (!name || !campaign_type || !budget || !bid_type || !bid_amount || !start_at || !end_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate campaign type
    const validTypes = ['featured', 'premium', 'super_premium', 'banner']
    if (!validTypes.includes(campaign_type)) {
      return NextResponse.json({ error: 'Invalid campaign type' }, { status: 400 })
    }

    // Validate bid type
    const validBidTypes = ['flat_fee', 'cpc', 'cpm']
    if (!validBidTypes.includes(bid_type)) {
      return NextResponse.json({ error: 'Invalid bid type' }, { status: 400 })
    }

    // Validate dates
    const startDate = new Date(start_at)
    const endDate = new Date(end_at)
    const now = new Date()

    if (startDate <= now) {
      return NextResponse.json({ error: 'Start date must be in the future' }, { status: 400 })
    }

    if (endDate <= startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Check agent membership limits
    const { data: agent } = await supabase
      .from('agents')
      .select('status')
      .eq('email', user.email)
      .single()

    if (!agent || agent.status !== 'approved') {
      return NextResponse.json({ error: 'Agent account not approved' }, { status: 403 })
    }

    // Create campaign
    const campaign = await AdsService.createCampaign({
      agent_id: user.id,
      name,
      campaign_type,
      target_location,
      budget: parseInt(budget),
      bid_type,
      bid_amount: parseInt(bid_amount),
      start_at,
      end_at,
      status: 'draft'
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}