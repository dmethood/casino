'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Locale, localeNames, isRTL } from '@/lib/i18n';

interface NavProps {
  locale: Locale;
  dictionary: {
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
  };
}

export function Nav({ locale, dictionary }: NavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isRtl = isRTL(locale);

  const navigation = [
    { name: dictionary.nav.home, href: `/${locale}` },
    { name: dictionary.nav.about, href: `/${locale}/about` },
    { name: dictionary.nav.services, href: `/${locale}/services` },
    { name: dictionary.nav.blog, href: `/${locale}/blog` },
    { name: dictionary.nav.contact, href: `/${locale}/contact` },
    ...(process.env.CASINO_ENABLED === 'true' ? [{ 
      name: locale === 'ar' ? 'الكازينو التجريبي' : 'Demo Casino', 
      href: '/casino' 
    }] : []),
  ];

  const handleLanguageChange = (newLocale: string) => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const pathWithoutLocale = currentPath.replace(/^\/[a-z]{2}/, '');
      const newPath = `/${newLocale}${pathWithoutLocale}`;
      window.location.href = newPath;
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: `/${locale}` });
  };

  return (
    <nav
      className={cn(
        'bg-white shadow-sm border-b',
        isRtl && 'rtl'
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Logo */}
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link
                href={`/${locale}`}
                className="text-xl font-bold text-gray-900 hover:text-gray-700"
              >
                Business CMS
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}

            {/* Language Switcher */}
            <Select value={locale} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[120px]">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(localeNames).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Auth Section */}
            {status === 'loading' ? (
              <div className="h-9 w-20 bg-gray-200 animate-pulse rounded" />
            ) : session ? (
              <div className="flex items-center space-x-4">
                {(session.user.role === 'ADMIN' || session.user.role === 'COMPLIANCE_OFFICER') && (
                  <Link href={`/${locale}/dashboard`}>
                    <Button variant="outline" size="sm">
                      {dictionary.nav.dashboard}
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  {dictionary.nav.signOut}
                </Button>
              </div>
            ) : (
              <Link href={`/${locale}/signin`}>
                <Button variant="default" size="sm">
                  {dictionary.nav.signIn}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {/* Mobile Language Switcher */}
            <div className="px-3 py-2">
              <Select value={locale} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(localeNames).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Auth Section */}
            <div className="border-t border-gray-200 px-3 py-2">
              {status === 'loading' ? (
                <div className="h-9 w-full bg-gray-200 animate-pulse rounded" />
              ) : session ? (
                <div className="space-y-2">
                  {(session.user.role === 'ADMIN' || session.user.role === 'COMPLIANCE_OFFICER') && (
                    <Link href={`/${locale}/dashboard`} onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-start">
                        {dictionary.nav.dashboard}
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                  >
                    {dictionary.nav.signOut}
                  </Button>
                </div>
              ) : (
                <Link href={`/${locale}/signin`} onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">
                    {dictionary.nav.signIn}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
