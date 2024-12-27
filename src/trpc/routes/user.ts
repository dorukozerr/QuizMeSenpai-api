import { z } from 'zod';

import { collections } from '../../lib/mongo';
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
          .min(5, { message: 'Username can be minimum 5 characters.' })
          .max(30, { message: 'Username can be maximum 30 characters.' })
      })
    )
    .mutation(async ({ ctx: { user }, input: { username } }) => {
      await collections.users.findOneAndUpdate(
        { _id: user?._id },
        { $set: { username } }
      );

      return { success: true };
    })
});
