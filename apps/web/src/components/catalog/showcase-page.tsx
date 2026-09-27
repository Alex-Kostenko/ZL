import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { routing } from '@/i18n/routing';
import { listingMetadata, loadListing } from '@/lib/listing-page';
import type { ListingState, SearchParams } from '@/lib/listing-params';
import type { SearchResultDto } from '@ml/api-client';
import { ProductListing } from './product-listing';

// Showcase pages built on product flags (rule 8: `isSale` / `isAntidron` are flags, not categories).

export type Showcase = 'sale' | 'antidron';

export type ShowcaseProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

const PATHS: Record<Showcase, string> = { sale: '/sale', antidron: '/antidron' };

async function resolve(showcase: Showcase, { params, searchParams }: ShowcaseProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const listing = await loadListing(locale, await searchParams, { [showcase]: true });
  return { locale, ...listing };
}

export async function showcaseMetadata(
  showcase: Showcase,
  props: ShowcaseProps,
): Promise<Metadata> {
  const { locale, state, result } = await resolve(showcase, props);
  const t = await getTranslations({ locale, namespace: 'showcase' });
  return listingMetadata({
    locale,
    basePath: PATHS[showcase],
    state,
    title: t(`${showcase}.metaTitle`),
    description: t(`${showcase}.metaDescription`, { count: result.total }),
  });
}

export async function ShowcasePage({ showcase, ...props }: ShowcaseProps & { showcase: Showcase }) {
  const data = await resolve(showcase, props);
  setRequestLocale(data.locale);
  return <ShowcaseView showcase={showcase} state={data.state} result={data.result} />;
}

function ShowcaseView({
  showcase,
  state,
  result,
}: {
  showcase: Showcase;
  state: ListingState;
  result: SearchResultDto;
}) {
  const t = useTranslations('showcase');

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ name: t(`${showcase}.title`) }]} />
      <h1 className="mt-4 text-3xl leading-tight font-bold md:text-4xl">
        {t(`${showcase}.title`)}
      </h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">{t(`${showcase}.lead`)}</p>

      <div className="mt-6 lg:mt-8">
        <ProductListing
          basePath={PATHS[showcase]}
          state={state}
          result={result}
          hidden={{ [showcase]: true }}
          emptyText={t(`${showcase}.empty`)}
        />
      </div>
    </div>
  );
}
