import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { collections } from "../../lib/db";
import { router, publicProcedure, protectedProcedure } from "../trpcs";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT Secret is undefined.");
}

export const authRouter = router({
  register: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ ctx: { res }, input: { username, password } }) => {
      const doesUsernameExists = await collections.users.findOne({ username });

      if (doesUsernameExists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already exists",
        });
      }

      const hashedPassword = await hash(password, 10);

      const result = await collections.users.insertOne({
        username,
        password: hashedPassword,
        createdAt: new Date(),
      });

      const token = sign({ _id: result.insertedId.toString() }, jwtSecret, {
        expiresIn: "7d",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return { _id: result.insertedId.toString(), username };
    }),
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ ctx: { res }, input: { username, password } }) => {
      const user = await collections.users.findOne({ username });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid username or password",
        });
      }

      const isValidPassword = await compare(password, user.password);

      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      const token = sign({ _id: user._id.toString() }, jwtSecret, {
        expiresIn: "7d",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return { _id: user._id.toString(), username: user.username };
    }),
  logout: protectedProcedure.mutation(({ ctx: { res } }) => {
    res.clearCookie("token");

    return { success: true };
  }),
});
