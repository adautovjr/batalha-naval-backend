import type { GameState, Tile, Turns, Vector2 } from "./game"

export type WSClientMessageType =
  | 'message'
  | 'requestSession'
  | 'acceptRequest'
  | 'setPlayerBoard'
  | 'takeShot'
  | 'setUsername'

export type WSServerMessageType =
  | 'error'
  | 'connection'
  | 'sessionCreated'
  | 'sessionRequestReceived'
  | 'sessionRestored'
  | 'gameStateUpdate'
  | 'boardSet'
  | 'userReconnected'
  | 'opponentReconnected'
  | 'usernameSet'

export interface ClientDTO {
  id: string
  username: string
}

export interface WSServerMessageSessionRequestReceivedBody {
  opponentId: string
  opponentName: string
}

export interface WSServerMessageSessionBody {
  sessionId: string
}

export interface WSClientSessionRequestBody {
  userId: string
  opponentId: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WSClientAcceptRequestBody extends WSClientSessionRequestBody { }
export interface WSClientSetPlayerBoardBody extends WSServerMessageSessionBody {
  userId: string
  tiles: Tile[]
}

export interface SessionState {
  id: string
  gameState: GameState
  yourBoard: Tile[] | null
  yourPlayerNumber: number
  player1Turns: Turns
  player2Turns: Turns
}

export type WSServerMessageBoardSetBody = WSServerBoardSetBody & WSServerMessageSessionInfoBody

export interface WSServerBoardSetBody {
  playerNumberWhoseBoardIsSet: number
  shouldWaitForOpponent: boolean
}

export type WSServerMessageShotResultBody = WSServerShotResultBody & WSServerMessageSessionInfoBody

export interface WSServerShotResultBody {
  hit: boolean
  lastShotBy: number
  isGameOver: boolean
}

export interface WSServerMessageSessionInfoBody {
  session: SessionState
}

export interface WSClientTakeShotBody {
  userId: string
  sessionId: string
  position: Vector2
}

export interface WSClientSetUsernameBody {
  userId: string
  username: string
}

export interface WSServerUsernameSetBody {
  username: string
}

export type WSClientMessageBody =
  | WSClientSessionRequestBody
  | WSClientAcceptRequestBody
  | WSClientSetPlayerBoardBody
  | WSClientTakeShotBody
  | WSClientSetUsernameBody

export type WSServerMessageBody =
  | string
  | WSServerMessageSessionRequestReceivedBody
  | WSServerMessageSessionBody
  | WSServerMessageSessionInfoBody
  | WSServerMessageBoardSetBody
  | WSServerBoardSetBody
  | WSServerShotResultBody
  | WSServerUsernameSetBody

export type WSServerMessage =
  | WSServerDefaultMessage
  | WSServerFailedMessage

export interface WSClientMessage {
  type: WSClientMessageType
  body: WSClientMessageBody
}

export interface WSServerDefaultMessage {
  type: WSServerMessageType
  body: WSServerMessageBody
}

export interface WSServerConnectionMessage extends WSServerDefaultMessage {
  clients: ClientDTO[]
  you: string
  username: string
}

export interface WSServerFailedMessage {
  type: 'error'
  body: string
}