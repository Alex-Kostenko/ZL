import { IsOptional, Matches } from 'class-validator';

/** Base for public query DTOs: optional response language. Extend it instead of redeclaring. */
export class LocaleQueryDto {
  /**
   * Response language (`uk`, `ru`, `en`). Unsupported → `Accept-Language` → `uk`.
   * @example ru
   */
  @IsOptional()
  @Matches(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/, { message: 'locale must be a language code' })
  locale?: string;
}
