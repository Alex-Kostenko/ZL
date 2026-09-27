export class LivenessDto {
  /** Always `ok` while the process serves HTTP. */
  status: 'ok';
}

export class DependencyCheckDto {
  status: 'up' | 'down';
  /** Round-trip time of the check. */
  latencyMs: number;
  /** Short reason when down (`timeout`, `unreachable`); never contains hosts or credentials. */
  error?: string;
}

export class ReadinessChecksDto {
  database: DependencyCheckDto;
  redis: DependencyCheckDto;
  search: DependencyCheckDto;
}

export class ReadinessDto {
  /** `ok` only if every dependency is up; otherwise HTTP 503. */
  status: 'ok' | 'error';
  checks: ReadinessChecksDto;
}
