import { describe, expect, it } from 'vitest';
import { ErrorCode, errorCodeForStatus } from './error-code';

describe('errorCodeForStatus', () => {
  it.each([
    [400, ErrorCode.BAD_REQUEST],
    [401, ErrorCode.UNAUTHORIZED],
    [403, ErrorCode.FORBIDDEN],
    [404, ErrorCode.NOT_FOUND],
    [409, ErrorCode.CONFLICT],
    [429, ErrorCode.TOO_MANY_REQUESTS],
    [503, ErrorCode.SERVICE_UNAVAILABLE],
  ])('maps %i to %s', (status, code) => {
    expect(errorCodeForStatus(status)).toBe(code);
  });

  it('falls back to INTERNAL_ERROR for unmapped 5xx and BAD_REQUEST for unmapped 4xx', () => {
    expect(errorCodeForStatus(502)).toBe(ErrorCode.INTERNAL_ERROR);
    expect(errorCodeForStatus(418)).toBe(ErrorCode.BAD_REQUEST);
  });
});
