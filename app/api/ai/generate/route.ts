import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { AdsService } from '@/lib/ads.service'

// POST /api/ai/generate - Generate AI descriptions for property
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
      return NextResponse.json({ error: 'Only agents can use AI description generator' }, { status: 403 })
    }

    const body = await request.json()
    const {
      property_id,
      tone = 'formal',
      length = 'medium',
      focus = 'selling_points',
      variant_count = 3
    } = body

    // Validate required fields
    if (!property_id) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
    }

    // Validate options
    const validTones = ['formal', 'casual', 'persuasive']
    const validLengths = ['short', 'medium', 'long']
    const validFocuses = ['seo', 'selling_points', 'family_friendly', 'investment']

    if (!validTones.includes(tone) || !validLengths.includes(length) || !validFocuses.includes(focus)) {
      return NextResponse.json({ error: 'Invalid generation options' }, { status: 400 })
    }

    if (variant_count < 1 || variant_count > 5) {
      return NextResponse.json({ error: 'variant_count must be between 1 and 5' }, { status: 400 })
    }

    // Check if agent owns the property
    const { data: property } = await supabase
      .from('properties')
      .select('id, agent_id')
      .eq('id', property_id)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (property.agent_id !== user.id) {
      return NextResponse.json({ error: 'You can only generate descriptions for your own properties' }, { status: 403 })
    }

    // Check agent membership for AI usage limits
    const { data: membership } = await supabase
      .from('agent_memberships')
      .select('tier, ai_descriptions_used, ai_descriptions_limit')
      .eq('agent_id', user.id)
      .eq('status', 'active')
      .single()

    if (membership) {
      const remaining = membership.ai_descriptions_limit - membership.ai_descriptions_used
      if (remaining <= 0) {
        return NextResponse.json({
          error: 'AI description limit reached. Upgrade your membership for more generations.',
          upgrade_required: true
        }, { status: 403 })
      }
    }

    // Generate AI descriptions
    const descriptions = await AdsService.generateAIDescription(
      property_id,
      user.id,
      {
        tone: tone as any,
        length: length as any,
        focus: focus as any,
        variantCount: variant_count
      }
    )

    // Update usage counter
    if (membership) {
      await supabase
        .from('agent_memberships')
        .update({
          ai_descriptions_used: membership.ai_descriptions_used + variant_count
        })
        .eq('agent_id', user.id)
    }

    return NextResponse.json({
      descriptions,
      usage: membership ? {
        used: membership.ai_descriptions_used + variant_count,
        limit: membership.ai_descriptions_limit,
        remaining: membership.ai_descriptions_limit - (membership.ai_descriptions_used + variant_count)
      } : null
    })
  } catch (error) {
    console.error('Error generating AI descriptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/ai/generate - Get existing AI descriptions for property
export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')

    if (!propertyId) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
    }

    const descriptions = await AdsService.getAIDescriptions(propertyId, user.id)

    return NextResponse.json({ descriptions })
  } catch (error) {
    console.error('Error fetching AI descriptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}