import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Locale, getDictionary, isRTL } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { prisma } from '@/lib/db';

interface HomePageProps {
  params: { locale: string };
}

export default async function HomePage({ params: { locale } }: HomePageProps) {
  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);
  const isRtl = isRTL(currentLocale);

  // Fetch featured services
  const services = await prisma.service.findMany({
    where: { active: true },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

  // Fetch latest blog posts
  const posts = await prisma.post.findMany({
    where: { published: true },
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return (
    <div className={cn('', isRtl && 'rtl')} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="container-custom py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              {dictionary.home.hero.title}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 leading-relaxed">
              {dictionary.home.hero.subtitle}
            </p>
            <Link href={`/${locale}/contact`}>
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
                {dictionary.home.hero.cta}
                <ArrowRight className={cn('h-5 w-5', isRtl ? 'mr-2' : 'ml-2')} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {dictionary.home.features.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {dictionary.home.features.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {dictionary.home.features.items.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                    <CheckCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      {services.length > 0 && (
        <section className="py-20">
          <div className="container-custom">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {dictionary.services.title}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {dictionary.services.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {services.map((service) => (
                <Card key={service.id} className="hover:shadow-lg transition-shadow">
                  {service.image && (
                    <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {currentLocale === 'ar' && service.nameAr ? service.nameAr : service.name}
                    </CardTitle>
                    {service.price && (
                      <div className="text-2xl font-bold text-blue-600">
                        ${service.price.toString()}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 mb-4">
                      {currentLocale === 'ar' && service.descriptionAr 
                        ? service.descriptionAr 
                        : service.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Link href={`/${locale}/services`}>
                <Button variant="outline" size="lg">
                  {dictionary.services.cta}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Blog Section */}
      {posts.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="container-custom">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {dictionary.blog.title}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {dictionary.blog.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {posts.map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  {post.coverImage && (
                    <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl line-clamp-2">
                      {currentLocale === 'ar' && post.titleAr ? post.titleAr : post.title}
                    </CardTitle>
                    <div className="text-sm text-gray-500">
                      {post.author.firstName} {post.author.lastName} • {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 mb-4 line-clamp-3">
                      {currentLocale === 'ar' && post.excerptAr ? post.excerptAr : post.excerpt}
                    </CardDescription>
                    <Link href={`/${locale}/blog/${post.slug}`}>
                      <Button variant="ghost" size="sm">
                        {dictionary.blog.readMore}
                        <ArrowRight className={cn('h-4 w-4', isRtl ? 'mr-2' : 'ml-2')} />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Link href={`/${locale}/blog`}>
                <Button variant="outline" size="lg">
                  {dictionary.common.showMore}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {dictionary.contact.title}
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            {dictionary.contact.subtitle}
          </p>
          <Link href={`/${locale}/contact`}>
            <Button size="lg" variant="secondary">
              {dictionary.nav.contact}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
