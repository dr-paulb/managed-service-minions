import type { ChildProcess, SpawnOptions } from 'node:child_process';

export interface GooseRunner {
  run(userText: string): Promise<string>;
}

export type SpawnFn = (
  command: string,
  args: string[],
  options: SpawnOptions
) => ChildProcess;

function collectOutput(child: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];

    child.stdout?.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      errorChunks.push(chunk);
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      const stdout = Buffer.concat(chunks).toString('utf8').trim();
      if (code !== 0) {
        const stderr = Buffer.concat(errorChunks).toString('utf8').trim();
        const message = stderr || stdout || `Goose exited with code ${code}`;
        reject(new Error(message));
      } else {
        resolve(stdout);
      }
    });
  });
}

export function createGooseRunner(
  spawn: SpawnFn,
  executable: string,
  recipePath: string,
  pluginPath: string
): GooseRunner {
  return {
    async run(userText: string): Promise<string> {
      const args = [
        'run',
        '--recipe',
        recipePath,
        '--text',
        userText,
        '--with-extension',
        pluginPath,
      ];
      const child = spawn(executable, args, {
        cwd: pluginPath,
        env: process.env,
      });
      return collectOutput(child);
    },
  };
}
