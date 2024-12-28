import { router } from './trpc';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { roomRouter } from './routes/room';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  room: roomRouter
});

export type AppRouter = typeof appRouter;
