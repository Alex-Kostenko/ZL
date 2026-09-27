import {
  ShowcasePage,
  type ShowcaseProps,
  showcaseMetadata,
} from '@/components/catalog/showcase-page';

export const generateMetadata = (props: ShowcaseProps) => showcaseMetadata('antidron', props);

export default function AntidronPage(props: ShowcaseProps) {
  return <ShowcasePage showcase="antidron" {...props} />;
}
