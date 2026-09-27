import {
  ShowcasePage,
  type ShowcaseProps,
  showcaseMetadata,
} from '@/components/catalog/showcase-page';

// Filters, sorting and pages live in the query string: rendered per request (data from Meilisearch).
export const dynamic = 'force-dynamic';

export const generateMetadata = (props: ShowcaseProps) => showcaseMetadata('antidron', props);

export default function AntidronPage(props: ShowcaseProps) {
  return <ShowcasePage showcase="antidron" {...props} />;
}
