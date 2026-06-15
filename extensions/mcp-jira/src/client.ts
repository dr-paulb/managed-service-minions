import { JiraApiError } from './errors.js';
import type {
  AddCommentInput,
  CreateIssueInput,
  IssueKeyInput,
  JiraComment,
  JiraIssue,
  ListIssuesInput,
  UpdateIssueInput,
} from './types.js';

export interface JiraClient {
  listIssues(input: ListIssuesInput): Promise<JiraIssue[]>;
  getIssue(input: IssueKeyInput): Promise<JiraIssue>;
  updateIssue(input: UpdateIssueInput): Promise<void>;
  createIssue(input: CreateIssueInput): Promise<JiraIssue>;
  addComment(input: AddCommentInput): Promise<JiraComment>;
}

export interface JiraClientOptions {
  host: string;
  email: string;
  apiToken: string;
  fetchFn?: typeof fetch;
}

export function createJiraClient(options: JiraClientOptions): JiraClient {
  const host = options.host.replace(/\/+$/u, '');
  const baseUrl = `https://${host}/rest/api/2`;
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const auth = Buffer.from(`${options.email}:${options.apiToken}`).toString('base64');

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  };

  async function request(
    path: string,
    init: RequestInit & { params?: Record<string, string | number> } = {}
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
      throw new JiraApiError(
        `Jira API error ${response.status}: ${text}`,
        response.status,
        text
      );
    }

    return response;
  }

  return {
    async listIssues(input): Promise<JiraIssue[]> {
      const params: Record<string, string> = {
        jql: input.status
          ? `project=${input.projectKey} AND status=${input.status}`
          : `project=${input.projectKey}`,
      };
      if (input.limit !== undefined) {
        params.maxResults = String(input.limit);
      }
      const response = await request('/search', { params });
      const body = (await response.json()) as { issues: JiraIssue[] };
      return body.issues;
    },

    async getIssue(input): Promise<JiraIssue> {
      const response = await request(`/issue/${input.issueKey}`);
      return (await response.json()) as JiraIssue;
    },

    async updateIssue(input): Promise<void> {
      await request(`/issue/${input.issueKey}`, {
        method: 'PUT',
        body: JSON.stringify({ fields: input.fields }),
      });
    },

    async createIssue(input): Promise<JiraIssue> {
      const issueType = input.issueType ?? 'Task';
      const body: Record<string, unknown> = {
        fields: {
          project: { key: input.projectKey },
          summary: input.summary,
          issuetype: { name: issueType },
        },
      };
      if (input.description !== undefined) {
        (body.fields as Record<string, unknown>).description = input.description;
      }
      const response = await request('/issue', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return (await response.json()) as JiraIssue;
    },

    async addComment(input): Promise<JiraComment> {
      const response = await request(`/issue/${input.issueKey}/comment`, {
        method: 'POST',
        body: JSON.stringify({ body: input.body }),
      });
      return (await response.json()) as JiraComment;
    },
  };
}
