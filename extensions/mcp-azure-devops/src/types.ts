import { z } from 'zod';

export const listPullRequestsSchema = z.object({
  repositoryId: z.string(),
  status: z.enum(['active', 'abandoned', 'completed', 'all']).optional(),
  top: z.number().optional(),
});

export const getPullRequestSchema = z.object({
  repositoryId: z.string(),
  pullRequestId: z.number(),
});

export const getPullRequestDiffSchema = z.object({
  repositoryId: z.string(),
  pullRequestId: z.number(),
});

export const createPullRequestSchema = z.object({
  repositoryId: z.string(),
  title: z.string(),
  sourceRefName: z.string(),
  targetRefName: z.string(),
  description: z.string().optional(),
});

export const mergePullRequestSchema = z.object({
  repositoryId: z.string(),
  pullRequestId: z.number(),
  comment: z.string().optional(),
});

export const listWorkItemsSchema = z
  .object({
    wiql: z.string().optional(),
    ids: z.array(z.number()).optional(),
  })
  .refine((data) => data.wiql !== undefined || (data.ids !== undefined && data.ids.length > 0), {
    message: 'Either wiql or ids must be provided',
  });

export const getWorkItemSchema = z.object({
  id: z.number().int().positive(),
});

export const updateWorkItemSchema = z.object({
  id: z.number(),
  fields: z.record(z.unknown()),
});

export type ListPullRequestsInput = z.infer<typeof listPullRequestsSchema>;
export type GetPullRequestInput = z.infer<typeof getPullRequestSchema>;
export type GetPullRequestDiffInput = z.infer<typeof getPullRequestDiffSchema>;
export type CreatePullRequestInput = z.infer<typeof createPullRequestSchema>;
export type MergePullRequestInput = z.infer<typeof mergePullRequestSchema>;
export type ListWorkItemsInput = z.infer<typeof listWorkItemsSchema>;
export type GetWorkItemInput = z.infer<typeof getWorkItemSchema>;
export type UpdateWorkItemInput = z.infer<typeof updateWorkItemSchema>;

export interface ToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface PullRequest {
  pullRequestId: number;
  title: string;
  status: string;
  sourceRefName?: string;
  targetRefName?: string;
}

export interface WorkItem {
  id: number;
  rev?: number;
  fields?: Record<string, unknown>;
}
