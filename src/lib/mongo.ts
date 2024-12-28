import { MongoClient, ServerApiVersion, Collection } from 'mongodb';

import { User, Otp, Room } from '../types';

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
  users: db.collection('users') as Collection<User>,
  otps: db.collection('otps') as Collection<Otp>,
  questions: db.collection('questions'),
  rooms: db.collection('rooms') as Collection<Room>
};
