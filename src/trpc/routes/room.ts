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

      if (room) {
        await collections.rooms.findOneAndUpdate(
          { roomName },
          {
            $push: {
              participants: { _id: user._id, username: user.username }
            }
          }
        );

        ee.emit(`room:${room._id.toString()}`, room._id.toString());

        return { success: true };
      } else {
        const createdRoom = await collections.rooms.insertOne({
          _id: new ObjectId(),
          roomName,
          creatorId: user._id,
          roomAdmin: user._id,
          createdAt: new Date(),
          state: 'pregame',
          participants: [{ _id: user._id, username: user.username }],
          readyChecks: []
        });

        ee.emit(
          `room:${createdRoom.insertedId.toString()}`,
          createdRoom.insertedId.toString()
        );

        return { success: true };
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
      await collections.rooms.findOneAndUpdate(
        { roomName },
        {
          $pull: {
            participants: { _id: user._id },
            readyChecks: { _id: user._id }
          }
        }
      );

      return { success: true };
    }),
  roomState: protectedProcedure
    .input(
      z.object({
        roomName: z
          .string()
          .min(5, { message: 'Room name can be minimum 5 characters.' })
          .max(30, { message: 'Room name can be maximum 30 characters.' })
      })
    )
    .subscription(async ({ ctx: { collections }, input: { roomName } }) => {
      const room = await collections.rooms.findOne({ roomName });

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found.'
        });
      }

      return observable<Room>((emit) => {
        const onRoomStateChange = async (roomId: string) => {
          try {
            console.log('onRoomStateChange invoked =>', roomId);

            if (!ObjectId.isValid(roomId)) {
              emit.complete();

              return;
            }

            const room = (await collections.rooms.findOne({
              _id: new ObjectId(roomId)
            })) as Room;

            if (!room) {
              console.log('noRoom emit');

              emit.complete();

              return;
            }

            emit.next(room);
          } catch (error) {
            emit.error(error);
          }
        };

        ee.on(`room:${room._id.toString()}`, onRoomStateChange);

        emit.next(room);

        console.log('insideObservable');

        return () => {
          ee.off(`room:${room._id.toString()}`, onRoomStateChange);
        };
      });
    })
});
