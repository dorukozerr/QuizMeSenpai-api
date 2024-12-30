import { z } from 'zod';
import { ObjectId } from 'mongodb';

import { router, protectedProcedure } from '../trpc';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT Secret is undefined.');
}

export const userRouter = router({
  update: protectedProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3, { message: 'Username can be minimum 3 characters.' })
          .max(15, { message: 'Username can be maximum 15 characters.' })
      })
    )
    .mutation(async ({ ctx: { user, collections }, input: { username } }) => {
      await collections.users.findOneAndUpdate(
        { _id: user._id },
        { $set: { username } }
      );

      return { success: true };
    }),
  getUsername: protectedProcedure
    .input(
      z.object({ userId: z.string().refine((id) => ObjectId.isValid(id)) })
    )
    .query(
      async ({ ctx: { collections }, input: { userId } }) =>
        (await collections.users.findOne(
          { _id: new ObjectId(userId) },
          { projection: ['username'] }
        )) as { username: string }
    )
});
