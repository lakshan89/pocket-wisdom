import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';

/** Error body shape, following RFC 9457 (Problem Details for HTTP APIs). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId?: string;
  errors?: { path: string; message: string }[];
}

/**
 * Turns every error into an application/problem+json response, so clients
 * handle one error format. Unexpected errors become a generic 500: the
 * stack trace goes to the logs, never to the client.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      this.logger.error(exception);
    }

    const body: ProblemDetails = {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      detail: this.detail(exception, status),
      instance: req.originalUrl,
      requestId: req.id,
      ...this.fieldErrors(exception),
    };

    res.status(status).type('application/problem+json').json(body);
  }

  private detail(exception: unknown, status: number): string {
    if (!(exception instanceof HttpException) || status >= 500) {
      return 'An unexpected error occurred.';
    }
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    const message = (response as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('; ');
    return exception.message;
  }

  private fieldErrors(exception: unknown): Pick<ProblemDetails, 'errors'> {
    if (!(exception instanceof HttpException)) return {};
    const response = exception.getResponse();
    const errors =
      typeof response === 'object'
        ? (response as { errors?: ProblemDetails['errors'] }).errors
        : undefined;
    return errors ? { errors } : {};
  }
}
