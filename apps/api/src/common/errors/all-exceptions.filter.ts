import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { AppException } from './app.exception';
import { ErrorCode, errorCodeForStatus } from './error-code';
import type { ErrorResponseDto } from './error-response.dto';
import { resolveRequestId } from '../../logging/request-id';

type Normalized = Omit<ErrorResponseDto, 'requestId'>;

// Known Prisma errors that are client mistakes, not server failures.
const PRISMA_ERRORS: Record<string, Normalized> = {
  P2002: {
    statusCode: HttpStatus.CONFLICT,
    code: ErrorCode.CONFLICT,
    message: 'Resource already exists',
  },
  P2025: {
    statusCode: HttpStatus.NOT_FOUND,
    code: ErrorCode.NOT_FOUND,
    message: 'Resource not found',
  },
};

const INTERNAL: Normalized = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  code: ErrorCode.INTERNAL_ERROR,
  message: 'Internal server error',
};

function normalize(exception: unknown): Normalized {
  if (exception instanceof AppException) {
    return {
      statusCode: exception.getStatus(),
      code: exception.code,
      message: exception.message,
      details: exception.details,
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const body = exception.getResponse();
    const raw = typeof body === 'object' && 'message' in body ? body.message : body;
    const message = Array.isArray(raw) ? raw.join('; ') : String(raw);
    // Never echo framework internals of a 5xx HttpException to the client.
    return status >= 500
      ? { ...INTERNAL, statusCode: status, code: errorCodeForStatus(status) }
      : { statusCode: status, code: errorCodeForStatus(status), message };
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return PRISMA_ERRORS[exception.code] ?? INTERNAL;
  }
  return INTERNAL;
}

/**
 * Renders every HTTP error as ErrorResponseDto. Internals (stack, SQL, Prisma meta) never reach
 * the client; 5xx causes are attached to `res.err` so pino-http logs them once, with requestId.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;

    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();
    const error = normalize(exception);

    if (error.statusCode >= 500) {
      res.err = exception instanceof Error ? exception : new Error(String(exception));
    }

    // req.id is unset when express fails before pino-http runs (e.g. malformed JSON body).
    const requestId = req.id ?? resolveRequestId(req, res);
    const body: ErrorResponseDto = { ...error, requestId };
    res.status(error.statusCode).json(body);
  }
}
