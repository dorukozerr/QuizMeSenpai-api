import express from "express";
import { initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import { MongoClient, ServerApiVersion } from "mongodb";
import { z } from "zod";

config();

const app = express();
const port = process.env.PORT;
const MongoURI = process.env.MONGODB_URI;

if (!port || !MongoURI) {
  throw new Error("Environment variables are missing!");
}

const mongoClient = new MongoClient(MongoURI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export const appContext = {
  db: mongoClient.db("QuizMeSenpai"),
};

const t = initTRPC.create();

export const appRouter = t.router({
  getUsers: t.procedure.query(async () => {
    const usersCollection = appContext.db.collection("users");
    const users = await usersCollection.find().toArray();
    return users;
  }),
  createUser: t.procedure
    .input(z.object({ username: z.string() }))
    .mutation(async (opts) => {
      console.log("opts =>", opts);
      const usersCollection = appContext.db.collection("users");
      const res = await usersCollection.insertOne({
        username: opts.input.username,
      });
      return res;
    }),
});

export type AppRouter = typeof appRouter;

app.use(express.json());
app.use(cookieParser());

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
  })
);

const startServer = async () => {
  try {
    await mongoClient.connect();
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  }
};

startServer();
