import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Locale, getDictionary, isRTL } from '@/lib/i18n';
import { generateMetadata as genMeta } from '@/lib/seo';
import { formatPrice, cn } from '@/lib/utils';
import { prisma } from '@/lib/db';

interface ServicesPageProps {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: ServicesPageProps) {
  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);

  return genMeta({
    title: dictionary.services.title,
    description: dictionary.services.subtitle,
    locale: currentLocale,
    url: `/${locale}/services`,
  });
}

export default async function ServicesPage({ params: { locale } }: ServicesPageProps) {
  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);
  const isRtl = isRTL(currentLocale);

  // Fetch all active services
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className={cn('', isRtl && 'rtl')} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white">
        <div className="container-custom py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {dictionary.services.title}
            </h1>
            <p className="text-xl text-indigo-100 leading-relaxed">
              {dictionary.services.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container-custom">
          {services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <Card key={service.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-md">
                  {service.image && (
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg"></div>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl mb-2">
                      {currentLocale === 'ar' && service.nameAr ? service.nameAr : service.name}
                    </CardTitle>
                    {service.price && (
                      <div className="text-2xl font-bold text-indigo-600">
                        {formatPrice(Number(service.price), 'USD', currentLocale)}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                      {currentLocale === 'ar' && service.descriptionAr 
                        ? service.descriptionAr 
                        : service.description}
                    </CardDescription>
                    <Link href={`/${locale}/contact`}>
                      <Button className="w-full">
                        {dictionary.services.cta}
                        <ArrowRight className={cn('h-4 w-4', isRtl ? 'mr-2' : 'ml-2')} />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <ArrowRight className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {currentLocale === 'ar' ? 'لا توجد خدمات متاحة' : 'No services available'}
              </h3>
              <p className="text-gray-600 mb-8">
                {currentLocale === 'ar' 
                  ? 'نحن نعمل على إضافة خدمات جديدة. تحقق مرة أخرى قريباً!'
                  : "We're working on adding new services. Check back soon!"}
              </p>
              <Link href={`/${locale}/contact`}>
                <Button variant="outline">
                  {dictionary.nav.contact}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {currentLocale === 'ar' ? 'كيف نعمل' : 'How We Work'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {currentLocale === 'ar'
                ? 'عمليتنا المثبتة تضمن تسليم مشاريع عالية الجودة في الوقت المحدد'
                : 'Our proven process ensures high-quality project delivery on time'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: currentLocale === 'ar' ? 'التشاور' : 'Consultation',
                description: currentLocale === 'ar'
                  ? 'نناقش احتياجاتك وأهدافك لفهم متطلبات المشروع بوضوح'
                  : 'We discuss your needs and goals to understand project requirements clearly',
              },
              {
                step: '02',
                title: currentLocale === 'ar' ? 'التخطيط' : 'Planning',
                description: currentLocale === 'ar'
                  ? 'نضع استراتيجية شاملة وخطة زمنية مفصلة للمشروع'
                  : 'We create a comprehensive strategy and detailed project timeline',
              },
              {
                step: '03',
                title: currentLocale === 'ar' ? 'التطوير' : 'Development',
                description: currentLocale === 'ar'
                  ? 'فريقنا الخبير ينفذ الحلول باستخدام أحدث التقنيات'
                  : 'Our expert team implements solutions using cutting-edge technologies',
              },
              {
                step: '04',
                title: currentLocale === 'ar' ? 'التسليم' : 'Delivery',
                description: currentLocale === 'ar'
                  ? 'نسلم المشروع المكتمل مع دعم مستمر وصيانة'
                  : 'We deliver the completed project with ongoing support and maintenance',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-indigo-600 text-white">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {currentLocale === 'ar' ? 'مستعد للبدء؟' : 'Ready to Get Started?'}
          </h2>
          <p className="text-xl mb-8 text-indigo-100 max-w-2xl mx-auto">
            {currentLocale === 'ar'
              ? 'تواصل معنا اليوم لمناقشة مشروعك والحصول على عرض أسعار مجاني'
              : 'Contact us today to discuss your project and get a free quote'}
          </p>
          <Link href={`/${locale}/contact`}>
            <Button size="lg" variant="secondary">
              {dictionary.nav.contact}
              <ArrowRight className={cn('h-5 w-5', isRtl ? 'mr-2' : 'ml-2')} />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
