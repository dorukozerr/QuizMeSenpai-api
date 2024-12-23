import { router } from './trpcs';
import { authRouter } from './routes/auth';

export const appRouter = router({
  auth: authRouter
});

export type AppRouter = typeof appRouter;
