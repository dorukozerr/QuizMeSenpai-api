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
