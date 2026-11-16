import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProblemDetailsFilter } from './problem-details.filter.js';

function run(exception: unknown) {
  const res = {
    status: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { originalUrl: '/v1/quotes/42', id: 'req-1' };
  const host = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;

  const filter = new ProblemDetailsFilter();
  vi.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  filter.catch(exception, host);
  return { res, body: res.json.mock.calls[0][0], filter };
}

describe('ProblemDetailsFilter', () => {
  it('maps an HttpException to problem+json', () => {
    const { res, body } = run(new NotFoundException('Quote 42 not found'));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.type).toHaveBeenCalledWith('application/problem+json');
    expect(body).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Quote 42 not found',
      instance: '/v1/quotes/42',
      requestId: 'req-1',
    });
  });

  it('passes field errors through from validation failures', () => {
    const errors = [{ path: 'limit', message: 'Too big' }];
    const { body } = run(
      new BadRequestException({ message: 'Validation failed', errors }),
    );
    expect(body).toMatchObject({
      status: 400,
      detail: 'Validation failed',
      errors,
    });
  });

  it('hides internals of unexpected errors and logs them', () => {
    const { res, body, filter } = run(new Error('db password is hunter2'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(body.detail).toBe('An unexpected error occurred.');
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(filter['logger'].error).toHaveBeenCalled();
  });
});
