import { Input } from '@ml/ui/components/input';
import { cn } from '@ml/ui/lib/utils';
import { Search } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';

/**
 * Plain GET form to /search: works without JavaScript (autocomplete is added in 8.6).
 */
export async function SearchForm({ className }: { className?: string }) {
  const locale = await getLocale();
  const t = await getTranslations('search');

  return (
    <form
      action={getPathname({ href: '/search', locale })}
      role="search"
      className={cn('relative', className)}
    >
      <Input
        type="search"
        name="q"
        aria-label={t('label')}
        placeholder={t('placeholder')}
        autoComplete="off"
        enterKeyHint="search"
        className="h-10 bg-card pr-11 dark:bg-card"
      />
      <button
        type="submit"
        aria-label={t('submit')}
        className="absolute top-0 right-0 flex size-10 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Search className="size-4" />
      </button>
    </form>
  );
}
