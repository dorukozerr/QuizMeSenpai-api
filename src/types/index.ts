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

export interface Room {
  _id: ObjectId;
  roomName: string;
  creatorId: ObjectId;
  roomAdmin: ObjectId;
  createdAt: Date;
  state: 'pregame' | 'ingame' | 'aftergame';
  participants: { _id: ObjectId; username: string }[];
  readyChecks: { _id: ObjectId }[];
}
