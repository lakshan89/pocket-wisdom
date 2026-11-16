import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolveRequestId } from './logging.module.js';

function call(header?: string) {
  const req = { headers: header ? { 'x-request-id': header } : {} };
  const setHeader = vi.fn();
  const id = resolveRequestId(
    req as unknown as IncomingMessage,
    { setHeader } as unknown as ServerResponse,
  );
  return { id, setHeader };
}

describe('resolveRequestId', () => {
  it('reuses a well-formed incoming id and echoes it back', () => {
    const { id, setHeader } = call('abc-123');
    expect(id).toBe('abc-123');
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'abc-123');
  });

  it('generates a UUID when the header is missing', () => {
    expect(call().id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('ignores ids that could inject content into logs', () => {
    expect(call('bad id\n{"level":"fatal"}').id).not.toContain('fatal');
  });
});
