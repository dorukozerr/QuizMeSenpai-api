import { router } from './trpc';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { roomRouter } from './routes/room';
import { messageRouter } from './routes/message';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  room: roomRouter,
  message: messageRouter
});

export type AppRouter = typeof appRouter;
