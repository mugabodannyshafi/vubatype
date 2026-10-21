import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DateTime } from 'luxon';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): object {
    return {
      status: 'ok',
      timestamp: DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss'),
    };
  }
}
