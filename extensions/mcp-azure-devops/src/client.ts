import { AzureDevOpsApiError } from './errors.js';

export interface AzureDevOpsClient {
  listPullRequests(repositoryId: string, status?: string, top?: number): Promise<unknown>;
  getPullRequest(repositoryId: string, pullRequestId: number): Promise<unknown>;
  getPullRequestDiff(repositoryId: string, pullRequestId: number): Promise<unknown>;
  createPullRequest(
    repositoryId: string,
    title: string,
    sourceRefName: string,
    targetRefName: string,
    description?: string
  ): Promise<unknown>;
  mergePullRequest(repositoryId: string, pullRequestId: number, comment?: string): Promise<unknown>;
  listWorkItems(wiql?: string, ids?: number[]): Promise<unknown>;
  getWorkItem(id: number): Promise<unknown>;
  updateWorkItem(id: number, fields: Record<string, unknown>): Promise<unknown>;
}

export interface AzureDevOpsClientConfig {
  org: string;
  project: string;
  token: string;
  fetchFn?: typeof fetch;
}

const API_VERSION_KEY = 'api-version';
const API_VERSION_VALUE = '7.1';

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function createAzureDevOpsClient({
  org,
  project,
  token,
  fetchFn = fetch,
}: AzureDevOpsClientConfig): AzureDevOpsClient {
  const baseUrl = `https://dev.azure.com/${org}/${project}/_apis/`;
  const authHeader = `Basic ${Buffer.from(`:${token}`).toString('base64')}`;

  async function request(
    method: string,
    relativeUrl: string,
    body?: unknown,
    contentType = 'application/json'
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      Authorization: authHeader,
      Accept: 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = contentType;
    }

    let response: Response;
    try {
      response = await fetchFn(baseUrl + relativeUrl, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AzureDevOpsApiError(0, err, `Network error contacting Azure DevOps: ${message}`);
    }

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new AzureDevOpsApiError(
        response.status,
        responseBody,
        `Azure DevOps API returned ${response.status}`
      );
    }

    return responseBody;
  }

  return {
    async listPullRequests(repositoryId: string, status = 'active', top?: number): Promise<unknown> {
      const params = new URLSearchParams();
      params.set('searchCriteria.status', status);
      params.set(API_VERSION_KEY, API_VERSION_VALUE);
      if (top !== undefined) {
        params.set('$top', String(top));
      }
      return request('GET', `git/repositories/${repositoryId}/pullrequests?${params.toString()}`);
    },

    async getPullRequest(repositoryId: string, pullRequestId: number): Promise<unknown> {
      const params = new URLSearchParams();
      params.set(API_VERSION_KEY, API_VERSION_VALUE);
      return request(
        'GET',
        `git/repositories/${repositoryId}/pullrequests/${pullRequestId}?${params.toString()}`
      );
    },

    async getPullRequestDiff(repositoryId: string, pullRequestId: number): Promise<unknown> {
      const params = new URLSearchParams();
      params.set(API_VERSION_KEY, API_VERSION_VALUE);
      return request(
        'GET',
        `git/repositories/${repositoryId}/pullrequests/${pullRequestId}/diff?${params.toString()}`
      );
    },

    async createPullRequest(
      repositoryId: string,
      title: string,
      sourceRefName: string,
      targetRefName: string,
      description?: string
    ): Promise<unknown> {
      const body: Record<string, unknown> = {
        title,
        sourceRefName,
        targetRefName,
      };
      if (description !== undefined) {
        body.description = description;
      }
      const params = new URLSearchParams();
      params.set(API_VERSION_KEY, API_VERSION_VALUE);
      return request('POST', `git/repositories/${repositoryId}/pullrequests?${params.toString()}`, body);
    },

    async mergePullRequest(
      repositoryId: string,
      pullRequestId: number,
      comment?: string
    ): Promise<unknown> {
      const body: Record<string, unknown> = {
        status: 'completed',
      };
      if (comment !== undefined) {
        body.completionOptions = { mergeCommitMessage: comment };
      }
      const params = new URLSearchParams();
      params.set(API_VERSION_KEY, API_VERSION_VALUE);
      return request(
        'PATCH',
        `git/repositories/${repositoryId}/pullrequests/${pullRequestId}?${params.toString()}`,
        body
      );
    },

    async listWorkItems(wiql?: string, ids?: number[]): Promise<unknown> {
      if (ids !== undefined && ids.length > 0) {
        const params = new URLSearchParams();
        params.set('ids', ids.join(','));
        params.set(API_VERSION_KEY, API_VERSION_VALUE);
        return request('GET', `wit/workitems?${params.toString()}`);
      }
      if (wiql !== undefined) {
        const params = new URLSearchParams();
        params.set(API_VERSION_KEY, API_VERSION_VALUE);
        return request('POST', `wit/wiql?${params.toString()}`, { query: wiql });
      }
      throw new AzureDevOpsApiError(400, undefined, 'Either wiql or ids must be provided');
    },

    async getWorkItem(id: number): Promise<unknown> {
      const params = new URLSearchParams();
      params.set(API_VERSION_KEY, API_VERSION_VALUE);
      return request('GET', `wit/workitems/${id}?${params.toString()}`);
    },

    async updateWorkItem(id: number, fields: Record<string, unknown>): Promise<unknown> {
      const patch = Object.entries(fields).map(([key, value]) => ({
        op: 'add',
        path: `/fields/${key}`,
        value,
      }));
      const params = new URLSearchParams();
      params.set(API_VERSION_KEY, API_VERSION_VALUE);
      return request(
        'PATCH',
        `wit/workitems/${id}?${params.toString()}`,
        patch,
        'application/json-patch+json'
      );
    },
  };
}
