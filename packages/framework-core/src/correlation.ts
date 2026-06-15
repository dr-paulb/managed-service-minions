import { randomUUID } from 'node:crypto';

export function createRootCorrelationId(): string {
  return `corr_${randomUUID()}`;
}

export function createMinionCorrelationId(root: string, index: number): string {
  return `${root}.${index}`;
}

export function createToolCorrelationId(
  minionCorrelationId: string,
  serverAlias: string,
  callIndex: number
): string {
  return `${minionCorrelationId}.${serverAlias}-${callIndex}`;
}
