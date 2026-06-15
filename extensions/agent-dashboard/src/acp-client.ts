export interface AcpSession {
  sessionId: string;
  createdAt: number;
}

export class AcpClient {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  async connect(): Promise<void> {
    const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
    console.log(`Dashboard connecting to ${wsUrl}`);
    // TODO: open WebSocket and proxy ACP methods
  }

  async listSessions(): Promise<AcpSession[]> {
    // TODO: send session/list JSON-RPC
    return [];
  }

  async loadSession(_sessionId: string): Promise<unknown> {
    // TODO: send session/load JSON-RPC
    return {};
  }

  async cancelSession(_sessionId: string): Promise<void> {
    // TODO: send session/cancel JSON-RPC
  }
}
