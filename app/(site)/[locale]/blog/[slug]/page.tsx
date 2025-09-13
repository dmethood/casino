import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Locale, getDictionary, isRTL } from '@/lib/i18n';
import { generateMetadata as genMeta } from '@/lib/seo';
import { formatDate, cn } from '@/lib/utils';
import { prisma } from '@/lib/db';

interface BlogPostPageProps {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params: { locale, slug } }: BlogPostPageProps) {
  const currentLocale = locale as Locale;
  const post = await prisma.post.findFirst({
    where: { slug, published: true },
    include: {
      author: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  if (!post) {
    return genMeta({
      title: 'Post Not Found',
      description: 'The requested blog post was not found.',
      locale: currentLocale,
    });
  }

  const title = currentLocale === 'ar' && post.titleAr ? post.titleAr : post.title;
  const description = currentLocale === 'ar' && post.excerptAr ? post.excerptAr : post.excerpt;

  return genMeta({
    title,
    description,
    locale: currentLocale,
    url: `/${locale}/blog/${slug}`,
    type: 'article',
    publishedTime: post.createdAt.toISOString(),
    modifiedTime: post.updatedAt.toISOString(),
    author: `${post.author.firstName} ${post.author.lastName}`,
    image: post.coverImage || undefined,
  });
}

export async function generateStaticParams() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { slug: true },
  });

  // Generate params for both locales
  const params: { locale: string; slug: string }[] = [];
  posts.forEach((post) => {
    params.push({ locale: 'en', slug: post.slug });
    params.push({ locale: 'ar', slug: post.slug });
  });

  return params;
}

export default async function BlogPostPage({ params: { locale, slug } }: BlogPostPageProps) {
  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);
  const isRtl = isRTL(currentLocale);

  const post = await prisma.post.findFirst({
    where: { slug, published: true },
    include: {
      author: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  const title = currentLocale === 'ar' && post.titleAr ? post.titleAr : post.title;
  const content = currentLocale === 'ar' && post.contentAr ? post.contentAr : post.content;

  // Get related posts
  const relatedPosts = await prisma.post.findMany({
    where: {
      published: true,
      id: { not: post.id },
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return (
    <div className={cn('', isRtl && 'rtl')} dir={isRtl ? 'rtl' : 'ltr'}>
      <article className="py-12">
        <div className="container-custom max-w-4xl">
          {/* Back to Blog */}
          <div className="mb-8">
            <Link href={`/${locale}/blog`}>
              <Button variant="ghost" size="sm" className="p-0">
                {isRtl ? (
                  <ArrowRight className="h-4 w-4 ml-2" />
                ) : (
                  <ArrowLeft className="h-4 w-4 mr-2" />
                )}
                {dictionary.common.back}
              </Button>
            </Link>
          </div>

          {/* Article Header */}
          <header className="mb-12">
            {post.coverImage && (
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-8">
                {/* Placeholder for cover image */}
              </div>
            )}
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {title}
            </h1>
            
            <div className="flex items-center text-gray-600 text-sm">
              <span className="font-medium">{post.author.firstName} {post.author.lastName}</span>
              <span className="mx-2">•</span>
              <time>{formatDate(post.createdAt, currentLocale)}</time>
              {post.updatedAt !== post.createdAt && (
                <>
                  <span className="mx-2">•</span>
                  <span>
                    {currentLocale === 'ar' ? 'محدث:' : 'Updated:'}{' '}
                    {formatDate(post.updatedAt, currentLocale)}
                  </span>
                </>
              )}
            </div>
          </header>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none mb-12">
            <div 
              className={cn(
                'text-gray-800 leading-relaxed',
                isRtl && 'text-right'
              )}
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }}
            />
          </div>

          {/* Article Footer */}
          <footer className="border-t pt-8">
            <div className="flex justify-between items-center">
              <Link href={`/${locale}/blog`}>
                <Button variant="outline">
                  {isRtl ? (
                    <ArrowRight className="h-4 w-4 ml-2" />
                  ) : (
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  )}
                  {currentLocale === 'ar' ? 'جميع المقالات' : 'All Articles'}
                </Button>
              </Link>
            </div>
          </footer>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container-custom">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
              {currentLocale === 'ar' ? 'مقالات ذات صلة' : 'Related Articles'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => (
                <div key={relatedPost.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  {relatedPost.coverImage && (
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
                      {/* Placeholder for cover image */}
                    </div>
                  )}
                  <div className="p-6">
                    <div className="text-sm text-gray-500 mb-2">
                      {relatedPost.author.firstName} {relatedPost.author.lastName} • {formatDate(relatedPost.createdAt, currentLocale)}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                      <Link
                        href={`/${locale}/blog/${relatedPost.slug}`}
                        className="hover:text-purple-600 transition-colors"
                      >
                        {currentLocale === 'ar' && relatedPost.titleAr 
                          ? relatedPost.titleAr 
                          : relatedPost.title}
                      </Link>
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {currentLocale === 'ar' && relatedPost.excerptAr 
                        ? relatedPost.excerptAr 
                        : relatedPost.excerpt}
                    </p>
                    <Link href={`/${locale}/blog/${relatedPost.slug}`}>
                      <Button variant="ghost" size="sm" className="p-0">
                        {dictionary.blog.readMore}
                        <ArrowRight className={cn('h-4 w-4', isRtl ? 'mr-2' : 'ml-2')} />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
