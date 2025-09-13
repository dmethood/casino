import Link from 'next/link';
import { Facebook, Twitter, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { Locale, isRTL } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface FooterProps {
  locale: Locale;
  dictionary: {
    nav: {
      home: string;
      about: string;
      services: string;
      blog: string;
      contact: string;
    };
  };
}

export function Footer({ locale, dictionary }: FooterProps) {
  const isRtl = isRTL(locale);
  const currentYear = new Date().getFullYear();

  const navigation = [
    { name: dictionary.nav.home, href: `/${locale}` },
    { name: dictionary.nav.about, href: `/${locale}/about` },
    { name: dictionary.nav.services, href: `/${locale}/services` },
    { name: dictionary.nav.blog, href: `/${locale}/blog` },
    { name: dictionary.nav.contact, href: `/${locale}/contact` },
  ];

  const contactInfo = {
    en: {
      address: '123 Business Street, City, State 12345',
      phone: '+1 (555) 123-4567',
      email: 'hello@example.com',
      description: 'Professional business solutions for the digital age.',
      followUs: 'Follow Us',
      quickLinks: 'Quick Links',
      contactInfo: 'Contact Info',
      rights: 'All rights reserved.',
    },
    ar: {
      address: '123 شارع الأعمال، المدينة، الولاية 12345',
      phone: '+1 (555) 123-4567',
      email: 'hello@example.com',
      description: 'حلول أعمال احترافية للعصر الرقمي.',
      followUs: 'تابعنا',
      quickLinks: 'روابط سريعة',
      contactInfo: 'معلومات الاتصال',
      rights: 'جميع الحقوق محفوظة.',
    },
  };

  const content = contactInfo[locale];

  return (
    <footer
      className={cn(
        'bg-gray-900 text-white',
        isRtl && 'rtl'
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <Link
              href={`/${locale}`}
              className="text-2xl font-bold text-white hover:text-gray-300"
            >
              Business CMS
            </Link>
            <p className="mt-4 text-gray-300 max-w-md">
              {content.description}
            </p>
            
            {/* Social Links */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {content.followUs}
              </h3>
              <div className="mt-2 flex space-x-6">
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {content.quickLinks}
            </h3>
            <ul className="mt-4 space-y-4">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {content.contactInfo}
            </h3>
            <ul className="mt-4 space-y-4">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className={cn('text-gray-300', isRtl ? 'mr-3' : 'ml-3')}>
                  {content.address}
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <a
                  href={`tel:${content.phone}`}
                  className={cn(
                    'text-gray-300 hover:text-white transition-colors',
                    isRtl ? 'mr-3' : 'ml-3'
                  )}
                >
                  {content.phone}
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <a
                  href={`mailto:${content.email}`}
                  className={cn(
                    'text-gray-300 hover:text-white transition-colors',
                    isRtl ? 'mr-3' : 'ml-3'
                  )}
                >
                  {content.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <div className="flex flex-col items-center justify-between lg:flex-row">
            <p className="text-gray-400 text-sm">
              © {currentYear} Business CMS. {content.rights}
            </p>
            <div className="mt-4 lg:mt-0">
              <div className="flex space-x-6">
                <Link
                  href="#"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
