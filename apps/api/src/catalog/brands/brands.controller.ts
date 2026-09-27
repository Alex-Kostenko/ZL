import { Controller, Get, Headers, Param, Query, Res } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { LocaleQueryDto } from '../../i18n/locale-query.dto';
import { LocaleService } from '../../i18n/locale.service';
import { BrandDetailDto, BrandListDto, BrandSlugParamDto } from './brands.dto';
import { BrandsService } from './brands.service';

@ApiTags('catalog')
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Used when `locale` is absent',
})
@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brands: BrandsService,
    private readonly locales: LocaleService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Active brands with published products, by name (brands index)' })
  async list(
    @Query() query: LocaleQueryDto,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BrandListDto> {
    const locale = await this.locales.resolve(query.locale, acceptLanguage);
    res.setHeader('Content-Language', locale);
    return this.brands.list(locale);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Brand page: description, logo, SEO; products via /products?brand=' })
  async bySlug(
    @Param() params: BrandSlugParamDto,
    @Query() query: LocaleQueryDto,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BrandDetailDto> {
    const locale = await this.locales.resolve(query.locale, acceptLanguage);
    res.setHeader('Content-Language', locale);
    return this.brands.bySlug(locale, params.slug);
  }
}
