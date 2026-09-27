import 'reflect-metadata';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, Min, ValidateNested } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code';
import { createValidationPipe } from './validation.pipe';

class ItemDto {
  @IsInt()
  @Min(1)
  qty: number;
}

class OrderDto {
  @IsEmail()
  email: string;

  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}

const validate = (value: unknown) =>
  createValidationPipe().transform(value, { type: 'body', metatype: OrderDto });

describe('createValidationPipe', () => {
  it('passes and transforms a valid body into the DTO class', async () => {
    const result = await validate({ email: 'a@b.ua', items: [{ qty: 2 }] });
    expect(result).toBeInstanceOf(OrderDto);
    expect(result.items[0]).toBeInstanceOf(ItemDto);
  });

  it('throws VALIDATION_FAILED with flattened nested field paths', async () => {
    const error = await validate({ email: 'nope', items: [{ qty: 0 }] }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppException);
    const appError = error as AppException;
    expect(appError.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(appError.getStatus()).toBe(400);
    expect(appError.details?.map((d) => d.field)).toEqual(['email', 'items.0.qty']);
  });

  it('rejects unknown fields instead of silently stripping them', async () => {
    const error = (await validate({ email: 'a@b.ua', items: [], isAdmin: true }).catch(
      (e: unknown) => e,
    )) as AppException;

    expect(error.details).toEqual([
      { field: 'isAdmin', messages: ['property isAdmin should not exist'] },
    ]);
  });
});
