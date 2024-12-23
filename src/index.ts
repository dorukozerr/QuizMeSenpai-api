import { config } from "dotenv";

config();

import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import { mongoClient } from "./lib/db";
import { appRouter, createContext } from "./trpc";

const app = express();
const serverPort = process.env.SERVER_PORT;

if (!serverPort) {
  throw new Error("Ports are undefined.");
}

app.use(express.json());
app.use(cookieParser());
app.use("/trpc", createExpressMiddleware({ createContext, router: appRouter }));

const startServer = async () => {
  try {
    await mongoClient.connect();

    console.log("Connected to MongoDB");

    app.listen(serverPort, () => {
      console.log(`Server running on port ${serverPort}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);

    process.exit(1);
  }
};

startServer();
