import { Controller, Get, Headers, Param, Query, Res } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { LocaleQueryDto } from '../../i18n/locale-query.dto';
import { LocaleService } from '../../i18n/locale.service';
import {
  ProductDetailDto,
  ProductListDto,
  ProductListQueryDto,
  ProductSlugParamDto,
} from './products.dto';
import { ProductsService } from './products.service';

@ApiTags('catalog')
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Used when `locale` is absent',
})
@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly locales: LocaleService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Published products, newest first, by category subtree and/or brand' })
  async list(
    @Query() query: ProductListQueryDto,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ProductListDto> {
    const locale = await this.locales.resolve(query.locale, acceptLanguage);
    res.setHeader('Content-Language', locale);
    return this.products.list(locale, query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Product page: variants, characteristics, gallery, price, stock' })
  async bySlug(
    @Param() params: ProductSlugParamDto,
    @Query() query: LocaleQueryDto,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ProductDetailDto> {
    const locale = await this.locales.resolve(query.locale, acceptLanguage);
    res.setHeader('Content-Language', locale);
    return this.products.bySlug(locale, params.slug);
  }
}
