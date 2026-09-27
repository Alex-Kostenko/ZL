import { healthReadiness, type ReadinessDto } from '@ml/api-client';
import { Badge } from '@ml/ui/components/badge';
import { Button } from '@ml/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ml/ui/components/card';
import { Input } from '@ml/ui/components/input';
import { Label } from '@ml/ui/components/label';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';

// Rendered per request: the API is not reachable at build time (CI, Docker build).
export const dynamic = 'force-dynamic';

const CHECK_LABELS = { database: 'PostgreSQL', redis: 'Redis', search: 'Meilisearch' } as const;

const SWATCHES = [
  ['steel', 'bg-steel'],
  ['stone', 'bg-stone'],
  ['sand', 'bg-sand'],
  ['bronze', 'bg-bronze'],
  ['terracotta', 'bg-terracotta'],
  ['ink', 'bg-ink'],
  ['paper', 'bg-paper'],
] as const;

async function getApiStatus(): Promise<ReadinessDto | null> {
  try {
    const { data, error } = await healthReadiness({ client: api });
    if (data) return data;
    // Readiness answers 503 with the same body when a dependency is down.
    return error && 'checks' in error ? error : null;
  } catch {
    return null; // API unreachable: the storefront must still render.
  }
}

// Temporary design-token showcase; the real home page is built in step 8.7.
export default async function HomePage() {
  const status = await getApiStatus();

  return (
    <main>
      <section className="bg-hero text-white">
        <div className="container-page section">
          <p className="eyebrow">Полювання · Риболовля · Туризм</p>
          <h1 className="mt-4 max-w-2xl text-4xl leading-tight font-bold text-white md:text-5xl">
            Спорядження, якому довіряють.
          </h1>
          <p className="mt-4 max-w-xl text-sand">
            50 000+ товарів і 500+ брендів для полювання, риболовлі та активного відпочинку.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="bg-white text-ink hover:bg-sand">
              До каталогу
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Бренди
            </Button>
          </div>
        </div>
      </section>

      <div className="container-page section grid gap-10 md:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="eyebrow">Design tokens</p>
            <CardTitle className="font-serif text-2xl">Кольори та компоненти</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="grid grid-cols-4 gap-3 sm:grid-cols-7">
              {SWATCHES.map(([name, bg]) => (
                <li key={name} className="text-center text-xs text-muted-foreground">
                  <span className={`mb-1 block aspect-square rounded-md border ${bg}`} />
                  {name}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button>Купити</Button>
              <Button variant="secondary">Порівняти</Button>
              <Button variant="outline">Детальніше</Button>
              <Button variant="link">Усі характеристики</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="promo">Розпродаж</Badge>
              <Badge variant="promo">Новинка</Badge>
              <Badge variant="secondary">Антидрон</Badge>
              <Badge variant="outline">В наявності</Badge>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="demo-search">Пошук</Label>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="demo-search"
                  placeholder="Swarovski Z8i, приціл, вейдерси…"
                  className="bg-white pl-9"
                />
              </div>
            </div>
            <p className="font-serif text-2xl font-bold text-ink">12 499 ₴</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="eyebrow">Система</p>
            <CardTitle className="font-serif text-2xl">
              API: {status ? (status.status === 'ok' ? 'працює' : 'є проблеми') : 'недоступний'}
            </CardTitle>
          </CardHeader>
          {status && (
            <CardContent>
              <ul className="space-y-1 text-sm">
                {Object.entries(status.checks).map(([key, check]) => (
                  <li key={key} className="flex justify-between">
                    <span>{CHECK_LABELS[key as keyof typeof CHECK_LABELS]}</span>
                    <span className={check.status === 'up' ? 'text-steel' : 'text-terracotta'}>
                      {check.status === 'up' ? `✓ ${check.latencyMs} мс` : `✗ ${check.error ?? ''}`}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      </div>
    </main>
  );
}
