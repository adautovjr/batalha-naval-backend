import WebSocket from "ws"

export interface Client {
  id: string
  username: string
  ws: WebSocket.WebSocket
}