import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppInfoDto } from './app-info.dto';

@ApiTags('system')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API info' })
  @ApiOkResponse({ type: AppInfoDto })
  getRoot(): AppInfoDto {
    return { name: 'myslyvska-lavka-api', status: 'ok' };
  }
}
