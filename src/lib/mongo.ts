import { MongoClient, ServerApiVersion, Collection } from 'mongodb';

import { User, Otp, Room, Message, Question } from '../types';

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
  otps: db.collection('otps') as Collection<Otp>,
  users: db.collection('users') as Collection<User>,
  rooms: db.collection('rooms') as Collection<Room>,
  messages: db.collection('messages') as Collection<Message>,
  questions: db.collection('questions') as Collection<Question>
};
