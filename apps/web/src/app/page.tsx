import { healthReadiness, type ReadinessDto } from '@ml/api-client';
import { api } from '@/lib/api';

// Rendered per request: the API is not reachable at build time (CI, Docker build).
export const dynamic = 'force-dynamic';

const CHECK_LABELS = { database: 'PostgreSQL', redis: 'Redis', search: 'Meilisearch' } as const;

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

export default async function HomePage() {
  const status = await getApiStatus();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold">Мисливська лавка</h1>
      <p className="text-lg text-neutral-600">Каркас storefront готовий.</p>

      <section className="w-full max-w-sm rounded-lg border border-neutral-200 p-4 text-left">
        <h2 className="mb-3 font-semibold">
          API: {status ? (status.status === 'ok' ? 'працює' : 'є проблеми') : 'недоступний'}
        </h2>
        {status && (
          <ul className="space-y-1 text-sm">
            {Object.entries(status.checks).map(([key, check]) => (
              <li key={key} className="flex justify-between">
                <span>{CHECK_LABELS[key as keyof typeof CHECK_LABELS]}</span>
                <span className={check.status === 'up' ? 'text-green-700' : 'text-red-700'}>
                  {check.status === 'up' ? `✓ ${check.latencyMs} мс` : `✗ ${check.error ?? ''}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
