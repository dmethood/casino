import { Metadata } from 'next';
import { Locale } from './i18n';

export interface SEOData {
  title: string;
  description: string;
  image?: string;
  url?: string;
  locale?: Locale;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

const defaultSEO = {
  title: 'Professional Business Solutions | Your Company Name',
  description: 'We provide professional business solutions including web development, digital marketing, mobile app development, and technology consulting services.',
  image: '/og-default.png',
  url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
};

export function generateMetadata({
  title,
  description,
  image,
  url,
  locale = 'en',
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  section,
  tags,
}: SEOData): Metadata {
  const fullTitle = title === defaultSEO.title ? title : `${title} | Your Company Name`;
  const fullUrl = url ? `${defaultSEO.url}${url}` : defaultSEO.url;
  const fullImage = image ? (image.startsWith('http') ? image : `${defaultSEO.url}${image}`) : `${defaultSEO.url}${defaultSEO.image}`;

  const metadata: Metadata = {
    title: fullTitle,
    description,
    applicationName: 'Business CMS',
    authors: author ? [{ name: author }] : undefined,
    keywords: tags?.join(', '),
    alternates: {
      canonical: fullUrl,
      languages: {
        en: `${defaultSEO.url}/en`,
        ar: `${defaultSEO.url}/ar`,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: 'Your Company Name',
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale,
      type: type,
      ...(type === 'article' && {
        publishedTime,
        modifiedTime,
        section,
        authors: author ? [author] : undefined,
        tags,
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [fullImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  return metadata;
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${defaultSEO.url}${item.url}`,
    })),
  };
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Your Company Name',
    description: defaultSEO.description,
    url: defaultSEO.url,
    logo: `${defaultSEO.url}/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-XXX-XXX-XXXX',
      contactType: 'customer service',
      availableLanguage: ['English', 'Arabic'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US',
    },
    sameAs: [
      'https://www.facebook.com/yourcompany',
      'https://www.twitter.com/yourcompany',
      'https://www.linkedin.com/company/yourcompany',
    ],
  };
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  image?: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Your Company Name',
      logo: {
        '@type': 'ImageObject',
        url: `${defaultSEO.url}/logo.png`,
      },
    },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    image: article.image ? `${defaultSEO.url}${article.image}` : `${defaultSEO.url}${defaultSEO.image}`,
    url: `${defaultSEO.url}${article.url}`,
  };
}

export function generateServiceSchema(service: {
  name: string;
  description: string;
  price?: number;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    provider: {
      '@type': 'Organization',
      name: 'Your Company Name',
    },
    ...(service.price && {
      offers: {
        '@type': 'Offer',
        price: service.price,
        priceCurrency: 'USD',
      },
    }),
    ...(service.image && {
      image: `${defaultSEO.url}${service.image}`,
    }),
  };
}
