export class GitHubApiError extends Error {
  readonly status?: number;
  readonly response?: string;

  constructor(message: string, status?: number, response?: string) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.response = response;
  }
}
