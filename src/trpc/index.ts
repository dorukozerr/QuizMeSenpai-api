import { initTRPC, TRPCError, inferAsyncReturnType } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { verify, sign } from "jsonwebtoken";
import { collections } from "../lib/db";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT Secret is undefined.");
}

export const createContext = async ({
  req,
  res,
}: CreateExpressContextOptions) => {
  const getUserFromCookie = async () => {
    try {
      const { token } = req.cookies;

      if (!token) {
        return null;
      }

      const decoded = verify(token, jwtSecret) as {
        userId: string;
        username: string;
      };

      return { userId: decoded.userId, username: decoded.username };
    } catch (error) {
      console.error("Auth error:", error);

      return null;
    }
  };

  const user = await getUserFromCookie();

  return { req, res, user };
};

export type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();

const middleware = t.middleware;

const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

const publicProcedure = t.procedure;
const protectedProcedure = publicProcedure.use(isAuthenticated);

export const appRouter = t.router({
  getUsers: protectedProcedure.query(async () => {
    const users = await collections.users.find().toArray();
    return users;
  }),
  register: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ ctx, input: { username, password } }) => {
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

      const token = sign(
        { userId: result.insertedId.toString(), username },
        jwtSecret,
        { expiresIn: "7d" }
      );

      ctx.res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        user: {
          id: result.insertedId.toString(),
          username,
        },
      };
    }),
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ ctx, input: { username, password } }) => {
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

      const token = sign(
        { userId: user._id.toString(), username: user.username },
        jwtSecret,
        { expiresIn: "7d" }
      );

      ctx.res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        user: {
          id: user._id.toString(),
          username: user.username,
        },
      };
    }),
  logout: protectedProcedure.mutation(async ({ ctx: { res } }) => {
    res.clearCookie("token");

    return { success: true };
  }),
});
