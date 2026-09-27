import { InfoPage, type InfoPageProps, infoPageMetadata } from '@/components/content/info-page';

// Rendered per request until ISR lands in 8.9 (header navigation comes from the API).
export const dynamic = 'force-dynamic';

export const generateMetadata = (props: InfoPageProps) => infoPageMetadata('payment', props);

export default function PaymentPage(props: InfoPageProps) {
  return <InfoPage page="payment" {...props} />;
}
