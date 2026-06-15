export interface PlatformMessage {
  text?: string;
  blocks?: unknown[];
  adaptiveCard?: unknown;
}

export interface FormattedResponse {
  slack?: { text: string; blocks?: unknown[] };
  teams?: { text: string; adaptiveCard?: unknown };
  plainText: string;
}

export function formatForPlatform(
  message: PlatformMessage,
  platforms: ('slack' | 'teams')[] = ['slack', 'teams']
): FormattedResponse {
  const plainText = message.text ?? '';
  const result: FormattedResponse = { plainText };

  if (platforms.includes('slack')) {
    result.slack = { text: plainText, blocks: message.blocks };
  }
  if (platforms.includes('teams')) {
    result.teams = { text: plainText, adaptiveCard: message.adaptiveCard };
  }

  return result;
}
