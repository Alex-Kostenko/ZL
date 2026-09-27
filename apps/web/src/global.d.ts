import type messages from '../messages/uk.json';
import type { routing } from './i18n/routing';

// Typed locales and message keys for next-intl (uk.json is the reference dictionary).
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
