import { router } from './trpc';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { roomRouter } from './routes/room';
import { messageRouter } from './routes/message';
import { questionRouter } from './routes/question';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  room: roomRouter,
  message: messageRouter,
  question: questionRouter
});

export type AppRouter = typeof appRouter;
