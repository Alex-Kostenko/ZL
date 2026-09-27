import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const REQUEST_ID_HEADER = 'x-request-id';

// Accept an upstream id (web SSR, proxy) only if it looks safe to log and echo back.
const VALID_REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;

/** Reuses a valid incoming `X-Request-Id` or creates a UUID; always echoes it in the response. */
export function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}
