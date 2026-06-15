export class ServiceNowApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `ServiceNow API error (${status})`);
    this.status = status;
    this.body = body;
    this.name = 'ServiceNowApiError';
  }
}
