import { config } from 'dotenv';

config();

import express from 'express';
import { WebSocketServer } from 'ws';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { mongoClient } from './lib/mongo';
import { appRouter } from './trpc';
import { createExpressContext, createWebsocketContext } from './trpc/context';

const app = express();

const EXPRESS_PORT = process.env.EXPRESS_PORT;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT;

if (!EXPRESS_PORT || !WEBSOCKET_PORT) {
  throw new Error('Express port is undefined.');
}

app.use(
  cors({
    origin: 'http://localhost:8080',
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(
  '/trpc',
  createExpressMiddleware({
    createContext: createExpressContext,
    router: appRouter
  })
);

const wss = new WebSocketServer({ port: Number(WEBSOCKET_PORT) });

const handler = applyWSSHandler({
  wss,
  router: appRouter,
  createContext: createWebsocketContext
});

wss.on('connection', (ws) => {
  console.log(`++ Connection (${wss.clients.size})`);

  ws.once('close', () => {
    console.log(`-- Connection (${wss.clients.size})`);
  });
});

process.on('SIGTERM', () => {
  handler.broadcastReconnectNotification();
  wss.close();
});

const startServer = async () => {
  try {
    await mongoClient.connect();

    console.log('Connected to MongoDB');

    app.listen(EXPRESS_PORT, () => {
      console.log(`Server running on port ${EXPRESS_PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);

    process.exit(1);
  }
};

startServer();
