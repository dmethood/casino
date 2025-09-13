export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'ar'],
} as const;

export type Locale = (typeof i18n)['locales'][number];

export const localeNames = {
  en: 'English',
  ar: 'العربية',
};

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function isRTL(locale: Locale): boolean {
  return locale === 'ar';
}

// Dictionary type for translations
export type Dictionary = {
  nav: {
    home: string;
    about: string;
    services: string;
    blog: string;
    contact: string;
    dashboard: string;
    signIn: string;
    signOut: string;
  };
  home: {
    hero: {
      title: string;
      subtitle: string;
      cta: string;
    };
    features: {
      title: string;
      subtitle: string;
      items: Array<{
        title: string;
        description: string;
      }>;
    };
  };
  about: {
    title: string;
    description: string;
  };
  services: {
    title: string;
    subtitle: string;
    cta: string;
  };
  blog: {
    title: string;
    subtitle: string;
    readMore: string;
    noArticles: string;
  };
  contact: {
    title: string;
    subtitle: string;
    form: {
      name: string;
      email: string;
      subject: string;
      message: string;
      submit: string;
      sending: string;
      success: string;
      error: string;
    };
  };
  common: {
    loading: string;
    error: string;
    success: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    update: string;
    back: string;
    next: string;
    previous: string;
    readMore: string;
    showMore: string;
    showLess: string;
  };
  dashboard: {
    title: string;
    overview: string;
    posts: string;
    services: string;
    users: string;
    media: string;
    settings: string;
  };
};

// English translations
export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      services: 'Services',
      blog: 'Blog',
      contact: 'Contact',
      dashboard: 'Dashboard',
      signIn: 'Sign In',
      signOut: 'Sign Out',
    },
    home: {
      hero: {
        title: 'Professional Business Solutions for the Digital Age',
        subtitle: 'We help businesses transform their digital presence with cutting-edge technology and strategic innovation.',
        cta: 'Get Started Today',
      },
      features: {
        title: 'Why Choose Our Services',
        subtitle: 'We deliver exceptional results through proven expertise and innovative approaches.',
        items: [
          {
            title: 'Expert Development',
            description: 'Our team of experienced developers uses the latest technologies to build robust, scalable solutions.',
          },
          {
            title: 'Strategic Consulting',
            description: 'We provide strategic guidance to help you make informed decisions about your technology investments.',
          },
          {
            title: 'Ongoing Support',
            description: 'We offer comprehensive support and maintenance to ensure your systems run smoothly and efficiently.',
          },
        ],
      },
    },
    about: {
      title: 'About Our Company',
      description: 'We are a leading technology company specializing in web development, mobile applications, and digital transformation. With years of experience and a passion for innovation, we help businesses achieve their goals through technology.',
    },
    services: {
      title: 'Our Services',
      subtitle: 'Comprehensive solutions for your business needs',
      cta: 'Learn More',
    },
    blog: {
      title: 'Latest Articles',
      subtitle: 'Stay updated with industry insights and company news',
      readMore: 'Read More',
      noArticles: 'No articles available at the moment.',
    },
    contact: {
      title: 'Get in Touch',
      subtitle: 'We\'d love to hear from you. Send us a message and we\'ll respond as soon as possible.',
      form: {
        name: 'Your Name',
        email: 'Email Address',
        subject: 'Subject',
        message: 'Message',
        submit: 'Send Message',
        sending: 'Sending...',
        success: 'Thank you! Your message has been sent successfully.',
        error: 'Sorry, there was an error sending your message. Please try again.',
      },
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      update: 'Update',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      readMore: 'Read More',
      showMore: 'Show More',
      showLess: 'Show Less',
    },
    dashboard: {
      title: 'Dashboard',
      overview: 'Overview',
      posts: 'Posts',
      services: 'Services',
      users: 'Users',
      media: 'Media',
      settings: 'Settings',
    },
  },
  ar: {
    nav: {
      home: 'الرئيسية',
      about: 'من نحن',
      services: 'الخدمات',
      blog: 'المدونة',
      contact: 'اتصل بنا',
      dashboard: 'لوحة التحكم',
      signIn: 'تسجيل الدخول',
      signOut: 'تسجيل الخروج',
    },
    home: {
      hero: {
        title: 'حلول أعمال احترافية للعصر الرقمي',
        subtitle: 'نحن نساعد الشركات على تحويل وجودها الرقمي بالتكنولوجيا المتطورة والابتكار الاستراتيجي.',
        cta: 'ابدأ اليوم',
      },
      features: {
        title: 'لماذا تختار خدماتنا',
        subtitle: 'نحن نقدم نتائج استثنائية من خلال الخبرة المثبتة والمناهج المبتكرة.',
        items: [
          {
            title: 'تطوير خبير',
            description: 'فريقنا من المطورين ذوي الخبرة يستخدم أحدث التقنيات لبناء حلول قوية وقابلة للتوسع.',
          },
          {
            title: 'استشارات استراتيجية',
            description: 'نقدم التوجيه الاستراتيجي لمساعدتك على اتخاذ قرارات مدروسة حول استثماراتك التكنولوجية.',
          },
          {
            title: 'الدعم المستمر',
            description: 'نقدم الدعم والصيانة الشاملة لضمان تشغيل أنظمتك بسلاسة وكفاءة.',
          },
        ],
      },
    },
    about: {
      title: 'عن شركتنا',
      description: 'نحن شركة تكنولوجيا رائدة متخصصة في تطوير مواقع الويب وتطبيقات الجوال والتحول الرقمي. مع سنوات من الخبرة وشغف الابتكار، نساعد الشركات على تحقيق أهدافها من خلال التكنولوجيا.',
    },
    services: {
      title: 'خدماتنا',
      subtitle: 'حلول شاملة لاحتياجات عملك',
      cta: 'اعرف المزيد',
    },
    blog: {
      title: 'أحدث المقالات',
      subtitle: 'ابق على اطلاع بأحدث رؤى الصناعة وأخبار الشركة',
      readMore: 'اقرأ المزيد',
      noArticles: 'لا توجد مقالات متاحة في الوقت الحالي.',
    },
    contact: {
      title: 'تواصل معنا',
      subtitle: 'نحب أن نسمع منك. أرسل لنا رسالة وسنرد في أقرب وقت ممكن.',
      form: {
        name: 'اسمك',
        email: 'البريد الإلكتروني',
        subject: 'الموضوع',
        message: 'الرسالة',
        submit: 'إرسال الرسالة',
        sending: 'جاري الإرسال...',
        success: 'شكراً لك! تم إرسال رسالتك بنجاح.',
        error: 'عذراً، حدث خطأ في إرسال رسالتك. يرجى المحاولة مرة أخرى.',
      },
    },
    common: {
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجح',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      create: 'إنشاء',
      update: 'تحديث',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
      readMore: 'اقرأ المزيد',
      showMore: 'عرض المزيد',
      showLess: 'عرض أقل',
    },
    dashboard: {
      title: 'لوحة التحكم',
      overview: 'نظرة عامة',
      posts: 'المقالات',
      services: 'الخدمات',
      users: 'المستخدمون',
      media: 'الوسائط',
      settings: 'الإعدادات',
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.en;
}
