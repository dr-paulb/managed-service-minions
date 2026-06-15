export interface SlackBotConfig {
  slackBotToken: string;
  slackSigningSecret: string;
  slackAppToken: string;
  gooseExecutable: string;
  goosePluginPath: string;
  gooseRecipe: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SlackBotConfig {
  const slackBotToken = env.SLACK_BOT_TOKEN ?? '';
  const slackSigningSecret = env.SLACK_SIGNING_SECRET ?? '';
  const slackAppToken = env.SLACK_APP_TOKEN ?? '';
  const gooseExecutable = env.GOOSE_EXECUTABLE ?? 'goose';
  const goosePluginPath = env.GOOSE_PLUGIN_PATH ?? process.cwd();
  const gooseRecipe = env.GOOSE_RECIPE ?? 'commands/ticket-to-pr.yaml';

  const missing: string[] = [];
  if (!slackBotToken) missing.push('SLACK_BOT_TOKEN');
  if (!slackSigningSecret) missing.push('SLACK_SIGNING_SECRET');
  if (!slackAppToken) missing.push('SLACK_APP_TOKEN');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    slackBotToken,
    slackSigningSecret,
    slackAppToken,
    gooseExecutable,
    goosePluginPath,
    gooseRecipe,
  };
}
