import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot(): { name: string; status: string } {
    return { name: 'myslyvska-lavka-api', status: 'ok' };
  }
}
