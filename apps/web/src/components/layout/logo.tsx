import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function Logo() {
  const t = useTranslations('meta');

  return (
    <Link
      href="/"
      className="shrink-0 font-serif text-lg leading-none font-bold text-heading md:text-xl"
    >
      {t('siteName')}
    </Link>
  );
}
