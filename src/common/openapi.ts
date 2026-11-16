import type { ApiResponseSchemaHost } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * Converts a Zod response schema into an OpenAPI schema for @ApiOkResponse,
 * so the TypeScript type and the API docs come from the same definition.
 */
export function toOpenApi(schema: z.ZodType): ApiResponseSchemaHost['schema'] {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'output',
  }) as ApiResponseSchemaHost['schema'];
}
