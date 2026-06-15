import { z } from 'zod';

export const ownerRepoSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export const listPullRequestsInputSchema = ownerRepoSchema.extend({
  state: z.enum(['open', 'closed', 'all']).default('open'),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListPullRequestsInput = z.infer<typeof listPullRequestsInputSchema>;

export const pullNumberInputSchema = ownerRepoSchema.extend({
  pull_number: z.number().int().min(1),
});
export type PullNumberInput = z.infer<typeof pullNumberInputSchema>;

export const createPullRequestInputSchema = ownerRepoSchema.extend({
  title: z.string().min(1),
  head: z.string().min(1),
  base: z.string().min(1),
  body: z.string().optional(),
});
export type CreatePullRequestInput = z.infer<typeof createPullRequestInputSchema>;

export const mergePullRequestInputSchema = pullNumberInputSchema.extend({
  commit_title: z.string().optional(),
  commit_message: z.string().optional(),
  merge_method: z.enum(['merge', 'squash', 'rebase']).optional(),
});
export type MergePullRequestInput = z.infer<typeof mergePullRequestInputSchema>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PullRequestUser {
  login: string;
}

export interface PullRequestSummary {
  number: number;
  title: string;
  state: string;
  user: PullRequestUser | null;
  html_url: string;
}

export interface PullRequestRef {
  ref: string;
  sha: string;
}

export interface PullRequest extends PullRequestSummary {
  body: string | null;
  head: PullRequestRef;
  base: PullRequestRef;
  merged?: boolean;
  mergeable: boolean | null;
}

export interface MergeResult {
  sha: string;
  merged: boolean;
  message: string;
}
