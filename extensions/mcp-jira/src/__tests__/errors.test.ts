import { JiraApiError } from '../errors.js';

describe('JiraApiError', () => {
  it('stores message, status, and response', () => {
    const error = new JiraApiError('Jira API error 404', 404, 'not found');
    expect(error.name).toBe('JiraApiError');
    expect(error.message).toBe('Jira API error 404');
    expect(error.status).toBe(404);
    expect(error.response).toBe('not found');
  });

  it('works without optional fields', () => {
    const error = new JiraApiError('network failure');
    expect(error.status).toBeUndefined();
    expect(error.response).toBeUndefined();
  });
});
