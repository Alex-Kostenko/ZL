import { InfoPage, type InfoPageProps, infoPageMetadata } from '@/components/content/info-page';

// ISR: rendered on first visit, then served from cache and refreshed hourly (texts + menu).
export const revalidate = 3600;

export const generateMetadata = (props: InfoPageProps) => infoPageMetadata('payment', props);

export default function PaymentPage(props: InfoPageProps) {
  return <InfoPage page="payment" {...props} />;
}
