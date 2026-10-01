import { describe, expect, it } from 'vitest';
import { HttpError, checkedResponse, isTransient } from './http-error';

const URL_ASKED = 'https://example.test/model.onnx';

describe('checkedResponse', () => {
  it('passes every OK response through', () => {
    for (const status of [200, 204, 206]) {
      const response = new Response(null, { status });
      expect(checkedResponse(response, 'GET', URL_ASKED)).toBe(response);
    }
  });

  it('passes a status the operation lists as expected through', () => {
    const response = new Response(null, { status: 416 });

    expect(checkedResponse(response, 'GET', URL_ASKED, [416])).toBe(response);
  });

  it('throws an HttpError naming the status, the method and the url for any other status', () => {
    const response = new Response(null, { status: 404 });

    expect(() => checkedResponse(response, 'GET', URL_ASKED, [416])).toThrow(HttpError);
    expect(() => checkedResponse(response, 'GET', URL_ASKED)).toThrow(
      `GET ${URL_ASKED} answered 404`,
    );
  });

  it('keeps the status, the method and the url on the error', () => {
    const thrown = new HttpError(503, 'GET', URL_ASKED);

    expect([thrown.status, thrown.method, thrown.url]).toEqual([503, 'GET', URL_ASKED]);
  });
});

describe('isTransient', () => {
  it('counts a server error, a timeout and a rate limit as transient', () => {
    for (const status of [500, 502, 503, 408, 429]) {
      expect(isTransient(new HttpError(status, 'GET', URL_ASKED))).toBe(true);
    }
  });

  it('counts every other client error as lasting', () => {
    for (const status of [400, 401, 403, 404, 410, 416]) {
      expect(isTransient(new HttpError(status, 'GET', URL_ASKED))).toBe(false);
    }
  });

  it('counts the TypeError fetch rejects with on a network failure as transient', () => {
    expect(isTransient(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('counts any other failure as lasting', () => {
    expect(isTransient(new Error('The disk is full'))).toBe(false);
    expect(isTransient('offline')).toBe(false);
  });
});
