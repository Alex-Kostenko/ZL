import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

// Static information pages (about, delivery, payment, warranty, contacts). Texts live in the
// `pages` messages until the CMS takes over (TODO(13.1): Pages from the CMS).

export type InfoPageKey = 'about' | 'delivery' | 'payment' | 'warranty' | 'contacts';

export type InfoPageProps = { params: Promise<{ locale: string }> };

interface Section {
  title: string;
  paragraphs: string[];
}

async function resolveLocale({ params }: InfoPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}

export async function infoPageMetadata(page: InfoPageKey, props: InfoPageProps): Promise<Metadata> {
  const locale = await resolveLocale(props);
  const [t, tMeta] = await Promise.all([
    getTranslations({ locale, namespace: `pages.${page}` }),
    getTranslations({ locale, namespace: 'meta' }),
  ]);
  return {
    title: `${t('title')} — ${tMeta('siteName')}`,
    description: t('metaDescription'),
    alternates: { canonical: getPathname({ href: `/${page}`, locale }) },
  };
}

export async function InfoPage({
  page,
  aside,
  ...props
}: InfoPageProps & {
  page: InfoPageKey;
  /** Extra block next to the text (e.g. contact details). */
  aside?: ReactNode;
}) {
  setRequestLocale(await resolveLocale(props));
  return <InfoView page={page} aside={aside} />;
}

function InfoView({ page, aside }: { page: InfoPageKey; aside?: ReactNode }) {
  const t = useTranslations(`pages.${page}`);
  const sections = t.raw('sections') as Section[];

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ name: t('title') }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="max-w-3xl">
          <h1 className="text-3xl leading-tight font-bold md:text-4xl">{t('title')}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t('lead')}</p>
          {sections.map((section) => (
            <section key={section.title} className="mt-10">
              <h2 className="text-xl font-bold">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
        {aside && <aside className="lg:pt-2">{aside}</aside>}
      </div>
    </div>
  );
}
