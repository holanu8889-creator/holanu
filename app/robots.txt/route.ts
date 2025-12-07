import { NextRequest } from 'next/server'
import { SEOUtils } from '@/lib/seo.utils'

export async function GET(request: NextRequest) {
  const robotsTxt = SEOUtils.generateRobotsTxt()

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400' // Cache for 24 hours
    }
  })
}