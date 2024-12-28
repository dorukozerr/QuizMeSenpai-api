import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';

export const t = initTRPC.context<Context>().create();

const middleware = t.middleware;

const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not authorized for this request.'
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = publicProcedure.use(isAuthenticated);
