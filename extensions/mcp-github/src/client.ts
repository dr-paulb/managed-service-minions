import { GitHubApiError } from './errors.js';
import type {
  CreatePullRequestInput,
  ListPullRequestsInput,
  MergePullRequestInput,
  MergeResult,
  PullNumberInput,
  PullRequest,
  PullRequestSummary,
} from './types.js';

export interface GitHubClient {
  listPullRequests(input: ListPullRequestsInput): Promise<PullRequestSummary[]>;
  getPullRequest(input: PullNumberInput): Promise<PullRequest>;
  getPullRequestDiff(input: PullNumberInput): Promise<string>;
  createPullRequest(input: CreatePullRequestInput): Promise<PullRequest>;
  mergePullRequest(input: MergePullRequestInput): Promise<MergeResult>;
}

export interface GitHubClientOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export function createGitHubClient(
  token: string,
  options: GitHubClientOptions = {}
): GitHubClient {
  const baseUrl = (options.baseUrl ?? 'https://api.github.com').replace(/\/+$/u, '');
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'mcp-github',
  };

  async function request(
    path: string,
    init: RequestInit & { params?: Record<string, string | number> }
  ): Promise<Response> {
    const query = init.params
      ? `?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(init.params).map(([key, value]) => [key, String(value)])
          )
        ).toString()}`
      : '';
    const url = `${baseUrl}${path}${query}`;

    const response = await fetchFn(url, {
      ...init,
      headers: {
        ...defaultHeaders,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new GitHubApiError(
        `GitHub API error ${response.status}: ${text}`,
        response.status,
        text
      );
    }

    return response;
  }

  return {
    async listPullRequests(input): Promise<PullRequestSummary[]> {
      const params: Record<string, string> = { state: input.state };
      if (input.limit !== undefined) {
        params.per_page = String(input.limit);
      }
      const response = await request(`/repos/${input.owner}/${input.repo}/pulls`, { params });
      return (await response.json()) as PullRequestSummary[];
    },

    async getPullRequest(input): Promise<PullRequest> {
      const response = await request(
        `/repos/${input.owner}/${input.repo}/pulls/${input.pull_number}`,
        {}
      );
      return (await response.json()) as PullRequest;
    },

    async getPullRequestDiff(input): Promise<string> {
      const response = await request(
        `/repos/${input.owner}/${input.repo}/pulls/${input.pull_number}`,
        {
          headers: { Accept: 'application/vnd.github.diff' },
        }
      );
      return response.text();
    },

    async createPullRequest(input): Promise<PullRequest> {
      const body: Record<string, unknown> = {
        title: input.title,
        head: input.head,
        base: input.base,
      };
      if (input.body !== undefined) {
        body.body = input.body;
      }
      const response = await request(`/repos/${input.owner}/${input.repo}/pulls`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return (await response.json()) as PullRequest;
    },

    async mergePullRequest(input): Promise<MergeResult> {
      const body: Record<string, unknown> = {};
      if (input.commit_title !== undefined) {
        body.commit_title = input.commit_title;
      }
      if (input.commit_message !== undefined) {
        body.commit_message = input.commit_message;
      }
      if (input.merge_method !== undefined) {
        body.merge_method = input.merge_method;
      }
      const response = await request(
        `/repos/${input.owner}/${input.repo}/pulls/${input.pull_number}/merge`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        }
      );
      return (await response.json()) as MergeResult;
    },
  };
}
