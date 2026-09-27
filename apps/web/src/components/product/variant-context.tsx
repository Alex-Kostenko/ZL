'use client';

import type { ProductVariantDto } from '@ml/api-client';
import { createContext, type ReactNode, use, useState } from 'react';
import { defaultVariant } from '@/lib/variants';

interface VariantContextValue {
  variants: ProductVariantDto[];
  /** `undefined` only for a product without active variants. */
  variant: ProductVariantDto | undefined;
  setVariant: (variant: ProductVariantDto) => void;
}

const VariantContext = createContext<VariantContextValue | null>(null);

/**
 * Selected variant shared by the gallery (variant photo) and the purchase panel (price, stock).
 * The server render uses the default variant, so price and stock are in the HTML without JS.
 */
export function VariantProvider({
  variants,
  children,
}: {
  variants: ProductVariantDto[];
  children: ReactNode;
}) {
  const [variant, setVariant] = useState(() => defaultVariant(variants));
  return <VariantContext value={{ variants, variant, setVariant }}>{children}</VariantContext>;
}

export function useVariant(): VariantContextValue {
  const value = use(VariantContext);
  if (!value) throw new Error('useVariant() must be used inside <VariantProvider>');
  return value;
}
