export class ErrorDetailDto {
  /** Dot path of the invalid field, e.g. `address.city` or `items.0.qty`. */
  field: string;
  /** Human-readable problems with this field. */
  messages: string[];
}

/** Every non-2xx response of the API has exactly this shape. */
export class ErrorResponseDto {
  /** HTTP status code. */
  statusCode: number;
  /** Machine-readable code, e.g. `VALIDATION_FAILED`, `NOT_FOUND`. */
  code: string;
  /** Human-readable summary; safe to show, never contains internals. */
  message: string;
  /** Correlates with server logs and the `X-Request-Id` header. */
  requestId: string;
  /** Per-field problems (validation errors). */
  details?: ErrorDetailDto[];
}
