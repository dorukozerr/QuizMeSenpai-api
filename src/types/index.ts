import { ObjectId } from 'mongodb';

export interface Otp {
  _id: ObjectId;
  phoneNumber: string;
  otp: string;
  hash: string;
  createdAt: Date;
}

export interface GameSettings {
  questionsPerUser: 5 | 10 | 15 | 20;
  answerPeriod: 10 | 20 | 30;
}

export interface User {
  _id: ObjectId;
  phoneNumber: string;
  username: string;
  createdAt: Date;
}

export interface Message {
  _id: ObjectId;
  roomId: ObjectId;
  ownerId: ObjectId;
  owner: string;
  message: string;
  createdAt: Date;
}

export interface Room {
  _id: ObjectId;
  roomName: string;
  creatorId: ObjectId;
  roomAdmin: ObjectId;
  createdAt: Date;
  state: 'pre-game' | 'in-game';
  participants: { _id: ObjectId; username: string }[];
  readyChecks: { _id: ObjectId }[];
  gameSettings: GameSettings;
}
