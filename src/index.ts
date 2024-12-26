import { config } from 'dotenv';

config();

import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cookieParser from 'cookie-parser';
import { mongoClient } from './lib/db';
import { appRouter } from './trpc';
import { createContext } from './trpc/context';

const app = express();
const port = process.env.PORT;

if (!port) {
  throw new Error('Port is undefined.');
}

app.use(express.json());
app.use(cookieParser());
app.use('/trpc', createExpressMiddleware({ createContext, router: appRouter }));

const startServer = async () => {
  try {
    await mongoClient.connect();

    console.log('Connected to MongoDB');

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);

    process.exit(1);
  }
};

startServer();
