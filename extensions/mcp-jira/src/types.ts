import { z } from 'zod';

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});
export type ApiResponse = z.infer<typeof apiResponseSchema>;

export const listIssuesInputSchema = z.object({
  projectKey: z.string().min(1),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListIssuesInput = z.infer<typeof listIssuesInputSchema>;

export const issueKeyInputSchema = z.object({
  issueKey: z.string().min(1),
});
export type IssueKeyInput = z.infer<typeof issueKeyInputSchema>;

export const updateIssueInputSchema = issueKeyInputSchema.extend({
  fields: z.record(z.unknown()),
});
export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>;

export const createIssueInputSchema = z.object({
  projectKey: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().optional(),
  issueType: z.string().default('Task'),
});
export type CreateIssueInput = z.infer<typeof createIssueInputSchema>;

export const addCommentInputSchema = issueKeyInputSchema.extend({
  body: z.string().min(1),
});
export type AddCommentInput = z.infer<typeof addCommentInputSchema>;

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: Record<string, unknown>;
}

export interface JiraComment {
  id: string;
  self: string;
  body: string;
}
