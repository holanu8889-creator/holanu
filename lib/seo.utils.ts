import { Metadata } from 'next'
import { propertyService, Property } from './property.service'

export interface SEOMetadata {
  title: string
  description: string
  keywords: string[]
  ogImage: string
  canonicalUrl: string
  structuredData?: any
}

export class SEOUtils {
  private static baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://holanu.com'

  /**
   * Generate SEO metadata for property detail pages
   */
  static async generatePropertySEO(propertyId: string): Promise<SEOMetadata> {
    try {
      const property = await propertyService.getPropertyById(propertyId)

      const title = `${property.title} - ${property.city} | HOLANU Marketplace`
      const description = `${property.property_type} di ${property.address}, ${property.district}, ${property.city}. Harga ${propertyService.formatPrice(property.price)}. ${property.description.substring(0, 150)}...`

      const keywords = [
        property.title,
        property.property_type,
        property.city,
        property.province,
        'properti',
        'real estate',
        'jual',
        'sewa',
        'HOLANU',
        'marketplace properti'
      ]

      // Use first image as OG image, fallback to default
      const ogImage = property.images && property.images.length > 0
        ? property.images[0].image_url
        : `${this.baseUrl}/og-default-property.jpg`

      const canonicalUrl = `${this.baseUrl}/properties/${propertyId}`

      // Generate structured data for Google
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: property.title,
        description: property.description,
        url: canonicalUrl,
        image: property.images?.map(img => img.image_url) || [],
        address: {
          '@type': 'PostalAddress',
          streetAddress: property.address,
          addressLocality: property.city,
          addressRegion: property.province,
          addressCountry: 'ID'
        },
        geo: {
          '@type': 'GeoCoordinates',
          // Coordinates will be added when location data is available
        },
        offers: {
          '@type': 'Offer',
          price: property.price,
          priceCurrency: 'IDR',
          availability: 'https://schema.org/InStock'
        },
        provider: {
          '@type': 'RealEstateAgent',
          name: property.agent?.name,
          telephone: property.agent?.whatsapp,
          email: property.agent?.email
        },
        datePosted: property.created_at,
        priceRange: this.getPriceRange(property.price)
      }

      return {
        title,
        description,
        keywords,
        ogImage,
        canonicalUrl,
        structuredData
      }
    } catch (error) {
      console.error('Error generating property SEO:', error)
      // Return fallback SEO
      return {
        title: 'Properti Dijual | HOLANU Marketplace',
        description: 'Temukan properti impian Anda di HOLANU, marketplace properti digital Indonesia.',
        keywords: ['properti', 'real estate', 'HOLANU'],
        ogImage: `${this.baseUrl}/og-default.jpg`,
        canonicalUrl: `${this.baseUrl}/properties/${propertyId}`
      }
    }
  }

  /**
   * Generate SEO for category pages
   */
  static generateCategorySEO(category: string, location?: string): SEOMetadata {
    const categoryNames: Record<string, string> = {
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

    const categoryName = categoryNames[category] || category
    const locationText = location ? ` di ${location}` : ''
    const title = `${categoryName} Dijual${locationText} | HOLANU Marketplace`
    const description = `Temukan ${categoryName.toLowerCase()} terbaik${locationText}. Harga terjangkau, lokasi strategis. Jual beli properti mudah dan aman di HOLANU.`

    return {
      title,
      description,
      keywords: [categoryName, location || '', 'dijual', 'harga', 'lokasi', 'HOLANU'].filter(Boolean),
      ogImage: `${this.baseUrl}/og-category-${category}.jpg`,
      canonicalUrl: location ? `${this.baseUrl}/properti/${category}-${location}` : `${this.baseUrl}/properti/${category}`
    }
  }

  /**
   * Generate SEO for location pages
   */
  static generateLocationSEO(location: string): SEOMetadata {
    const title = `Properti Dijual di ${location} | HOLANU Marketplace`
    const description = `Temukan properti terbaik di ${location}. Rumah, tanah, apartemen, ruko dengan harga terjangkau. Marketplace properti digital Indonesia.`

    return {
      title,
      description,
      keywords: [location, 'properti', 'dijual', 'rumah', 'tanah', 'apartemen', 'HOLANU'],
      ogImage: `${this.baseUrl}/og-location-${location}.jpg`,
      canonicalUrl: `${this.baseUrl}/properti/${location}`
    }
  }

  /**
   * Convert SEO metadata to Next.js Metadata object
   */
  static toNextMetadata(seo: SEOMetadata): Metadata {
    return {
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords,
      authors: [{ name: 'HOLANU' }],
      creator: 'HOLANU',
      publisher: 'HOLANU',
      formatDetection: {
        email: false,
        address: false,
        telephone: false,
      },
      metadataBase: new URL(this.baseUrl),
      alternates: {
        canonical: seo.canonicalUrl,
      },
      openGraph: {
        title: seo.title,
        description: seo.description,
        url: seo.canonicalUrl,
        siteName: 'HOLANU',
        images: [
          {
            url: seo.ogImage,
            width: 1200,
            height: 630,
            alt: seo.title,
          },
        ],
        locale: 'id_ID',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.title,
        description: seo.description,
        images: [seo.ogImage],
        creator: '@holanu_id',
      },
      robots: {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
          index: true,
          follow: true,
          noimageindex: false,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION,
      },
    }
  }

  /**
   * Get price range for structured data
   */
  private static getPriceRange(price: number): string {
    if (price < 50000000) return 'Under 50M'
    if (price < 100000000) return '50M - 100M'
    if (price < 500000000) return '100M - 500M'
    if (price < 1000000000) return '500M - 1B'
    return 'Over 1B'
  }

  /**
   * Generate sitemap entries
   */
  static async generateSitemapEntries() {
    const entries: Array<{
      url: string
      lastModified: Date
      changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
      priority: number
    }> = []

    // Static pages
    const staticPages = [
      { url: '/', priority: 1.0, changeFrequency: 'daily' as const },
      { url: '/properties', priority: 0.9, changeFrequency: 'hourly' as const },
      { url: '/privacy-policy', priority: 0.3, changeFrequency: 'monthly' as const },
      { url: '/terms-of-service', priority: 0.3, changeFrequency: 'monthly' as const },
    ]

    staticPages.forEach(page => {
      entries.push({
        url: `${this.baseUrl}${page.url}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority
      })
    })

    // Property pages
    try {
      const properties = await propertyService.getProperties({ status: 'approved' }, 1, 1000)
      properties.properties.forEach(property => {
        entries.push({
          url: `${this.baseUrl}/properties/${property.id}`,
          lastModified: new Date(property.updated_at),
          changeFrequency: 'weekly',
          priority: property.is_super_premium ? 0.9 : property.is_premium ? 0.8 : property.is_featured ? 0.7 : 0.6
        })
      })
    } catch (error) {
      console.error('Error generating property sitemap entries:', error)
    }

    // Category pages
    const categories = ['rumah', 'tanah', 'kost', 'hotel', 'homestay', 'villa', 'apartement', 'ruko', 'gudang', 'komersial']
    categories.forEach(category => {
      entries.push({
        url: `${this.baseUrl}/properti/${category}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7
      })
    })

    return entries
  }

  /**
   * Submit URL to Google Search Console
   */
  static async submitToGoogleSearchConsole(url: string) {
    if (!process.env.GOOGLE_SEARCH_CONSOLE_API_KEY || !process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_EMAIL) {
      console.warn('Google Search Console credentials not configured')
      return false
    }

    try {
      // For production, you would use proper OAuth2 flow with service account
      // This is a simplified version for demonstration
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.baseUrl)}/urlNotifications:publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GOOGLE_SEARCH_CONSOLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            type: 'URL_UPDATED'
          }),
        }
      )

      if (response.ok) {
        console.log(`✅ Successfully submitted ${url} to Google Search Console`)
        return true
      } else {
        console.error(`❌ Failed to submit ${url} to Google Search Console:`, response.statusText)
        return false
      }
    } catch (error) {
      console.error('Error submitting to Google Search Console:', error)
      return false
    }
  }

  /**
   * Submit multiple URLs to Google Search Console (batch)
   */
  static async submitMultipleToGoogleSearchConsole(urls: string[]) {
    const results = await Promise.allSettled(
      urls.map(url => this.submitToGoogleSearchConsole(url))
    )

    const successful = results.filter(result =>
      result.status === 'fulfilled' && result.value === true
    ).length

    console.log(`📊 Google Search Console submission: ${successful}/${urls.length} URLs submitted successfully`)

    return { successful, total: urls.length }
  }

  /**
   * Auto-submit new property to search engines
   */
  static async submitNewProperty(propertyId: string) {
    const propertyUrl = `${this.baseUrl}/properties/${propertyId}`

    // Submit to Google Search Console
    const gscSuccess = await this.submitToGoogleSearchConsole(propertyUrl)

    // Could also submit to Bing Webmaster Tools, Yandex, etc.
    // const bingSuccess = await this.submitToBingWebmasterTools(propertyUrl)

    return {
      googleSearchConsole: gscSuccess,
      url: propertyUrl
    }
  }

  /**
   * Generate SEO-friendly URL slug
   */
  static generateSlug(title: string, id: string): string {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()

    return `${cleanTitle}-${id}`
  }

  /**
   * Generate robots.txt content
   */
  static generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

# Block admin and API routes
Disallow: /dashboard/
Disallow: /api/
Disallow: /admin/
Disallow: /_next/

# Allow important resources
Allow: /_next/static/
Allow: /_next/image/

# Sitemap
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl delay (optional)
Crawl-delay: 1`
  }

  /**
   * Get Core Web Vitals optimization headers
   */
  static getCoreWebVitalsHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    }
  }
}