import { Controller, Get, HttpStatus, Res, VERSION_NEUTRAL } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { LivenessDto, ReadinessDto } from './health.dto';
import { HealthService } from './health.service';

/** Probes for load balancers / orchestrators. Unversioned and outside `/api` (see app.setup.ts). */
@ApiTags('system')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness: the process is up (no dependency checks)' })
  @ApiOkResponse({ type: LivenessDto })
  liveness(): LivenessDto {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness: PostgreSQL, Redis, Meilisearch reachable' })
  @ApiOkResponse({ type: ReadinessDto })
  @ApiServiceUnavailableResponse({ type: ReadinessDto, description: 'A dependency is down' })
  async readiness(@Res({ passthrough: true }) res: Response): Promise<ReadinessDto> {
    const result = await this.health.readiness();
    // Same body on failure (not the unified error format) so probes see which dependency is down.
    if (result.status !== 'ok') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }
}
