import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Locale, getDictionary, isRTL } from '@/lib/i18n';
import { generateMetadata as genMeta } from '@/lib/seo';
import { formatDate, cn } from '@/lib/utils';
import { prisma } from '@/lib/db';

interface BlogPageProps {
  params: { locale: string };
  searchParams: { page?: string };
}

export async function generateMetadata({ params: { locale } }: BlogPageProps) {
  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);

  return genMeta({
    title: dictionary.blog.title,
    description: dictionary.blog.subtitle,
    locale: currentLocale,
    url: `/${locale}/blog`,
  });
}

const POSTS_PER_PAGE = 6;

export default async function BlogPage({ params: { locale }, searchParams }: BlogPageProps) {
  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);
  const isRtl = isRTL(currentLocale);
  
  const page = Number(searchParams.page) || 1;
  const skip = (page - 1) * POSTS_PER_PAGE;

  // Fetch published posts with pagination
  const [posts, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where: { published: true },
      skip,
      take: POSTS_PER_PAGE,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.post.count({
      where: { published: true },
    }),
  ]);

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div className={cn('', isRtl && 'rtl')} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container-custom py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {dictionary.blog.title}
            </h1>
            <p className="text-xl text-purple-100 leading-relaxed">
              {dictionary.blog.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20">
        <div className="container-custom">
          {posts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {posts.map((post) => (
                  <Card key={post.id} className="hover:shadow-lg transition-shadow">
                    {post.coverImage && (
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg">
                        {/* Placeholder for cover image */}
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <span>{post.author.firstName} {post.author.lastName}</span>
                        <span className="mx-2">•</span>
                        <time>{formatDate(post.createdAt, currentLocale)}</time>
                      </div>
                      <CardTitle className="text-xl line-clamp-2">
                        <Link
                          href={`/${locale}/blog/${post.slug}`}
                          className="hover:text-purple-600 transition-colors"
                        >
                          {currentLocale === 'ar' && post.titleAr ? post.titleAr : post.title}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600 mb-4 line-clamp-3">
                        {currentLocale === 'ar' && post.excerptAr ? post.excerptAr : post.excerpt}
                      </CardDescription>
                      <Link href={`/${locale}/blog/${post.slug}`}>
                        <Button variant="ghost" size="sm" className="p-0">
                          {dictionary.blog.readMore}
                          <ArrowRight className={cn('h-4 w-4', isRtl ? 'mr-2' : 'ml-2')} />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4">
                  {hasPrevPage && (
                    <Link href={`/${locale}/blog${page > 2 ? `?page=${page - 1}` : ''}`}>
                      <Button variant="outline">
                        {dictionary.common.previous}
                      </Button>
                    </Link>
                  )}
                  
                  <span className="text-gray-600">
                    {currentLocale === 'ar' 
                      ? `الصفحة ${page} من ${totalPages}`
                      : `Page ${page} of ${totalPages}`}
                  </span>

                  {hasNextPage && (
                    <Link href={`/${locale}/blog?page=${page + 1}`}>
                      <Button variant="outline">
                        {dictionary.common.next}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <ArrowRight className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {dictionary.blog.noArticles}
              </h3>
              <p className="text-gray-600 mb-8">
                {currentLocale === 'ar'
                  ? 'نحن نعمل على كتابة مقالات جديدة. تحقق مرة أخرى قريباً!'
                  : "We're working on new articles. Check back soon!"}
              </p>
              <Link href={`/${locale}`}>
                <Button variant="outline">
                  {dictionary.nav.home}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
