import { loadConfig, type SlackBotConfig } from '../src/config.js';

describe('loadConfig', () => {
  const baseEnv = {
    SLACK_BOT_TOKEN: 'xoxb-token',
    SLACK_SIGNING_SECRET: 'signing-secret',
    SLACK_APP_TOKEN: 'xapp-token',
  };

  it('loads config from environment variables', () => {
    const env = {
      ...baseEnv,
      GOOSE_EXECUTABLE: '/usr/local/bin/goose',
      GOOSE_PLUGIN_PATH: '/plugin',
      GOOSE_RECIPE: 'commands/review-pr.yaml',
    };

    const config = loadConfig(env);

    expect(config).toEqual<SlackBotConfig>({
      slackBotToken: 'xoxb-token',
      slackSigningSecret: 'signing-secret',
      slackAppToken: 'xapp-token',
      gooseExecutable: '/usr/local/bin/goose',
      goosePluginPath: '/plugin',
      gooseRecipe: 'commands/review-pr.yaml',
    });
  });

  it('uses defaults for optional variables', () => {
    const config = loadConfig(baseEnv);

    expect(config.gooseExecutable).toBe('goose');
    expect(config.goosePluginPath).toBe(process.cwd());
    expect(config.gooseRecipe).toBe('commands/ticket-to-pr.yaml');
  });

  it('throws when SLACK_BOT_TOKEN is missing', () => {
    const env = { ...baseEnv, SLACK_BOT_TOKEN: undefined };
    expect(() => loadConfig(env as unknown as NodeJS.ProcessEnv)).toThrow(
      'Missing required environment variables: SLACK_BOT_TOKEN'
    );
  });

  it('throws when SLACK_SIGNING_SECRET is missing', () => {
    const env = { ...baseEnv, SLACK_SIGNING_SECRET: undefined };
    expect(() => loadConfig(env as unknown as NodeJS.ProcessEnv)).toThrow(
      'Missing required environment variables: SLACK_SIGNING_SECRET'
    );
  });

  it('throws when SLACK_APP_TOKEN is missing', () => {
    const env = { ...baseEnv, SLACK_APP_TOKEN: undefined };
    expect(() => loadConfig(env as unknown as NodeJS.ProcessEnv)).toThrow(
      'Missing required environment variables: SLACK_APP_TOKEN'
    );
  });

  it('throws when multiple required variables are missing', () => {
    const env = { ...baseEnv, SLACK_BOT_TOKEN: undefined, SLACK_APP_TOKEN: undefined };
    expect(() => loadConfig(env as unknown as NodeJS.ProcessEnv)).toThrow(
      'Missing required environment variables: SLACK_BOT_TOKEN, SLACK_APP_TOKEN'
    );
  });
});
