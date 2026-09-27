import { Controller, Get, Headers, Query, Res } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { LocaleService } from '../i18n/locale.service';
import { SearchQueryDto, SearchResultDto, SuggestQueryDto, SuggestResultDto } from './search.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Used when `locale` is absent',
})
@Controller('search')
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly locales: LocaleService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Full-text search and faceted browsing: filters, sorting, disjunctive facet counts',
  })
  async find(
    @Query() query: SearchQueryDto,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SearchResultDto> {
    const locale = await this.locales.resolve(query.locale, acceptLanguage);
    res.setHeader('Content-Language', locale);
    return this.search.search(locale, query);
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Autocomplete: top products, categories and brands for typed text' })
  async suggest(
    @Query() query: SuggestQueryDto,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuggestResultDto> {
    const locale = await this.locales.resolve(query.locale, acceptLanguage);
    res.setHeader('Content-Language', locale);
    return this.search.suggest(locale, query);
  }
}
