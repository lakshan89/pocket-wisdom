import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import type { Env } from '../config/env.schema.js';

/**
 * /health is unversioned so load balancer settings never change between
 * API versions, and never rate limited so health checks can't get a 429.
 */
@ApiTags('health')
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Liveness: the process is up and serving HTTP. The ALB target group
   * checks this. It deliberately skips the database, so a short database
   * outage doesn't make the ALB pull every container out of service.
   * Shows which build is running, handy for checking a promotion landed.
   */
  @Get()
  live() {
    return {
      status: 'ok',
      version: this.config.get('APP_VERSION', { infer: true }),
      env: this.config.get('APP_ENV', { infer: true }),
    };
  }

  /** Readiness: dependencies are reachable. The database check comes next. */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([]);
  }
}
