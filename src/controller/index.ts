import { failMessage, findClientById, findSessionById, sendMessage, saveSession, setUsernameById, notifyListeners } from "@config/ws";
import { 
  Session, 
  WSClientAcceptRequestBody, 
  WSClientMessage, 
  WSClientSessionRequestBody, 
  WSClientSetPlayerBoardBody, 
  WSClientSetUsernameBody, 
  WSClientTakeShotBody, 
  WSServerMessage
} from "src/types";
import WebSocket from "ws";

export const handleMessage = async (ws: WebSocket.WebSocket, data: WSClientMessage) => {
  switch (data.type) {
    case "requestSession": {
      const reqData = data.body as WSClientSessionRequestBody
      const client = findClientById(reqData.opponentId)
      if (client) {
        return sendMessage(client.ws, {
          type: "sessionRequestReceived",
          body: {
            opponentId: reqData.userId,
            opponentName: client.username
          },
        })
      }
      return failMessage(ws, 'Couldn\'t contact opponent')
    }
    case "acceptRequest": {
      const reqData = data.body as WSClientAcceptRequestBody
      const player1 = findClientById(reqData.userId)
      const player2 = findClientById(reqData.opponentId)
      if (!player1 || !player2) return failMessage(ws, 'Couldn\'t find one of the players')
      const newSession = new Session(player1, player2)
      const newSessionCreatedMessage = {
        type: "sessionCreated",
        body: {
          sessionId: newSession.id
        },
      } as WSServerMessage
      sendMessage(player1.ws, newSessionCreatedMessage)
      sendMessage(player2.ws, newSessionCreatedMessage)
      saveSession(newSession)
      return
    }
    case "setPlayerBoard": {
      const reqData = data.body as WSClientSetPlayerBoardBody

      const session = await findSessionById(reqData.sessionId)
      if (!session) return failMessage(ws, 'Couldn\'t find the session')

      const player = session.getPlayerByUserId(reqData.userId)
      if (!player) return failMessage(ws, 'Couldn\'t find user in this session')

      session.setPlayerBoardByUserId(reqData.userId, reqData.tiles)

      const opponentBoard = session.getOpponentBoardByUserId(reqData.userId)

      if (opponentBoard && opponentBoard.length) {
        session.gameState = 'player1'
      }

      session.notifyBothPlayers('boardSet', {
        // FIXME: This should never be false
        playerNumberWhoseBoardIsSet: session.getPlayerNumber(reqData.userId) || 1,
        shouldWaitForOpponent: session.gameState != 'player1'
      })
      saveSession(session)
      return
    }
    case 'takeShot': {
      const reqData = data.body as WSClientTakeShotBody

      const session = await findSessionById(reqData.sessionId)
      if (!session) return failMessage(ws, 'Couldn\'t find the session')

      return session.computeShot(reqData.userId, reqData.position, ws)
    }
    case 'setUsername': {
      const reqData = data.body as WSClientSetUsernameBody

      const player = setUsernameById(reqData.userId, reqData.username)
      if (!player) return failMessage(ws, 'Couldn\'t find user')

      notifyListeners()
    }
  }
}