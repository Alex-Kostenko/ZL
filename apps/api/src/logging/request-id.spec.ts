import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { REQUEST_ID_HEADER, resolveRequestId } from './request-id';

function call(incoming?: string) {
  const req = { headers: incoming ? { [REQUEST_ID_HEADER]: incoming } : {} } as IncomingMessage;
  const setHeader = vi.fn();
  const id = resolveRequestId(req, { setHeader } as unknown as ServerResponse);
  return { id, setHeader };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('resolveRequestId', () => {
  it('reuses a valid upstream id and echoes it back', () => {
    const { id, setHeader } = call('web-abc-12345');
    expect(id).toBe('web-abc-12345');
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'web-abc-12345');
  });

  it('generates a UUID when the header is missing', () => {
    expect(call().id).toMatch(UUID);
  });

  it.each(['short', 'has spaces in it', '<script>alert(1)</script>', 'x'.repeat(129)])(
    'replaces an unsafe id %j with a UUID',
    (bad) => {
      expect(call(bad).id).toMatch(UUID);
    },
  );
});
