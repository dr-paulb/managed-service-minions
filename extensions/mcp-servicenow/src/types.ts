import { z } from 'zod';

export const listIncidentsSchema = z.object({
  limit: z.number().int().positive().optional(),
  state: z.string().optional(),
});

export const getIncidentBySysIdSchema = z.object({
  sys_id: z.string(),
});

export const getIncidentByNumberSchema = z.object({
  number: z.string(),
});

export const getIncidentSchema = z
  .object({
    sys_id: z.string().optional(),
    number: z.string().optional(),
  })
  .refine((data) => data.sys_id !== undefined || data.number !== undefined, {
    message: 'Either sys_id or number must be provided',
  });

export const updateIncidentSchema = z.object({
  sys_id: z.string(),
  fields: z.record(z.unknown()),
});

export const createIncidentSchema = z.object({
  short_description: z.string(),
  description: z.string().optional(),
  urgency: z.string().optional(),
  impact: z.string().optional(),
});

export type ListIncidentsInput = z.infer<typeof listIncidentsSchema>;
export type GetIncidentInput = z.infer<typeof getIncidentSchema>;
export type GetIncidentBySysIdInput = z.infer<typeof getIncidentBySysIdSchema>;
export type GetIncidentByNumberInput = z.infer<typeof getIncidentByNumberSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export interface ToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface Incident {
  sys_id: string;
  number?: string;
  short_description?: string;
  description?: string;
  state?: string;
  urgency?: string;
  impact?: string;
}
