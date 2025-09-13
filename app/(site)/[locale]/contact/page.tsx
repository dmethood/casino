import { ContactForm } from '@/components/contact-form';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Locale, getDictionary, isRTL } from '@/lib/i18n';
import { generateMetadata as genMeta } from '@/lib/seo';
import { cn } from '@/lib/utils';

interface ContactPageProps {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: ContactPageProps) {
  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);

  return genMeta({
    title: dictionary.contact.title,
    description: dictionary.contact.subtitle,
    locale: currentLocale,
    url: `/${locale}/contact`,
  });
}

export default function ContactPage({ params: { locale } }: ContactPageProps) {
  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);
  const isRtl = isRTL(currentLocale);

  const contactInfo = [
    {
      icon: Mail,
      title: currentLocale === 'ar' ? 'البريد الإلكتروني' : 'Email',
      value: 'hello@example.com',
      href: 'mailto:hello@example.com',
    },
    {
      icon: Phone,
      title: currentLocale === 'ar' ? 'الهاتف' : 'Phone',
      value: '+1 (555) 123-4567',
      href: 'tel:+15551234567',
    },
    {
      icon: MapPin,
      title: currentLocale === 'ar' ? 'العنوان' : 'Address',
      value: currentLocale === 'ar' 
        ? '123 شارع الأعمال، المدينة، الولاية 12345'
        : '123 Business Street, City, State 12345',
    },
    {
      icon: Clock,
      title: currentLocale === 'ar' ? 'ساعات العمل' : 'Working Hours',
      value: currentLocale === 'ar'
        ? 'الاثنين - الجمعة: 9:00 - 18:00'
        : 'Mon - Fri: 9:00 AM - 6:00 PM',
    },
  ];

  return (
    <div className={cn('', isRtl && 'rtl')} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white">
        <div className="container-custom py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {dictionary.contact.title}
            </h1>
            <p className="text-xl text-teal-100 leading-relaxed">
              {dictionary.contact.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentLocale === 'ar' ? 'أرسل رسالة' : 'Send us a Message'}
              </h2>
              <ContactForm locale={currentLocale} dictionary={dictionary} />
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentLocale === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {currentLocale === 'ar'
                  ? 'نحن هنا لمساعدتك. تواصل معنا من خلال أي من الطرق التالية، وسنكون سعداء للإجابة على استفساراتك.'
                  : "We're here to help you. Reach out to us through any of the following methods, and we'll be happy to answer your questions."}
              </p>

              <div className="space-y-6">
                {contactInfo.map((item, index) => (
                  <Card key={index} className="border-0 shadow-sm bg-gray-50">
                    <CardContent className="p-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100">
                            <item.icon className="h-6 w-6 text-teal-600" />
                          </div>
                        </div>
                        <div className={cn('', isRtl ? 'mr-4' : 'ml-4')}>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {item.title}
                          </h3>
                          {item.href ? (
                            <a
                              href={item.href}
                              className="text-gray-600 hover:text-teal-600 transition-colors"
                            >
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-gray-600">{item.value}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Map Placeholder */}
              <Card className="mt-8 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {currentLocale === 'ar' ? 'الخريطة' : 'Interactive Map'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentLocale === 'ar' ? 'موقعنا على الخريطة' : 'Our Location'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {currentLocale === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {currentLocale === 'ar'
                ? 'إجابات على الأسئلة الأكثر شيوعاً التي نتلقاها من عملائنا'
                : 'Answers to the most common questions we receive from our clients'}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {[
              {
                question: currentLocale === 'ar' ? 'كم يستغرق المشروع عادة؟' : 'How long does a typical project take?',
                answer: currentLocale === 'ar'
                  ? 'يعتمد ذلك على حجم وتعقيد المشروع. المشاريع البسيطة قد تستغرق 2-4 أسابيع، بينما المشاريع الأكبر قد تستغرق 2-6 أشهر.'
                  : 'It depends on the size and complexity of the project. Simple projects may take 2-4 weeks, while larger projects can take 2-6 months.',
              },
              {
                question: currentLocale === 'ar' ? 'هل تقدمون الدعم بعد التسليم؟' : 'Do you provide support after delivery?',
                answer: currentLocale === 'ar'
                  ? 'نعم، نقدم دعماً مستمراً وصيانة لجميع مشاريعنا. نقدم أيضاً خطط دعم مختلفة حسب احتياجاتك.'
                  : 'Yes, we provide ongoing support and maintenance for all our projects. We also offer different support plans based on your needs.',
              },
              {
                question: currentLocale === 'ar' ? 'كيف تتعاملون مع المشاريع الدولية؟' : 'How do you handle international projects?',
                answer: currentLocale === 'ar'
                  ? 'نتعامل مع العملاء من جميع أنحاء العالم. نحن نستخدم أدوات التعاون الحديثة ونتكيف مع المناطق الزمنية المختلفة.'
                  : 'We work with clients from around the world. We use modern collaboration tools and adapt to different time zones.',
              },
            ].map((faq, index) => (
              <Card key={index} className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
