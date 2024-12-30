import { observable } from '@trpc/server/observable';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

import { ee } from '../../lib/event-emitter';
import { Message } from '../../types';
import { router, protectedProcedure } from '../trpc';

export const messageRouter = router({
  sendMessage: protectedProcedure
    .input(
      z.object({
        roomId: z.string().refine((id) => ObjectId.isValid(id)),
        message: z.string().min(1).max(150)
      })
    )
    .mutation(
      async ({ ctx: { user, collections }, input: { roomId, message } }) => {
        await collections.messages.insertOne({
          _id: new ObjectId(),
          roomId: new ObjectId(roomId),
          ownerId: user._id,
          owner: user.username,
          message,
          createdAt: new Date()
        });

        ee.emit(`messages:${roomId}`, roomId);

        return { success: true };
      }
    ),
  messages: protectedProcedure
    .input(
      z.object({
        roomId: z.string().refine((id) => ObjectId.isValid(id))
      })
    )
    .subscription(async ({ ctx: { collections }, input: { roomId } }) => {
      const messages = await collections.messages
        .find({
          roomId: new ObjectId(roomId),
          createdAt: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        })
        .toArray();

      return observable<Message[]>((emit) => {
        const getMessages = async (roomId: string) => {
          try {
            if (!ObjectId.isValid(roomId)) {
              emit.complete();

              return;
            }

            const messages = await collections.messages
              .find({
                roomId: new ObjectId(roomId),
                createdAt: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
              })
              .toArray();

            emit.next(messages);
          } catch (error) {
            emit.error(error);
          }
        };

        ee.on(`messages:${roomId}`, getMessages);

        emit.next(messages);

        return () => ee.off(`room:${roomId}`, getMessages);
      });
    })
});
