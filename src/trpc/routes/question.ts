import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { Question } from '../../types';
import { router, protectedProcedure } from '../trpc';

export const questionRouter = router({});
