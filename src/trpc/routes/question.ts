import { ObjectId } from 'mongodb';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

// import { Question } from '../../types';
import { router, protectedProcedure } from '../trpc';
import { ee } from '../../lib/event-emitter';

export const questionRouter = router({
  getQuestions: protectedProcedure.query(
    async ({ ctx: { collections, user } }) =>
      await collections.questions.find({ ownerId: user._id }).toArray()
  ),
  createQuestion: protectedProcedure
    .input(
      z.object({
        question: z.string().min(3).max(200),
        answers: z.array(z.string().min(3).max(50)).min(4).max(4),
        correctAnswerIndex: z.number().min(0).max(3)
      })
    )
    .mutation(
      async ({
        ctx: { collections, user },
        input: { question, answers, correctAnswerIndex }
      }) => {
        await collections.questions.insertOne({
          _id: new ObjectId(),
          ownerId: user._id,
          owner: user.username,
          question,
          answers,
          correctAnswerIndex
        });

        return { success: true };
      }
    ),
  setQuestions: protectedProcedure
    .input(
      z.object({
        roomId: z.string().refine((id) => ObjectId.isValid(id)),
        questions: z.array(z.string().refine((id) => ObjectId.isValid(id)))
      })
    )
    .mutation(
      async ({ ctx: { collections, user }, input: { roomId, questions } }) => {
        await collections.rooms.findOneAndUpdate(
          { _id: new ObjectId(roomId) },
          { $pull: { 'gameSettings.questions': { ownerId: user._id } } }
        );

        const result = await collections.rooms.findOneAndUpdate(
          { _id: new ObjectId(roomId) },
          {
            $push: {
              'gameSettings.questions': {
                $each: questions.map((questionId) => ({
                  questionId: new ObjectId(questionId),
                  ownerId: user._id
                }))
              }
            }
          }
        );

        if (!result) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Room not found or unknown server error.'
          });
        }

        ee.emit(`room:${roomId}`, roomId);

        return { success: true };
      }
    )
});
