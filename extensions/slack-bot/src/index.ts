import { App } from '@slack/bolt';
import { spawn } from 'node:child_process';
import { loadConfig } from './config.js';
import { createGooseRunner } from './goose-runner.js';
import { createSlackBot } from './slack-bot.js';

function main(): void {
  const config = loadConfig();

  const app = new App({
    token: config.slackBotToken,
    signingSecret: config.slackSigningSecret,
    appToken: config.slackAppToken,
    socketMode: true,
  });

  const runner = createGooseRunner(
    spawn,
    config.gooseExecutable,
    config.gooseRecipe,
    config.goosePluginPath
  );

  const bot = createSlackBot(app, config, runner);

  bot.start().catch((err) => {
    console.error('Slack bot failed to start', err);
    process.exit(1);
  });
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
