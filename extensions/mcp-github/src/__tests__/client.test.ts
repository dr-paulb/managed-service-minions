/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';
import { createGitHubClient } from '../client.js';
import { GitHubApiError } from '../errors.js';

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

describe('createGitHubClient', () => {
  let fetchMock: ReturnType<typeof createFetchMock>;

  beforeEach(() => {
    fetchMock = createFetchMock();
  });

  it('uses default options and global fetch when none are supplied', async () => {
    fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 200, json: [] }));
    const globalSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(fetchMock as unknown as typeof fetch);

    const client = createGitHubClient('token');
    await client.listPullRequests({ owner: 'org', repo: 'repo', state: 'open' });

    expect(globalSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/org/repo/pulls?state=open',
      expect.anything()
    );

    globalSpy.mockRestore();
  });

  it('defaults to the public GitHub API', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ ok: true, status: 200, json: [] })
    );
    const client = createGitHubClient('token', { fetchFn: fetchMock as any });
    await client.listPullRequests({ owner: 'org', repo: 'repo', state: 'open' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/org/repo/pulls?state=open',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          Accept: 'application/vnd.github+json',
        }),
      })
    );
  });

  it('uses a custom base URL and trims trailing slashes', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ ok: true, status: 200, json: [] })
    );
    const client = createGitHubClient('token', {
      baseUrl: 'https://gh.example.com/api/v3/',
      fetchFn: fetchMock as any,
    });
    await client.listPullRequests({ owner: 'org', repo: 'repo', state: 'open' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gh.example.com/api/v3/repos/org/repo/pulls?state=open',
      expect.anything()
    );
  });

  describe('listPullRequests', () => {
    it('lists pull requests with default state', async () => {
      const prs = [{ number: 1, title: 'PR 1' }];
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 200, json: prs }));
      const client = createGitHubClient('token', { fetchFn: fetchMock as any });
      const result = await client.listPullRequests({
        owner: 'org',
        repo: 'repo',
        state: 'open',
      });
      expect(result).toEqual(prs);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/org/repo/pulls?state=open',
        expect.anything()
      );
    });

    it('adds per_page when a limit is provided', async () => {
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 200, json: [] }));
      const client = createGitHubClient('token', { fetchFn: fetchMock as any });
      await client.listPullRequests({
        owner: 'org',
        repo: 'repo',
        state: 'all',
        limit: 5,
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/org/repo/pulls?state=all&per_page=5',
        expect.anything()
      );
    });
  });

  describe('getPullRequest', () => {
    it('fetches a single pull request', async () => {
      const pr = { number: 42, title: 'Fix bug' };
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 200, json: pr }));
      const client = createGitHubClient('token', { fetchFn: fetchMock as any });
      const result = await client.getPullRequest({
        owner: 'org',
        repo: 'repo',
        pull_number: 42,
      });
      expect(result).toEqual(pr);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/org/repo/pulls/42',
        expect.anything()
      );
    });
  });

  describe('getPullRequestDiff', () => {
    it('fetches diff text with the correct Accept header', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ ok: true, status: 200, text: 'diff --git a/file b/file' })
      );
      const client = createGitHubClient('token', { fetchFn: fetchMock as any });
      const result = await client.getPullRequestDiff({
        owner: 'org',
        repo: 'repo',
        pull_number: 7,
      });
      expect(result).toBe('diff --git a/file b/file');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/org/repo/pulls/7',
        expect.objectContaining({
          headers: expect.objectContaining({ Accept: 'application/vnd.github.diff' }),
        })
      );
    });
  });

  describe('createPullRequest', () => {
    it('creates a PR with a body', async () => {
      const created = { number: 3 };
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 201, json: created }));
      const client = createGitHubClient('token', { fetchFn: fetchMock as any });
      const result = await client.createPullRequest({
        owner: 'org',
        repo: 'repo',
        title: 'New PR',
        head: 'feature',
        base: 'main',
        body: 'Description',
      });
      expect(result).toEqual(created);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/org/repo/pulls',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'New PR',
            head: 'feature',
            base: 'main',
            body: 'Description',
          }),
        })
      );
    });

    it('omits body when not provided', async () => {
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 201, json: {} }));
      const client = createGitHubClient('token', { fetchFn: fetchMock as any });
      await client.createPullRequest({
        owner: 'org',
        repo: 'repo',
        title: 'New PR',
        head: 'feature',
        base: 'main',
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/org/repo/pulls',
        expect.objectContaining({
          body: JSON.stringify({
            title: 'New PR',
            head: 'feature',
            base: 'main',
          }),
        })
      );
    });
  });

  describe('mergePullRequest', () => {
    it('merges with all optional fields', async () => {
      const merged = { sha: 'abc', merged: true, message: 'Merged' };
      fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 200, json: merged }));
      const client = createGitHubClient('token', { fetchFn: fetchMock as any });
      const result = await client.mergePullRequest({
        owner: 'org',
        repo: 'repo',
        pull_number: 5,
        commit_title: 'Merge title',
        commit_message: 'Merge message',
        merge_method: 'squash',
      });
      expect(result).toEqual(merged);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/org/repo/pulls/5/merge',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            commit_title: 'Merge title',
            commit_message: 'Merge message',
            merge_method: 'squash',
          }),
        })
      );
    });

    it('merges without optional fields', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ ok: true, status: 200, json: { sha: 'def', merged: true, message: '' } })
      );
      const client = createGitHubClient('token', { fetchFn: fetchMock as any });
      await client.mergePullRequest({
        owner: 'org',
        repo: 'repo',
        pull_number: 6,
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/org/repo/pulls/6/merge',
        expect.objectContaining({
          method: 'PUT',
          body: '{}',
        })
      );
    });
  });

  describe('error handling', () => {
    it('throws GitHubApiError for non-OK responses', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ ok: false, status: 404, text: JSON.stringify({ message: 'Not Found' }) })
      );
      const client = createGitHubClient('token', { fetchFn: fetchMock as any });
      await expect(
        client.getPullRequest({ owner: 'org', repo: 'repo', pull_number: 1 })
      ).rejects.toBeInstanceOf(GitHubApiError);
      await expect(
        client.getPullRequest({ owner: 'org', repo: 'repo', pull_number: 1 })
      ).rejects.toThrow('GitHub API error 404');
    });

    it('propagates network errors', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const client = createGitHubClient('token', { fetchFn: fetchMock as any });
      await expect(
        client.listPullRequests({ owner: 'org', repo: 'repo', state: 'open' })
      ).rejects.toThrow('fetch failed');
    });
  });
});
