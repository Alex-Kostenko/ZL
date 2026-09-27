import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from './error-code';
import type { ErrorDetailDto } from './error-response.dto';

/** Domain error with an explicit machine-readable code; rendered by AllExceptionsFilter. */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: ErrorDetailDto[],
  ) {
    super(message, status);
  }
}
