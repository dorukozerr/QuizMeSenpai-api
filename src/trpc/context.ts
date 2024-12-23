import { ObjectId } from 'mongodb';
import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { verify } from 'jsonwebtoken';
import { collections } from '../lib/db';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT Secret is undefined.');
}

export const createContext = async ({
  req,
  res
}: CreateExpressContextOptions) => {
  const getUserFromCookie = async () => {
    try {
      const { token } = req.cookies;

      if (!token) {
        return null;
      }

      const { _id } = verify(token, jwtSecret) as {
        _id: string;
      };

      const user = await collections.users.findOne({
        _id: new ObjectId(_id)
      });

      if (!user) {
        return null;
      }

      return { _id: user._id, username: user.username };
    } catch (error) {
      console.error('Auth error:', error);

      return null;
    }
  };

  const user = await getUserFromCookie();

  return { req, res, user };
};

export type Context = inferAsyncReturnType<typeof createContext>;
