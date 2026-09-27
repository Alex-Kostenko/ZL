import { serializeJsonLd } from '@/lib/structured-data';

/** Schema.org data for crawlers, rendered in the server HTML (§67.2). */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Escaped in serializeJsonLd: catalogue text cannot close the script element.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
