export class AzureDevOpsApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Azure DevOps API error (${status})`);
    this.status = status;
    this.body = body;
    this.name = 'AzureDevOpsApiError';
  }
}
