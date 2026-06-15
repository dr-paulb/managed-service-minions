/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';
import { createJiraClient } from '../client.js';
import { JiraApiError } from '../errors.js';

function mockResponse(options: {
  ok: boolean;
  status: number;
  json?: unknown;
  text?: string;
}): Response {
  return {
    ok: options.ok,
    status: options.status,
    json: async () => options.json,
    text: async () => options.text ?? '',
  } as unknown as Response;
}

function createFetchMock() {
  return jest.fn() as jest.Mock<
    (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  >;
}

describe('createJiraClient', () => {
  let fetchMock: ReturnType<typeof createFetchMock>;

  beforeEach(() => {
    fetchMock = createFetchMock();
  });

  const options = {
    host: 'jira.example.com',
    email: 'user@example.com',
    apiToken: 'token',
  };

  function authHeader(): string {
    return `Basic ${Buffer.from('user@example.com:token').toString('base64')}`;
  }

  it('uses global fetch when fetchFn is not supplied', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ ok: true, status: 200, json: { issues: [] } })
    );
    const globalSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(fetchMock as unknown as typeof fetch);

    const client = createJiraClient(options);
    await client.listIssues({ projectKey: 'PROJ' });

    expect(globalSpy).toHaveBeenCalledWith(
      'https://jira.example.com/rest/api/2/search?jql=project%3DPROJ',
      expect.anything()
    );

    globalSpy.mockRestore();
  });

  it('trims trailing slashes from host', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ ok: true, status: 200, json: { issues: [] } })
    );
    const client = createJiraClient({ ...options, host: 'jira.example.com/', fetchFn: fetchMock as any });
    await client.listIssues({ projectKey: 'PROJ' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://jira.example.com/rest/api/2/search?jql=project%3DPROJ',
      expect.anything()
    );
  });

  describe('listIssues', () => {
    it('lists issues without status or limit', async () => {
      const issues = [{ key: 'PROJ-1' }];
      fetchMock.mockResolvedValue(
        mockResponse({ ok: true, status: 200, json: { issues } })
      );
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      const result = await client.listIssues({ projectKey: 'PROJ' });
      expect(result).toEqual(issues);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/search?jql=project%3DPROJ',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: authHeader(),
            Accept: 'application/json',
          }),
        })
      );
    });

    it('filters by status and applies limit', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ ok: true, status: 200, json: { issues: [] } })
      );
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      await client.listIssues({ projectKey: 'PROJ', status: 'Open', limit: 10 });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/search?jql=project%3DPROJ+AND+status%3DOpen&maxResults=10',
        expect.anything()
      );
    });

    it('applies limit without status', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ ok: true, status: 200, json: { issues: [] } })
      );
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      await client.listIssues({ projectKey: 'PROJ', limit: 5 });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/search?jql=project%3DPROJ&maxResults=5',
        expect.anything()
      );
    });

    it('filters by status without limit', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ ok: true, status: 200, json: { issues: [] } })
      );
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      await client.listIssues({ projectKey: 'PROJ', status: 'Closed' });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/search?jql=project%3DPROJ+AND+status%3DClosed',
        expect.anything()
      );
    });
  });

  describe('getIssue', () => {
    it('fetches an issue by key', async () => {
      const issue = { key: 'PROJ-2' };
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 200, json: issue }));
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      const result = await client.getIssue({ issueKey: 'PROJ-2' });
      expect(result).toEqual(issue);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/issue/PROJ-2',
        expect.anything()
      );
    });
  });

  describe('updateIssue', () => {
    it('updates issue fields', async () => {
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 204 }));
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      await client.updateIssue({ issueKey: 'PROJ-3', fields: { summary: 'Updated' } });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/issue/PROJ-3',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ fields: { summary: 'Updated' } }),
        })
      );
    });
  });

  describe('createIssue', () => {
    it('creates an issue with description', async () => {
      const issue = { key: 'PROJ-4' };
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 201, json: issue }));
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      const result = await client.createIssue({
        projectKey: 'PROJ',
        summary: 'New issue',
        description: 'Details',
        issueType: 'Bug',
      });
      expect(result).toEqual(issue);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/issue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            fields: {
              project: { key: 'PROJ' },
              summary: 'New issue',
              issuetype: { name: 'Bug' },
              description: 'Details',
            },
          }),
        })
      );
    });

    it('creates an issue with default type and no description', async () => {
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 201, json: { key: 'PROJ-5' } }));
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      await client.createIssue({ projectKey: 'PROJ', summary: 'Minimal' });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/issue',
        expect.objectContaining({
          body: JSON.stringify({
            fields: {
              project: { key: 'PROJ' },
              summary: 'Minimal',
              issuetype: { name: 'Task' },
            },
          }),
        })
      );
    });
  });

  describe('addComment', () => {
    it('adds a comment to an issue', async () => {
      const comment = { id: '100' };
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 201, json: comment }));
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      const result = await client.addComment({ issueKey: 'PROJ-6', body: 'hello' });
      expect(result).toEqual(comment);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/issue/PROJ-6/comment',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ body: 'hello' }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('throws JiraApiError for non-OK responses', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ ok: false, status: 404, text: JSON.stringify({ errorMessages: ['Issue not found'] }) })
      );
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      await expect(client.getIssue({ issueKey: 'MISSING' })).rejects.toBeInstanceOf(JiraApiError);
      await expect(client.getIssue({ issueKey: 'MISSING' })).rejects.toThrow('Jira API error 404');
    });

    it('propagates network errors', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const client = createJiraClient({ ...options, fetchFn: fetchMock as any });
      await expect(client.listIssues({ projectKey: 'PROJ' })).rejects.toThrow('fetch failed');
    });
  });
});
