import type { Request, Response } from 'express';

import { checkDatabaseReadiness } from '../../infrastructure/database/index.js';
import { setGauge } from '../../infrastructure/metrics/metrics.js';
import { checkRedisReadiness } from '../../infrastructure/redis/index.js';

interface HealthResponseBody {
  status: 'ok';
  timestamp: string;
  service: 'etroy-oidc';
  uptime: number;
}

interface DependencyReadinessResponse {
  dependency: 'mongodb' | 'redis';
  status: 'up' | 'down';
}

interface ReadinessResponseBody {
  status: 'ready' | 'not_ready';
  timestamp: string;
  service: 'etroy-oidc';
  dependencies: DependencyReadinessResponse[];
}

const SERVICE_NAME = 'etroy-oidc';

export const healthHandler = (_request: Request, response: Response<HealthResponseBody>): void => {
  response.status(200).json({
    status: 'ok',
    timestamp: new Date(Date.now()).toISOString(),
    service: SERVICE_NAME,
    uptime: Math.floor(process.uptime()),
  });
};

export const readinessHandler = async (
  _request: Request,
  response: Response<ReadinessResponseBody>,
): Promise<void> => {
  const dependencies = await Promise.all([checkDatabaseReadiness(), checkRedisReadiness()]);
  const readiness = dependencies.every((dependency) => dependency.status === 'up')
    ? 'ready'
    : 'not_ready';

  for (const dependency of dependencies) {
    setGauge('health_dependency_ready', dependency.status === 'up' ? 1 : 0, {
      dependency: dependency.dependency,
    });
  }

  setGauge('health_readiness_status', readiness === 'ready' ? 1 : 0, {
    dependency: 'system',
  });

  response.status(readiness === 'ready' ? 200 : 503).json({
    status: readiness,
    timestamp: new Date(Date.now()).toISOString(),
    service: SERVICE_NAME,
    dependencies,
  });
};
