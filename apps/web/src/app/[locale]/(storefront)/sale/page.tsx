import {
  ShowcasePage,
  type ShowcaseProps,
  showcaseMetadata,
} from '@/components/catalog/showcase-page';

export const generateMetadata = (props: ShowcaseProps) => showcaseMetadata('sale', props);

export default function SalePage(props: ShowcaseProps) {
  return <ShowcasePage showcase="sale" {...props} />;
}
