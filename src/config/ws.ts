import WebSocket from "ws"
import { v4 as uuid } from 'uuid';
import url from "url"
import fs from 'fs/promises'
import { join } from 'path';

import { handleMessage } from "../controller";
import { WSServerMessage, WSClientMessage, WSServerConnectionMessage, WSServerFailedMessage, Client, Session } from "../types";

let clients: Client[] = []
let sessions: Session[] = []

function onError(ws: WebSocket.WebSocket, err: any) {
  console.error(`onError: ${err.message}`)
}

function onMessage(ws: WebSocket.WebSocket, json: string) {
  const data = JSON.parse(json) as WSClientMessage
  console.log("🚀 ~ file: ws.ts ~ line 25 ~ onMessage ~ data", data)
  handleMessage(ws, data)
}

export function sendMessage(ws: WebSocket.WebSocket, data: WSServerMessage) {
  ws.send(
    JSON.stringify({
      ...data
    })
  )
}

export function failMessage(ws: WebSocket.WebSocket, error: string) {
  ws.send(
    JSON.stringify({
      type: 'error',
      body: error,
    } as WSServerFailedMessage)
  )
}

export function findClientById(clientId: string): Client | false {
  return clients.find(client => client.id === clientId) || false
}

export function setUsernameById(clientId: string, username: string): Client | false {
  const client = findClientById(clientId)
  if (client) {
    client.username = username
    return client
  }
  return false
}

export async function findSessionDataById(sessionId: string): Promise<false | Session> {
  try {
    const data = await fs.readFile(join(__dirname, `../data/${sessionId}.json`), { encoding: 'utf8' });
    if (!data) {
      throw new Error("Session not found!")
    }
    
    return JSON.parse(data) as Session
  } catch (err) {
    console.log(err);
    return false
  }
}

export function findSessionById(sessionId: string): Session | false {
  return sessions.find(session => session.id === sessionId) || false
}

export const saveSession = async (data: Session): Promise<boolean> => {
  try {
    await fs.writeFile(join(__dirname, `../data/${data.id}.json`), JSON.stringify({
      ...data,
      player1: {
        ...data.player1,
        ws: null
      },
      player2: {
        ...data.player2,
        ws: null
      }
    }), { flag: 'w+' });
  } catch (err) {
    console.log(err);
    return false
  }
  return true
}

export function createSession(player1ID: string, player2ID: string): string {
  const player1 = findClientById(player1ID)
  const player2 = findClientById(player2ID)
  if (!player1 || !player2) return 'Couldn\'t find one of the players'
  const session = new Session(player1, player2)
  saveSession(session)
  removeClient(player1)
  removeClient(player2)
  return ''
}

function removeClient(client: Client) {
  const index = clients.indexOf(client)
  console.log("🚀 ~ file: ws.ts ~ line 98 ~ removeClient ~ index", index)
  if (index !== -1) {
    clients.splice(index, 1)
  }
}

function onClose(client: Client, reasonCode: any, description: any) {
  console.log(`onClose: ${reasonCode} - ${description}`)
  removeClient(client)
  notifyListeners()
}

async function onConnection(ws: WebSocket.WebSocket, req: any) {
  const userId = url.parse(req.url, true).query.userId as string | undefined
  const sessionId = url.parse(req.url, true).query.sessionId as string | undefined
  const username = url.parse(req.url, true).query.username as string | undefined
  console.log("🚀 ~ file: ws.ts ~ line 107 ~ onConnection ~ userId", userId)
  console.log("🚀 ~ file: ws.ts ~ line 108 ~ onConnection ~ sessionId", sessionId)
  console.log("🚀 ~ file: ws.ts ~ line 108 ~ onConnection ~ username", username)

  const newClient = {
    id: userId || uuid(),
    username: username || '',
    ws
  } as Client

  ws.on("message", (data: any) => onMessage(ws, data))
  ws.on("error", (error: any) => onError(ws, error))
  ws.on("close", (reasonCode: any, description: any) =>
    onClose(newClient, reasonCode, description)
  )
  if (clients.map(client => client.id).includes(newClient.id)) {
    return newClient.ws.terminate()
  }

  if (sessionId){
    let foundLiveSession: Session | boolean = false
    sessions.map(session => {
      if (session.id == sessionId) {
        foundLiveSession = Session.fromJSON(session)
        foundLiveSession.resetPlayerWS(newClient.id, ws)
      }
    })
    if (!foundLiveSession) {
      const session = await findSessionDataById(sessionId)
      console.log("🚀 ~ file: ws.ts ~ line 143 ~ onConnection ~ session", session)
      // TODO - Be careful when player2 is restoring the session
      if (session){
        const restoredSession = Session.fromJSON(session)
        restoredSession.resetPlayerWS(newClient.id, ws)
        foundLiveSession = restoredSession
        sessions.push(restoredSession)
        saveSession(restoredSession)
      }
    }
    foundLiveSession && sendMessage(ws, {
      type: 'sessionRestored',
      body: {
        session: {
          id: foundLiveSession.id,
          gameState: foundLiveSession.gameState,
          yourBoard: foundLiveSession.getBoardByUserId(newClient.id),
          // FIXME: This should never return false
          yourPlayerNumber: foundLiveSession.getPlayerNumber(newClient.id) || 1,
          player1Turns: foundLiveSession.player1Turns,
          player2Turns: foundLiveSession.player2Turns,
        }
      }
    })
  } else {
    clients.push(newClient)
  }

  notifyListeners()
  console.log(`Connected ${newClient.id}`)
  console.log("Currently", clients.length, "in lobby")
  console.log("Currently", sessions.length, " open sessions")
}

const createServer = (server: any) => {
  const wss = new WebSocket.Server({
    server,
  })

  wss.on("connection", onConnection)

  console.log(`App Web Socket Server is running!`)
  return wss
}

export const notifyListeners = () => {
  for (const client of clients) {
    sendMessage(client.ws, {
      clients: clients.map((client) => ({id: client.id, username: client.username})),
      you: client.id,
      username: client.username,
      type: "connection",
      body: `Novo jogador, ${client.id}`,
    } as WSServerConnectionMessage)
  }

  console.log(`🚀 ~ notified ${clients.length} clients`)
}

export default createServer
