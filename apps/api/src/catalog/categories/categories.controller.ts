import { Controller, Get, Headers, Query, Res } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { LocaleQueryDto } from '../../i18n/locale-query.dto';
import { LocaleService } from '../../i18n/locale.service';
import { CategoryByPathQueryDto, CategoryDetailDto, CategoryTreeDto } from './categories.dto';
import { CategoriesService } from './categories.service';

@ApiTags('catalog')
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Used when `locale` is absent',
})
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly locales: LocaleService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Active category tree (menu, sitemap)' })
  async getTree(
    @Query() query: LocaleQueryDto,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CategoryTreeDto> {
    const locale = await this.locales.resolve(query.locale, acceptLanguage);
    res.setHeader('Content-Language', locale);
    return this.categories.tree(locale);
  }

  @Get('by-path')
  @ApiOperation({ summary: 'Category page by slug path, with breadcrumbs and subcategories' })
  async getByPath(
    @Query() query: CategoryByPathQueryDto,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CategoryDetailDto> {
    const locale = await this.locales.resolve(query.locale, acceptLanguage);
    res.setHeader('Content-Language', locale);
    return this.categories.byPath(locale, query.path);
  }
}
