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
        errors: issues.map((issue) => {
          const path = (issue.path ?? [])
            .map((segment) =>
              typeof segment === 'object'
                ? String(segment.key)
                : String(segment),
            )
            .join('.');
          // A @Param schema validates a bare value, so there's no path.
          return path
            ? { path, message: issue.message }
            : { message: issue.message };
        }),
      }),
  });
}
