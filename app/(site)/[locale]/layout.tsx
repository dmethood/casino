import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { Locale, i18n, getDictionary, getDirection } from '@/lib/i18n';
import { generateMetadata as genMeta } from '@/lib/seo';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

// Generate metadata for SEO
export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  return genMeta({
    title: 'Professional Business Solutions | Business CMS',
    description: 'Modern bilingual business website with CMS functionality, offering web development, digital marketing, and technology consulting services.',
    locale: locale as Locale,
  });
}

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps) {
  // Validate that the incoming locale parameter is supported
  if (!i18n.locales.includes(locale as Locale)) {
    redirect(`/${i18n.defaultLocale}`);
  }

  const currentLocale = locale as Locale;
  const dictionary = getDictionary(currentLocale);
  const direction = getDirection(currentLocale);

  return (
    <div className="min-h-screen flex flex-col" dir={direction}>
      <Nav locale={currentLocale} dictionary={dictionary} />
      <main className="flex-1">
        {children}
      </main>
      <Footer locale={currentLocale} dictionary={dictionary} />
    </div>
  );
}
