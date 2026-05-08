import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', this.metrics.contentType());
    res.end(await this.metrics.getMetrics());
  }
}
