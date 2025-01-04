import { ObjectId } from 'mongodb';
import { z } from 'zod';

// import { Question } from '../../types';
import { router, protectedProcedure } from '../trpc';

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
    )
});
