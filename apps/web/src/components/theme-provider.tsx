'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

// Sets `.dark` on <html> before paint (inline script), so there is no theme flash.
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider attribute="class" enableSystem disableTransitionOnChange {...props} />;
}
