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
  console.log("createContext called"); // Verify the function is running

  const getUserFromCookie = async () => {
    try {
      const { token } = req.cookies;

      if (!token) {
        console.log("No token cookie found");
        return null;
      }

      const decoded = verify(token, jwtSecret); // Remove .value

      console.log("Decoded token:", decoded);
      return { decoded };
    } catch (error) {
      console.error("Auth error:", error);
      return null;
    }
  };

  const user = await getUserFromCookie();
  console.log("Final user context:", user);

  return { req, res, user };
};

export type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();

const middleware = t.middleware;

const isAuthenticated = middleware(async ({ ctx, next }) => {
  console.log("isAuthenticated =>", ctx.user);
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
    .mutation(async ({ input: { username, password } }) => {
      console.log({ username, password });
    }),
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input: { username, password } }) => {
      console.log({ username, password });
    }),
});
