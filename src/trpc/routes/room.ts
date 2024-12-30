import { EventEmitter } from 'events';
import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { Room } from '../../types';
import { router, protectedProcedure } from '../trpc';

const ee = new EventEmitter();

export const roomRouter = router({
  enterRoom: protectedProcedure
    .input(
      z.object({
        roomName: z
          .string()
          .min(5, { message: 'Room name can be minimum 5 characters.' })
          .max(30, { message: 'Room name can be maximum 30 characters.' })
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
          { $pull: { participants: { _id }, readyChecks: { _id } } }
        );

        await collections.rooms.findOneAndUpdate(
          { roomName },
          { $push: { participants: { _id, username: user.username } } }
        );

        ee.emit(`room:${room._id.toString()}`, room._id.toString());

        return { success: true, roomId: room._id };
      } else {
        const createdRoom = await collections.rooms.insertOne({
          _id: new ObjectId(),
          roomName,
          creatorId: _id,
          roomAdmin: _id,
          createdAt: new Date(),
          state: 'pre-game',
          participants: [{ _id: user._id, username: user.username }],
          readyChecks: [],
          gameSettings: {
            questionsPerUser: 5,
            answerPeriod: 20
          }
        });

        ee.emit(
          `room:${createdRoom.insertedId.toString()}`,
          createdRoom.insertedId.toString()
        );

        return { success: true, roomId: createdRoom.insertedId };
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
      const room = (await collections.rooms.findOneAndUpdate(
        { roomName },
        {
          $pull: {
            participants: { _id: user._id },
            readyChecks: { _id: user._id }
          }
        }
      )) as Room;

      ee.emit(`room:${room._id.toString()}`, room._id.toString());

      return { success: true };
    }),
  roomState: protectedProcedure
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

        emit.next(room);

        return () => ee.off(`room:${room?._id.toString()}`, onRoomStateChange);
      });
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
        const room = (await collections.rooms.findOne({
          _id: new ObjectId(roomId)
        })) as Room | null;

        if (!room) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Room not found.'
          });
        }

        if (room.roomAdmin.toString() !== user._id.toString()) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Only room admin can assign new admin.'
          });
        }

        await collections.rooms.findOneAndUpdate(
          { _id: new ObjectId(roomId) },
          { $set: { roomAdmin: new ObjectId(newAdminId) } }
        );

        ee.emit(`room:${room._id.toString()}`, room._id.toString());

        return { success: true };
      }
    )
});
