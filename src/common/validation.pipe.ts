import {
  BadRequestException,
  StandardSchemaValidationPipe,
} from '@nestjs/common';

/**
 * Validates any @Body/@Query/@Param that declares a Zod schema. Failures
 * become a 400 listing every invalid field, which ProblemDetailsFilter
 * passes through as `errors`.
 */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) =>
      new BadRequestException({
        message: 'Validation failed',
        errors: issues.map((issue) => ({
          path: (issue.path ?? [])
            .map((segment) =>
              typeof segment === 'object'
                ? String(segment.key)
                : String(segment),
            )
            .join('.'),
          message: issue.message,
        })),
      }),
  });
}
