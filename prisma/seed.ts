import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create sample services
  const service1 = await prisma.service.upsert({
    where: { slug: 'web-development' },
    update: {},
    create: {
      slug: 'web-development',
      name: 'Web Development',
      nameAr: 'تطوير المواقع',
      description: 'Professional web development services using modern technologies. We build responsive, fast, and secure websites tailored to your business needs.',
      descriptionAr: 'خدمات تطوير مواقع الويب المهنية باستخدام التقنيات الحديثة. نحن نبني مواقع ويب سريعة وآمنة ومتجاوبة مصممة خصيصاً لاحتياجات عملك.',
      price: 1500.00,
      active: true,
    },
  });

  const service2 = await prisma.service.upsert({
    where: { slug: 'digital-marketing' },
    update: {},
    create: {
      slug: 'digital-marketing',
      name: 'Digital Marketing',
      nameAr: 'التسويق الرقمي',
      description: 'Comprehensive digital marketing solutions to grow your online presence. We offer SEO, social media marketing, and content strategy services.',
      descriptionAr: 'حلول تسويق رقمي شاملة لتنمية حضورك على الإنترنت. نحن نقدم خدمات تحسين محركات البحث والتسويق عبر وسائل التواصل الاجتماعي واستراتيجية المحتوى.',
      price: 800.00,
      active: true,
    },
  });

  const service3 = await prisma.service.upsert({
    where: { slug: 'mobile-app-development' },
    update: {},
    create: {
      slug: 'mobile-app-development',
      name: 'Mobile App Development',
      nameAr: 'تطوير تطبيقات الجوال',
      description: 'Native and cross-platform mobile app development for iOS and Android. We create intuitive, high-performance applications.',
      descriptionAr: 'تطوير تطبيقات الجوال الأصلية ومتعددة المنصات لأجهزة iOS و Android. نحن ننشئ تطبيقات بديهية وعالية الأداء.',
      price: 2500.00,
      active: true,
    },
  });

  const service4 = await prisma.service.upsert({
    where: { slug: 'consulting' },
    update: {},
    create: {
      slug: 'consulting',
      name: 'Technology Consulting',
      nameAr: 'استشارات التكنولوجيا',
      description: 'Strategic technology consulting to help businesses make informed decisions about their digital transformation journey.',
      descriptionAr: 'استشارات تكنولوجية استراتيجية لمساعدة الشركات على اتخاذ قرارات مدروسة حول رحلة التحول الرقمي.',
      price: 150.00,
      active: true,
    },
  });

  console.log('Seed data created:', {
    service1,
    service2,
    service3,
    service4,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
