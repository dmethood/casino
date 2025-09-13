import { Users, Target, Award, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Locale, getDictionary, isRTL } from '@/lib/i18n';
import { generateMetadata as genMeta } from '@/lib/seo';
import { cn } from '@/lib/utils';

interface AboutPageProps {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: AboutPageProps) {
  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);

  return genMeta({
    title: dictionary.about.title,
    description: dictionary.about.description,
    locale: currentLocale,
    url: `/${locale}/about`,
  });
}

export default function AboutPage({ params: { locale } }: AboutPageProps) {
  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);
  const isRtl = isRTL(currentLocale);

  const stats = [
    {
      icon: Users,
      title: currentLocale === 'ar' ? 'عملاء راضون' : 'Happy Clients',
      value: '500+',
      description: currentLocale === 'ar' 
        ? 'عمل معنا عملاء من جميع أنحاء العالم'
        : 'Clients from around the world trust our services',
    },
    {
      icon: Target,
      title: currentLocale === 'ar' ? 'مشاريع مكتملة' : 'Projects Completed',
      value: '1000+',
      description: currentLocale === 'ar'
        ? 'مشاريع ناجحة تم تسليمها في الوقت المحدد'
        : 'Successful projects delivered on time',
    },
    {
      icon: Award,
      title: currentLocale === 'ar' ? 'سنوات الخبرة' : 'Years Experience',
      value: '10+',
      description: currentLocale === 'ar'
        ? 'سنوات من الخبرة في التكنولوجيا والأعمال'
        : 'Years of experience in technology and business',
    },
    {
      icon: Clock,
      title: currentLocale === 'ar' ? 'دعم 24/7' : '24/7 Support',
      value: '100%',
      description: currentLocale === 'ar'
        ? 'دعم مستمر لضمان نجاح مشاريعك'
        : 'Continuous support to ensure project success',
    },
  ];

  const team = [
    {
      name: 'John Smith',
      nameAr: 'جون سميث',
      role: currentLocale === 'ar' ? 'الرئيس التنفيذي ومؤسس الشركة' : 'CEO & Founder',
      description: currentLocale === 'ar'
        ? 'خبير في التكنولوجيا والإدارة مع أكثر من 15 سنة من الخبرة في قيادة فرق التطوير.'
        : 'Technology and management expert with over 15 years of experience leading development teams.',
    },
    {
      name: 'Sarah Johnson',
      nameAr: 'سارة جونسون',
      role: currentLocale === 'ar' ? 'مدير التكنولوجيا' : 'CTO',
      description: currentLocale === 'ar'
        ? 'مهندسة برمجيات متخصصة في تطوير الحلول التقنية المتقدمة والمبتكرة.'
        : 'Software engineer specialized in developing advanced and innovative technical solutions.',
    },
    {
      name: 'Michael Chen',
      nameAr: 'مايكل تشين',
      role: currentLocale === 'ar' ? 'مدير التصميم' : 'Design Director',
      description: currentLocale === 'ar'
        ? 'مصمم إبداعي يركز على تجربة المستخدم والتصميم الحديث للمنتجات الرقمية.'
        : 'Creative designer focused on user experience and modern design for digital products.',
    },
  ];

  return (
    <div className={cn('', isRtl && 'rtl')} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-700 text-white">
        <div className="container-custom py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {dictionary.about.title}
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              {dictionary.about.description}
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {currentLocale === 'ar' ? 'مهمتنا' : 'Our Mission'}
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                {currentLocale === 'ar'
                  ? 'نحن ملتزمون بتقديم حلول تكنولوجية مبتكرة تساعد الشركات على النمو والازدهار في العصر الرقمي. نؤمن بأن التكنولوجيا يجب أن تكون في خدمة الإنسان وتحسين جودة الحياة.'
                  : 'We are committed to delivering innovative technology solutions that help businesses grow and thrive in the digital age. We believe technology should serve humanity and improve quality of life.'}
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                {currentLocale === 'ar'
                  ? 'نسعى إلى بناء علاقات طويلة الأمد مع عملائنا من خلال تقديم خدمات عالية الجودة ودعم استثنائي.'
                  : 'We strive to build long-term relationships with our clients by providing high-quality services and exceptional support.'}
              </p>
            </div>
            <div className="bg-gray-100 p-8 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {currentLocale === 'ar' ? 'قيمنا الأساسية' : 'Our Core Values'}
              </h3>
              <ul className="space-y-3">
                {(currentLocale === 'ar' 
                  ? ['الابتكار والإبداع', 'الجودة والمصداقية', 'رضا العملاء', 'العمل الجماعي', 'التطوير المستمر']
                  : ['Innovation & Creativity', 'Quality & Reliability', 'Customer Satisfaction', 'Teamwork', 'Continuous Improvement']
                ).map((value, index) => (
                  <li key={index} className="flex items-center">
                    <div className="h-2 w-2 bg-blue-600 rounded-full mr-3"></div>
                    <span className="text-gray-700">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {currentLocale === 'ar' ? 'إنجازاتنا بالأرقام' : 'Our Achievements in Numbers'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center">
                <CardHeader className="pb-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                    <stat.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-700">
                    {stat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {currentLocale === 'ar' ? 'فريق العمل' : 'Our Team'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {currentLocale === 'ar'
                ? 'تعرف على الخبراء الذين يقودون رؤيتنا ويحققون أهدافنا'
                : 'Meet the experts who drive our vision and achieve our goals'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-gray-300"></div>
                  <CardTitle className="text-xl">
                    {currentLocale === 'ar' ? member.nameAr : member.name}
                  </CardTitle>
                  <p className="text-blue-600 font-medium">{member.role}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {member.description}
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
