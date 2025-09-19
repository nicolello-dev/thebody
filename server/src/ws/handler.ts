import * as WebSocket from "ws";

function parseWebsocketMessage(message: WebSocket.RawData) {}

export function websocketOnMessageHandler(message: WebSocket.RawData) {
  const data = parseWebsocketMessage(message);
}
