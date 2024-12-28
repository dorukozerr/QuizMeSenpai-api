import { randomBytes } from 'crypto';
import { TRPCError } from '@trpc/server';
import { Response } from 'express';
import { z } from 'zod';
// import {
//   SNSClient,
//   PublishCommandInput,
//   PublishCommand
// } from '@aws-sdk/client-sns';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { sign } from 'jsonwebtoken';

import { collections } from '../../lib/mongo';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { Otp, User } from '../../types';

const jwtSecret = process.env.JWT_SECRET;
// const accessKeyId = process.env.AWS_ACCESS_KEY;
// const secretAccessKey = process.env.AWS_SECRET_KEY;

// if (!accessKeyId || !secretAccessKey) {
//   throw new Error('AWS credentials are undefined.');
// }

if (!jwtSecret) {
  throw new Error('JWT Secret is undefined.');
}

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        phoneNumber: z.string().refine((number) => isValidPhoneNumber(number), {
          message: 'Invalid phone number'
        })
      })
    )
    .mutation(async ({ input: { phoneNumber } }) => {
      const hash = randomBytes(16).toString('hex');
      const otp = randomBytes(3).toString('hex');

      await collections.otps.insertOne({
        phoneNumber,
        otp,
        hash,
        createdAt: new Date()
      });

      // const snsClient = new SNSClient({
      //   credentials: { accessKeyId, secretAccessKey },
      //   region: 'eu-central-1'
      // });

      // const publishInput: PublishCommandInput = {
      //   Message: `One time password for QuizMeSenpai - ${otp}`,
      //   PhoneNumber: phoneNumber,
      //   MessageAttributes: {
      //     'AWS.SNS.SMS.SMSType': {
      //       DataType: 'String',
      //       StringValue: 'Transactional'
      //     }
      //   }
      // };

      // const command = new PublishCommand(publishInput);

      // await snsClient.send(command);

      // snsClient.destroy();

      return { success: true, hash };
    }),
  authenticate: publicProcedure
    .input(
      z.object({
        phoneNumber: z.string().refine((number) => isValidPhoneNumber(number), {
          message: 'Invalid phone number'
        }),
        otp: z.string().min(6).max(6),
        hash: z.string().min(32).max(32)
      })
    )
    .mutation(async ({ ctx: { res }, input: { phoneNumber, otp, hash } }) => {
      const otpRecord = (await collections.otps.findOne({
        phoneNumber,
        otp,
        hash
      })) as Otp | null;

      if (!otpRecord) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Incorrect payload.'
        });
      }

      // checking that otp is generated in last 5 minutes
      if (
        new Date().getTime() - otpRecord.createdAt.getTime() <
        5 * 60 * 1000
      ) {
        const user = (await collections.users.findOne({
          phoneNumber
        })) as User | null;

        const userId = user
          ? user._id
          : (
              await collections.users.insertOne({
                phoneNumber,
                username: `user-${randomBytes(4).toString('hex')}`,
                createdAt: new Date()
              })
            ).insertedId;

        const token = sign({ _id: userId.toString() }, jwtSecret, {
          expiresIn: '30d'
        });

        (res as Response).cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });

        return { success: true };
      } else {
        throw new TRPCError({
          code: 'TIMEOUT',
          message: 'OTP timed out.'
        });
      }
    }),
  logout: protectedProcedure.mutation(async ({ ctx: { res } }) => {
    (res as Response).clearCookie('token');

    return { success: true };
  }),
  checkAuth: protectedProcedure.query(({ ctx: { user } }) => user)
});
