import { ServiceNowApiError } from './errors.js';

export interface ServiceNowClient {
  listIncidents(limit?: number, state?: string): Promise<unknown>;
  getIncidentBySysId(sysId: string): Promise<unknown>;
  getIncidentByNumber(number: string): Promise<unknown>;
  updateIncident(sysId: string, fields: Record<string, unknown>): Promise<unknown>;
  createIncident(fields: Record<string, unknown>): Promise<unknown>;
}

export interface ServiceNowClientConfig {
  instance: string;
  username: string;
  password: string;
  fetchFn?: typeof fetch;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function createServiceNowClient({
  instance,
  username,
  password,
  fetchFn = fetch,
}: ServiceNowClientConfig): ServiceNowClient {
  const baseUrl = `https://${instance}.service-now.com/api/now/table/incident`;
  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  async function request(
    method: string,
    resourcePath: string,
    query?: URLSearchParams,
    body?: unknown
  ): Promise<unknown> {
    const url = query && query.toString() ? `${baseUrl}${resourcePath}?${query.toString()}` : `${baseUrl}${resourcePath}`;

    const headers: Record<string, string> = {
      Authorization: authHeader,
      Accept: 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetchFn(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ServiceNowApiError(0, err, `Network error contacting ServiceNow: ${message}`);
    }

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new ServiceNowApiError(
        response.status,
        responseBody,
        `ServiceNow API returned ${response.status}`
      );
    }

    return responseBody;
  }

  return {
    async listIncidents(limit?: number, state?: string): Promise<unknown> {
      const params = new URLSearchParams();
      if (limit !== undefined) {
        params.set('sysparm_limit', String(limit));
      }
      if (state !== undefined) {
        params.set('sysparm_query', `state=${state}`);
      }
      return request('GET', '', params);
    },

    async getIncidentBySysId(sysId: string): Promise<unknown> {
      return request('GET', `/${encodeURIComponent(sysId)}`);
    },

    async getIncidentByNumber(number: string): Promise<unknown> {
      const params = new URLSearchParams();
      params.set('sysparm_query', `number=${number}`);
      params.set('sysparm_limit', '1');
      const result = (await request('GET', '', params)) as { result?: unknown[] };
      return Array.isArray(result?.result) && result.result.length > 0 ? result.result[0] : result;
    },

    async updateIncident(sysId: string, fields: Record<string, unknown>): Promise<unknown> {
      return request('PUT', `/${encodeURIComponent(sysId)}`, undefined, fields);
    },

    async createIncident(fields: Record<string, unknown>): Promise<unknown> {
      return request('POST', '', undefined, fields);
    },
  };
}
