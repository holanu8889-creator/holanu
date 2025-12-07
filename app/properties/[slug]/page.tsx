import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { propertyService, Property } from '@/lib/property.service'
import { SEOUtils } from '@/lib/seo.utils'
import PropertyDetailClient from './PropertyDetailClient'

interface PageProps {
  params: {
    slug: string
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const seo = await SEOUtils.generatePropertySEO(params.slug)
    return SEOUtils.toNextMetadata(seo)
  } catch (error) {
    return {
      title: 'Properti Dijual | HOLANU Marketplace',
      description: 'Temukan properti impian Anda di HOLANU, marketplace properti digital Indonesia.',
    }
  }
}

// Server component for data fetching
export default async function PropertyDetailPage({ params }: PageProps) {
  try {
    const property = await propertyService.getPropertyById(params.slug)

    if (property.status !== 'approved') {
      notFound()
    }

    // Generate structured data
    const seo = await SEOUtils.generatePropertySEO(params.slug)

    return (
      <>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seo.structuredData),
          }}
        />

        {/* Client component for interactivity */}
        <PropertyDetailClient property={property} />
      </>
    )
  } catch (error) {
    notFound()
  }
}