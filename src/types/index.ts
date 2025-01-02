import { ObjectId } from 'mongodb';

export interface Otp {
  _id: ObjectId;
  phoneNumber: string;
  otp: string;
  hash: string;
  createdAt: Date;
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

export interface Question {
  _id: ObjectId;
  ownerId: ObjectId;
  owner: string;
  question: string;
  answers: string[];
  correctAnswerIndex: number;
}

export interface GameSettings {
  questionsPerUser: '5' | '10' | '15' | '20';
  answerPeriod: '30' | '60' | '90' | '120';
  questions: Question[];
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

export interface Game {
  _id: ObjectId;
  roomId: ObjectId;
  participants: { _id: ObjectId; username: string }[];
  gameSettings: GameSettings;
  rounds: {
    question: Question;
    givenAnswers: { userId: ObjectId; answerIndex: number }[];
  }[];
}
