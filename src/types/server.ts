import { Client } from "./client"
import { GameState, Tile, Turn, Turns, Vector2 } from "./game"
import { v4 as uuid } from 'uuid';
import { WSServerMessageBody, WSServerMessageSessionBody, WSServerMessageType } from "./message";
import { WebSocket } from "ws";
import { failMessage, saveSession, sendMessage } from "@config/ws";
import { getTileNumberFromVector2 } from "src/helpers";

export class Session {
  id: string
  player1: Client | null
  player2: Client | null
  player1Board: Tile[]
  player2Board: Tile[]
  player1Turns: Turns
  player2Turns: Turns
  gameState: GameState

  constructor(player1?: Client, player2?: Client, id?: string) {
    this.id = id || uuid()
    this.player1 = player1 || null
    this.player2 = player2 || null
    this.player1Board = []
    this.player2Board = []
    this.player1Turns = {}
    this.player2Turns = {}
    this.gameState = 'start'
  }

  getPlayerNumber(userId: string): number | false {
    if (this.player1?.id === userId) return 1
    if (this.player2?.id === userId) return 2
    return false
  }

  getOpponentNumber(userId: string): number {
    if (this.player1?.id === userId) return 2
    return 1
  }

  getPlayerByUserId(userId: string): Client | null {
    if (this.player1?.id === userId) return this.player1
    if (this.player2?.id === userId) return this.player2
    return null
  }

  getBoardByUserId(userId: string): Tile[] | null {
    if (this.player1?.id === userId) return this.player1Board
    if (this.player2?.id === userId) return this.player2Board
    return null
  }

  getOpponentByUserId(userId: string): Client | null {
    if (this.player1?.id === userId) return this.player2
    if (this.player2?.id === userId) return this.player1
    return null
  }

  getOpponentBoardByUserId(userId: string): Tile[] | null {
    if (this.player1?.id === userId) return this.player2Board
    if (this.player2?.id === userId) return this.player1Board
    return null
  }

  setPlayerBoard(playerNumber: number, board: Tile[]) {
    if (playerNumber === 1) this.player1Board = board
    if (playerNumber === 2) this.player2Board = board
  }

  setPlayerBoardByUserId(userId: string, board: Tile[]) {
    const playerNumber = this.getPlayerNumber(userId)
    if (playerNumber) this.setPlayerBoard(playerNumber, board)
  }

  resetPlayerWS(userId: string, ws: WebSocket) {
    if (this.player1?.id == userId) {
      this.player1.ws = ws
      sendMessage(ws, {
        type: 'userReconnected',
        body: 'Welcome back!'
      })
      console.log("🚀 ~ file: server.ts ~ line 96 ~ Session ~ resetPlayerWS ~ this.player2?.ws", typeof this.player2?.ws)
      if (this.player2?.ws) {
        sendMessage(this.player2.ws, {
          type: 'opponentReconnected',
          body: 'Your opponent has reconnected!'
        })
      }
    }
    if (this.player2?.id == userId) {
      this.player2.ws = ws
      sendMessage(ws, {
        type: 'userReconnected',
        body: 'Welcome back!'
      })
      console.log("🚀 ~ file: server.ts ~ line 96 ~ Session ~ resetPlayerWS ~ this.player1?.ws", typeof this.player1?.ws)
      if (this.player1?.ws) {
        sendMessage(this.player1.ws, {
          type: 'opponentReconnected',
          body: 'Your opponent has reconnected!'
        })
      }
    }
  }

  setNewTurn(userId: string, turn: Turn) {
    const playerNumber = this.getPlayerNumber(userId)
    if (playerNumber) {
      if (playerNumber === 1) this.player1Turns[`${turn.position.x},${turn.position.y}`] = turn
      if (playerNumber === 2) this.player2Turns[`${turn.position.x},${turn.position.y}`] = turn
    }
  }

