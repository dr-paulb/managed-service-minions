/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';
import { createServiceNowClient, type ServiceNowClient } from '../client.js';
import { ServiceNowApiError } from '../errors.js';

describe('createServiceNowClient', () => {
  const instance = 'testinstance';
  const username = 'testuser';
  const password = 'testpass';
  let fetchFn: jest.Mock<any>;
  let client: ServiceNowClient;

  beforeEach(() => {
    fetchFn = jest.fn() as jest.Mock<any>;
    client = createServiceNowClient({ instance, username, password, fetchFn });
  });

  it('uses the global fetch when fetchFn is omitted', () => {
    const defaultClient = createServiceNowClient({ instance, username, password });
    expect(defaultClient).toBeDefined();
  });

  function mockResponse(response: { ok: boolean; status: number; text: string }) {
    fetchFn.mockResolvedValue({
      ok: response.ok,
      status: response.status,
      text: async () => response.text,
    });
  }

  it('uses the expected base URL and auth header', async () => {
    mockResponse({ ok: true, status: 200, text: '{}' });
    await client.getIncidentBySysId('abc123');

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://testinstance.service-now.com/api/now/table/incident/abc123');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('testuser:testpass').toString('base64')}`,
      Accept: 'application/json',
    });
  });

  describe('listIncidents', () => {
    it('lists with no filters', async () => {
      mockResponse({ ok: true, status: 200, text: '{"result":[]}' });
      await client.listIncidents();
      const [url] = fetchFn.mock.calls[0] as [string];
      expect(url).toBe('https://testinstance.service-now.com/api/now/table/incident');
    });

    it('lists with limit and state', async () => {
      mockResponse({ ok: true, status: 200, text: '{"result":[]}' });
      await client.listIncidents(10, '1');
      const [url] = fetchFn.mock.calls[0] as [string];
      expect(url).toContain('sysparm_limit=10');
      expect(url).toContain('sysparm_query=state%3D1');
    });

    it('lists with only state', async () => {
      mockResponse({ ok: true, status: 200, text: '{"result":[]}' });
      await client.listIncidents(undefined, '2');
      const [url] = fetchFn.mock.calls[0] as [string];
      expect(url).toContain('sysparm_query=state%3D2');
      expect(url).not.toContain('sysparm_limit');
    });
  });

  describe('getIncidentBySysId', () => {
    it('fetches an incident by sys_id', async () => {
      mockResponse({ ok: true, status: 200, text: '{"result":{"sys_id":"abc123"}}' });
      const result = await client.getIncidentBySysId('abc123');
      expect(result).toEqual({ result: { sys_id: 'abc123' } });
    });
  });

  describe('getIncidentByNumber', () => {
    it('fetches an incident by number and returns the first result', async () => {
      mockResponse({ ok: true, status: 200, text: '{"result":[{"sys_id":"abc123","number":"INC001"}]}' });
      const result = await client.getIncidentByNumber('INC001');
      expect(result).toEqual({ sys_id: 'abc123', number: 'INC001' });
    });

    it('returns the raw response when result array is empty', async () => {
      mockResponse({ ok: true, status: 200, text: '{"result":[]}' });
      const result = await client.getIncidentByNumber('INC999');
      expect(result).toEqual({ result: [] });
    });

    it('handles unexpected response shape gracefully', async () => {
      mockResponse({ ok: true, status: 200, text: '{"result":{}}' });
      const result = await client.getIncidentByNumber('INC001');
      expect(result).toEqual({ result: {} });
    });
  });

  describe('updateIncident', () => {
    it('updates an incident', async () => {
      mockResponse({ ok: true, status: 200, text: '{"result":{"sys_id":"abc123"}}' });
      const result = await client.updateIncident('abc123', { state: '2' });
      expect(result).toEqual({ result: { sys_id: 'abc123' } });
      const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body as string)).toEqual({ state: '2' });
    });
  });

  describe('createIncident', () => {
    it('creates an incident', async () => {
      mockResponse({ ok: true, status: 201, text: '{"result":{"sys_id":"abc123","number":"INC001"}}' });
      const result = await client.createIncident({ short_description: 'Test incident' });
      expect(result).toEqual({ result: { sys_id: 'abc123', number: 'INC001' } });
      const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ short_description: 'Test incident' });
    });
  });

  describe('ServiceNowApiError', () => {
    it('uses a default message when none is provided', () => {
      const error = new ServiceNowApiError(500, { message: 'bad' });
      expect(error.message).toBe('ServiceNow API error (500)');
      expect(error.status).toBe(500);
      expect(error.body).toEqual({ message: 'bad' });
    });
  });

  describe('error handling', () => {
    it('throws ServiceNowApiError for non-2xx responses', async () => {
      mockResponse({ ok: false, status: 404, text: '{"error":{"message":"Not found"}}' });
      await expect(client.getIncidentBySysId('abc123')).rejects.toMatchObject({
        status: 404,
        body: { error: { message: 'Not found' } },
      });
    });

    it('throws ServiceNowApiError for non-JSON error bodies', async () => {
      mockResponse({ ok: false, status: 500, text: 'Internal Server Error' });
      const error = await client.getIncidentBySysId('abc123').catch((e) => e);
      expect(error).toBeInstanceOf(ServiceNowApiError);
      expect(error.status).toBe(500);
      expect(error.body).toBe('Internal Server Error');
    });

    it('throws ServiceNowApiError for network failures', async () => {
      fetchFn.mockRejectedValue(new Error('ECONNREFUSED'));
      const error = await client.getIncidentBySysId('abc123').catch((e) => e);
      expect(error).toBeInstanceOf(ServiceNowApiError);
      expect(error.status).toBe(0);
      expect(error.message).toContain('ECONNREFUSED');
    });

    it('throws ServiceNowApiError for non-Error network failures', async () => {
      fetchFn.mockRejectedValue('failure');
      const error = await client.getIncidentBySysId('abc123').catch((e) => e);
      expect(error).toBeInstanceOf(ServiceNowApiError);
      expect(error.message).toContain('failure');
    });

    it('returns undefined for empty response bodies', async () => {
      mockResponse({ ok: true, status: 204, text: '' });
      const result = await client.getIncidentBySysId('abc123');
      expect(result).toBeUndefined();
    });
  });
});
