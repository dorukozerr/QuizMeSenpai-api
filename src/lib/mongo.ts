import { MongoClient, ServerApiVersion } from 'mongodb';

const MongoURI = process.env.MONGODB_URI;

if (!MongoURI) {
  throw new Error('Mongo URI is undefined.');
}

export const mongoClient = new MongoClient(MongoURI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
});

const db = mongoClient.db('QuizMeSenpai');

export const collections = {
  users: db.collection('users'),
  otps: db.collection('otps'),
  questions: db.collection('questions'),
  rooms: db.collection('rooms')
};
