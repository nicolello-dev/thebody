import type * as WebSocket from "ws";

export class WebsocketManager {
  private sockets: Map<string, WebSocket.WebSocket>;
  constructor() {
    this.sockets = new Map();
  }

  add(id: string, ws: WebSocket.WebSocket) {
    this.sockets.set(id, ws);
  }

  getWebsockets() {
    return this.sockets.values();
  }

  getIds() {
    return this.sockets.keys();
  }

  remove(id: string) {
    const ws = this.sockets.get(id);
    ws.close();
    this.sockets.delete(id);
  }

  sendToAll(data: Buffer) {
    this.sockets.forEach((ws) => {
      ws.send(data);
    });
  }

  sendTo(id: string, data: Buffer) {
    this.sockets.get(id)?.send(data);
  }
}

function parseWebsocketMessage(message: WebSocket.RawData) {}

export function websocketOnMessageHandler(message: WebSocket.RawData) {
  const data = parseWebsocketMessage(message);
}
