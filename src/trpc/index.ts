import { router } from './trpc';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';

export const appRouter = router({
  auth: authRouter,
  user: userRouter
});

export type AppRouter = typeof appRouter;
