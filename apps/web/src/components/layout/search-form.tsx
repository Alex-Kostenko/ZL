import { Input } from '@ml/ui/components/input';
import { cn } from '@ml/ui/lib/utils';
import { Search } from 'lucide-react';

/**
 * Plain GET form to /search: works without JavaScript (autocomplete is added in 8.6).
 */
export function SearchForm({ className }: { className?: string }) {
  return (
    <form action="/search" role="search" className={cn('relative', className)}>
      <Input
        type="search"
        name="q"
        aria-label="Пошук товарів"
        placeholder="Пошук: назва, бренд або артикул"
        autoComplete="off"
        enterKeyHint="search"
        className="h-10 bg-card pr-11 dark:bg-card"
      />
      <button
        type="submit"
        aria-label="Знайти"
        className="absolute top-0 right-0 flex size-10 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Search className="size-4" />
      </button>
    </form>
  );
}
