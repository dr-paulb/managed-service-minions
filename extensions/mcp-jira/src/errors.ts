export class JiraApiError extends Error {
  readonly status?: number;
  readonly response?: string;

  constructor(message: string, status?: number, response?: string) {
    super(message);
    this.name = 'JiraApiError';
    this.status = status;
    this.response = response;
  }
}
