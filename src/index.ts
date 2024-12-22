import express from "express";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import { MongoClient, ServerApiVersion } from "mongodb";

config();

const app = express();
const port = process.env.PORT;
const MongoURI = process.env.MONGODB_URI;

if (!port || !MongoURI) {
  throw new Error("Environment variables are missing!");
}

app.use(express.json());
app.use(cookieParser());

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
