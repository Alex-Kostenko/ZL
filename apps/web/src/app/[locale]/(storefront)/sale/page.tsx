import {
  ShowcasePage,
  type ShowcaseProps,
  showcaseMetadata,
} from '@/components/catalog/showcase-page';

// Filters, sorting and pages live in the query string: rendered per request (data from Meilisearch).
export const dynamic = 'force-dynamic';

export const generateMetadata = (props: ShowcaseProps) => showcaseMetadata('sale', props);

export default function SalePage(props: ShowcaseProps) {
  return <ShowcasePage showcase="sale" {...props} />;
}
