import { HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code';
import type { ErrorDetailDto } from './error-response.dto';

function flatten(errors: ValidationError[], parent = ''): ErrorDetailDto[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = error.constraints ? [{ field, messages: Object.values(error.constraints) }] : [];
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

/** Global DTO validation; unknown fields are rejected, not silently stripped. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
    exceptionFactory: (errors) =>
      new AppException(
        ErrorCode.VALIDATION_FAILED,
        'Validation failed',
        HttpStatus.BAD_REQUEST,
        flatten(errors),
      ),
  });
}
