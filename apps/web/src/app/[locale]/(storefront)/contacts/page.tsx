import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { InfoPage, type InfoPageProps, infoPageMetadata } from '@/components/content/info-page';
import { STORE_INFO, type StoreInfo } from '@/lib/store-info';

// Rendered per request until ISR lands in 8.9 (header navigation comes from the API).
export const dynamic = 'force-dynamic';

export const generateMetadata = (props: InfoPageProps) => infoPageMetadata('contacts', props);

export default function ContactsPage(props: InfoPageProps) {
  return <InfoPage page="contacts" aside={<ContactCard info={STORE_INFO} />} {...props} />;
}

/** Only the filled-in contact channels; nothing at all while the settings are empty. */
function ContactCard({ info }: { info: StoreInfo }) {
  const t = useTranslations('pages.contacts');
  const rows = [
    info.phones.length > 0 && (
      <Row key="phone" icon={<Phone />} label={t('phone')}>
        {info.phones.map((phone) => (
          <a key={phone} href={`tel:${phone}`} className="block hover:text-primary">
            {phone}
          </a>
        ))}
      </Row>
    ),
    info.email && (
      <Row key="email" icon={<Mail />} label={t('email')}>
        <a href={`mailto:${info.email}`} className="hover:text-primary">
          {info.email}
        </a>
      </Row>
    ),
    info.address && (
      <Row key="address" icon={<MapPin />} label={t('address')}>
        {info.address}
      </Row>
    ),
    info.hours.length > 0 && (
      <Row key="hours" icon={<Clock />} label={t('hours')}>
        {info.hours.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </Row>
    ),
  ].filter(Boolean);

  if (rows.length === 0) return null;
  return <dl className="flex flex-col gap-5 rounded-md border bg-card p-6">{rows}</dl>;
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="mt-0.5 text-primary [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 font-medium">{children}</dd>
      </div>
    </div>
  );
}
