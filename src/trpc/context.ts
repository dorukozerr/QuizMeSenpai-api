import { ObjectId } from 'mongodb';
import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws';
import { verify } from 'jsonwebtoken';

import { collections } from '../lib/mongo';
import { User } from '../types';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT Secret is undefined.');
}

const getUserFromCookie = async (token: string | undefined) => {
  try {
    if (!token) {
      return null;
    }

    const { _id } = verify(token, jwtSecret) as { _id: string };

    const user = (await collections.users.findOne({
      _id: new ObjectId(_id)
    })) as User | null;

    if (!user) {
      return null;
    }

    return { _id: user._id, username: user.username };
  } catch (error) {
    return null;
  }
};

export const createExpressContext = async ({
  req,
  res
}: CreateExpressContextOptions) => {
  const user = await getUserFromCookie(req.cookies.token);

  return { isWebsocket: false, req, res, user };
};

export const createWebsocketContext = async ({
  req,
  res
}: CreateWSSContextFnOptions) => {
  const user = await getUserFromCookie(req?.headers?.cookie?.slice(6));

  return { isWebsocket: true, req, res, user };
};

export type ExpressContext = inferAsyncReturnType<typeof createExpressContext>;
export type WebsocketContext = inferAsyncReturnType<
  typeof createWebsocketContext
>;

export type Context = ExpressContext | WebsocketContext;
