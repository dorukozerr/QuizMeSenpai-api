import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { collections } from '../../lib/mongo';
import { router, protectedProcedure } from '../trpc';

export const roomRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        roomName: z
          .string()
          .min(5, { message: 'Room name can be minimum 5 characters.' })
          .max(30, { message: 'Room name can be maximum 30 characters.' }),
        roomPassword: z.string().min(5).max(30).optional()
      })
    )
    .mutation(async ({ ctx: { user }, input: { roomName, roomPassword } }) => {
      const isRoomExists = await collections.rooms.findOne({ roomName });

      if (!isRoomExists) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Room already exists.'
        });
      }

      await collections.rooms.insertOne({
        roomName,
        roomPassword,
        creator: user?._id,
        createdAt: new Date()
      });

      return { success: true };
    })
});
