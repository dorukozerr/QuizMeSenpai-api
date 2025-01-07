import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { ee } from '../../lib/event-emitter';
import { Room } from '../../types';
import { router, protectedProcedure } from '../trpc';

export const roomRouter = router({
  roomSubscription: protectedProcedure
    .input(
      z.object({
        roomId: z.string().refine((id) => ObjectId.isValid(id))
      })
    )
    .subscription(async ({ ctx: { collections }, input: { roomId } }) => {
      const room = await collections.rooms.findOne({
        _id: new ObjectId(roomId)
      });

      return observable<Room | null>((emit) => {
        const onRoomStateChange = async (roomId: string) => {
          try {
            if (!ObjectId.isValid(roomId)) {
              emit.complete();

              return;
            }

            const room = (await collections.rooms.findOne({
              _id: new ObjectId(roomId)
            })) as Room;

            if (!room) {
              emit.next(null);

              return;
            }

            emit.next(room);
          } catch (error) {
            emit.error(error);
          }
        };

        ee.on(`room:${room?._id.toString()}`, onRoomStateChange);

        if (room) {
          emit.next(room);
        }

        return () => ee.off(`room:${room?._id.toString()}`, onRoomStateChange);
      });
    }),
  enterRoom: protectedProcedure
    .input(
      z.object({
        roomName: z
          .string()
          .min(3, { message: 'Room name can be minimum 3 characters.' })
          .max(15, { message: 'Room name can be maximum 15 characters.' })
      })
    )
    .mutation(async ({ ctx: { collections, user }, input: { roomName } }) => {
      const room = (await collections.rooms.findOne({
        roomName
      })) as Room | null;

      const _id = user._id;

      if (room) {
        // On local development if app gets refreshed while user is in the room leave event wont
        // trigger, and when user re-enters the room same id gets written twice. To prevent this
        // we're clearing the user from participants and readyChecks first. I belive this can happen
        // in production if user quits the app and re-opens it also.

        await collections.rooms.findOneAndUpdate(
          { roomName },
          {
            $pull: {
              participants: { _id },
              readyChecks: { _id },
              'gameSettings.questions': { ownerId: _id }
            }
          }
        );

        await collections.rooms.findOneAndUpdate(
          { roomName },
          { $push: { participants: { _id, username: user.username } } }
        );

        ee.emit(`room:${room._id.toString()}`, room._id.toString());

        return { success: true, roomId: room._id };
      } else {
        const roomId = (
          await collections.rooms.insertOne({
            _id: new ObjectId(),
            roomName,
            creatorId: _id,
            roomAdmin: _id,
            createdAt: new Date(),
            state: 'pre-game',
            participants: [{ _id: user._id, username: user.username }],
            readyChecks: [],
            gameSettings: {
              questionsPerUser: '5',
              answerPeriod: '60',
              questions: []
            }
          })
        ).insertedId;

        ee.emit(`room:${roomId}`, roomId);

        return { success: true, roomId };
      }
    }),
  leaveRoom: protectedProcedure
    .input(
      z.object({
        roomName: z
          .string()
          .min(5, { message: 'Room name can be minimum 5 characters.' })
          .max(30, { message: 'Room name can be maximum 30 characters.' })
      })
    )
    .mutation(async ({ ctx: { collections, user }, input: { roomName } }) => {
      const room = await collections.rooms.findOne({ roomName });

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found.'
        });
      }

      const result =
        room?.state === 'pre-game'
          ? await collections.rooms.findOneAndUpdate(
              { roomName },
              {
                $pull: {
                  participants: { _id: user._id },
                  readyChecks: { _id: user._id },
                  'gameSettings.questions': { ownerId: user._id }
                }
              }
            )
          : await collections.rooms.findOneAndUpdate(
              { roomName },
              {
                $pull: {
                  participants: { _id: user._id },
                  readyChecks: { _id: user._id }
                }
              }
            );

      ee.emit(`room:${result?._id.toString()}`, result?._id.toString());

      return { success: true };
    }),
  assignNewAdmin: protectedProcedure
    .input(
      z.object({
        roomId: z.string().refine((id) => ObjectId.isValid(id)),
        newAdminId: z.string().refine((id) => ObjectId.isValid(id))
      })
    )
    .mutation(
      async ({ ctx: { collections, user }, input: { roomId, newAdminId } }) => {
        const result = await collections.rooms.findOneAndUpdate(
          { _id: new ObjectId(roomId), roomAdmin: user._id },
          { $set: { roomAdmin: new ObjectId(newAdminId) } }
        );

        if (!result) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Room not found or unauthorized.'
          });
        }

        ee.emit(`room:${roomId}`, roomId);

        return { success: true };
      }
    ),
  kickUser: protectedProcedure
    .input(
      z.object({
        roomId: z.string().refine((id) => ObjectId.isValid(id)),
        kickedUser: z.string().refine((id) => ObjectId.isValid(id))
      })
    )
    .mutation(
      async ({ ctx: { collections, user }, input: { roomId, kickedUser } }) => {
        const result = await collections.rooms.findOneAndUpdate(
          { _id: new ObjectId(roomId), roomAdmin: user._id },
          {
            $pull: {
              participants: { _id: new ObjectId(kickedUser) },
              readyChecks: { _id: new ObjectId(kickedUser) },
              'gameSettings.questions': { ownerId: new ObjectId(kickedUser) }
            }
          }
        );

        if (!result) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Room not found or unauthorized.'
          });
        }

        ee.emit(`room:${roomId}`, roomId);

        return { success: true };
      }
    ),
  changeGameSettings: protectedProcedure
    .input(
      z.object({
        roomId: z.string().refine((id) => ObjectId.isValid(id)),
        settingToChange: z.enum(['questionsPerUser', 'answerPeriod']),
        newValue: z.enum(['5', '10', '15', '20', '30', '60', '90', '120'])
      })
    )
    .mutation(
      async ({
        ctx: { collections, user },
        input: { roomId, settingToChange, newValue }
      }) => {
        const result = await collections.rooms.findOneAndUpdate(
          { _id: new ObjectId(roomId), roomAdmin: user._id },
          { $set: { [`gameSettings.${settingToChange}`]: newValue } }
        );

        if (!result) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Room not found or unauthorized.'
          });
        }

        ee.emit(`room:${roomId}`, roomId);

        return { success: true };
      }
    )
});
