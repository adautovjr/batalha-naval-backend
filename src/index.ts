import express from 'express'
import cors from 'cors'
import path from 'path'
import { DEFAULT_VARIABLE } from '@config/index'
import appWs from "./config/ws"

const app = express()

app.use(express.static(path.join(__dirname, 'public')))
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))


app.get('/', (request, response) => {
  console.log(DEFAULT_VARIABLE)
  return response.json({ message: 'Hello world' })
})

const server = app.listen(process.env.PORT || 3001, () => {
  console.log(`App Express is running!`);
})
appWs(server)