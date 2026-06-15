export class AcpClient {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  async connect(): Promise<void> {
    const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
    console.log(`Teams bot connecting to ${wsUrl}`);
    // TODO: open WebSocket, handle session/new, session/prompt, notifications, Adaptive Cards
  }

  async sendPrompt(_sessionId: string | null, _text: string): Promise<void> {
    // TODO: send session/prompt JSON-RPC
  }
}