  computeShot(userId: string, position: Vector2, ws: WebSocket): void {
    const player = this.getPlayerByUserId(userId)
    if (!player) return failMessage(ws, 'Couldn\'t find user in this session')

    const playerNumber = this.getPlayerNumber(userId)
    if (!playerNumber) return failMessage(ws, 'Couldn\'t find user in this session')

    const opponent = this.getOpponentByUserId(userId)
    if (!opponent?.ws) return failMessage(ws, 'Please wait for your opponent to reconnect! 😔')

    const opponentBoard = this.getOpponentBoardByUserId(userId)
    if (!opponentBoard) return failMessage(ws, 'Couldn\'t find opponent board')

    const tileIndex = getTileNumberFromVector2(position)
    console.log("🚀 ~ file: server.ts ~ line 96 ~ Session ~ computeShot ~ tileIndex", tileIndex)

    const targetedTile = opponentBoard[tileIndex]

    if (!targetedTile) return failMessage(ws, 'You should not try to shoot out of the board, matey! Argh! 🏴‍☠️')

    const result = targetedTile.type === 'water' ? 'miss' : 'hit' 
    console.log("🚀 ~ file: server.ts ~ line 101 ~ Session ~ computeShot ~ result", result)

    const shipInfo = targetedTile.type === 'ship' && targetedTile.ship != null ? targetedTile.ship : undefined

    this.setNewTurn(userId, {
      id: uuid(),
      player: userId,
      position,
      result,
      ship: shipInfo
    })

    if (result === 'miss') {
      if (this.getPlayerNumber(userId) === 1) {
        this.gameState = 'player2'
      } else {
        this.gameState = 'player1'
      }
    } else {
      let hits = 0
      Object.values(this.player1Turns).map((turn) => {
        if (turn.result === 'hit') {
          hits++
        }
      })
      if (hits === 12) {
        this.gameState = 'player1Wins'
      }
      hits = 0
      Object.values(this.player2Turns).map((turn) => {
        if (turn.result === 'hit') {
          hits++
        }
      })
      if (hits === 12) {
        this.gameState = 'player2Wins'
      }
    }

    saveSession(this)
    return this.notifyBothPlayers('gameStateUpdate', {
      hit: result === 'hit',
      lastShotBy: playerNumber,
      isGameOver: this.gameState == 'player1Wins' || this.gameState == 'player2Wins',
    })
  }

  notifyBothPlayers(type: WSServerMessageType, message?: WSServerMessageBody) {
    const messageExtraBody = message || {}
    this.player1?.ws.send(JSON.stringify({
      type,
      body: {
        session: {
          id: this.id,
          gameState: this.gameState,
          yourBoard: this.player1Board,
          yourPlayerNumber: 1,
          player1Turns: this.player1Turns,
          player2Turns: this.player2Turns,
        },
        ...messageExtraBody
      }
    }))
    console.log("🚀 ~ file: server.ts ~ line 136 ~ Session ~ notifyBothPlayers ~ this.player1?.ws", typeof this.player1?.ws)
    this.player2?.ws.send(JSON.stringify({
      type,
      body: {
        session: {
          id: this.id,
          gameState: this.gameState,
          yourBoard: this.player2Board,
          yourPlayerNumber: 2,
          player1Turns: this.player1Turns,
          player2Turns: this.player2Turns,
        },
        ...messageExtraBody
      }
    }))
    console.log("🚀 ~ file: server.ts ~ line 136 ~ Session ~ notifyBothPlayers ~ this.player2?.ws", typeof this.player2?.ws)
  }


  static fromJSON(session: Session) {
    const newSession = new Session()
    newSession.id = session.id
    newSession.player1 = session.player1
    newSession.player2 = session.player2
    newSession.player1Board = session.player1Board
    newSession.player2Board = session.player2Board
    newSession.player1Turns = session.player1Turns
    newSession.player2Turns = session.player2Turns
    newSession.gameState = session.gameState
    return newSession
  }
}
