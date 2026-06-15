import http from 'node:http';
import type { SessionStore } from 'framework-core';

export interface DashboardServer {
  port: number;
  close: () => Promise<void>;
}

interface Route {
  method: string;
  pattern: RegExp;
  handler: (req: http.IncomingMessage, res: http.ServerResponse, matches: RegExpExecArray) => Promise<void>;
}

function jsonResponse(res: http.ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(payload);
}

function notFound(res: http.ServerResponse): void {
  jsonResponse(res, 404, { error: 'Not found' });
}

export async function startDashboardServer(
  store: SessionStore,
  port: number,
  createServer: typeof http.createServer = http.createServer
): Promise<DashboardServer> {
  const routes: Route[] = [
    {
      method: 'GET',
      pattern: /^\/health$/,
      handler: async (_req, res) => {
        jsonResponse(res, 200, { status: 'ok' });
      },
    },
    {
      method: 'GET',
      pattern: /^\/sessions$/,
      handler: async (_req, res) => {
        jsonResponse(res, 200, store.listSessions());
      },
    },
    {
      method: 'GET',
      pattern: /^\/sessions\/([^/]+)$/,
      handler: async (_req, res, matches) => {
        const session = store.getSession(matches[1]);
        if (!session) {
          return notFound(res);
        }
        jsonResponse(res, 200, session);
      },
    },
    {
      method: 'GET',
      pattern: /^\/sessions\/([^/]+)\/minion-runs$/,
      handler: async (_req, res, matches) => {
        jsonResponse(res, 200, store.listMinionRunsBySession(matches[1]));
      },
    },
    {
      method: 'GET',
      pattern: /^\/correlation-tree\/([^/]+)$/,
      handler: async (_req, res, matches) => {
        jsonResponse(res, 200, store.listMinionRunsByCorrelationRoot(matches[1]));
      },
    },
    {
      method: 'GET',
      pattern: /^\/pending-approvals$/,
      handler: async (_req, res) => {
        jsonResponse(res, 200, store.listPendingApprovals());
      },
    },
  ];

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const pathname = url.pathname;

      for (const route of routes) {
        if (route.method !== req.method) {
          continue;
        }
        const matches = route.pattern.exec(pathname);
        if (matches) {
          await route.handler(req, res, matches);
          return;
        }
      }

      notFound(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      jsonResponse(res, 500, { error: message });
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      const address = server.address();
      const listeningPort = typeof address === 'object' && address !== null ? address.port : port;
      console.log(`Dashboard backend listening on port ${listeningPort}`);
      resolve({
        port: listeningPort,
        close: () =>
          new Promise<void>((resolveClose, rejectClose) => {
            server.close((err) => {
              if (err) {
                rejectClose(err);
              } else {
                resolveClose();
              }
            });
          }),
      });
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}
