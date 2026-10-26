import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types/index.js';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  comparePin(pin: string): Promise<boolean>;
  isLocked(): boolean;
  incFailedAttempts(): Promise<void>;
  resetAttempts(): Promise<void>;
}

const UserSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    pinHash: {
      type: String,
      required: true,
      select: false, // Do not return by default in queries
    },
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    failedPinAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.pinHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

UserSchema.methods.comparePin = async function (pin: string): Promise<boolean> {
  if (!this.pinHash) {
    // If pinHash was not selected, fetch it
    const userWithPin = await mongoose.model('User').findById(this._id).select('+pinHash');
    if (!userWithPin || !userWithPin.pinHash) return false;
    return bcrypt.compare(pin, userWithPin.pinHash);
  }
  return bcrypt.compare(pin, this.pinHash);
};

UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

UserSchema.methods.incFailedAttempts = async function (): Promise<void> {
  const updates: Record<string, any> = { $inc: { failedPinAttempts: 1 } };
  // Lock for 15 minutes after 5 consecutive failed attempts
  if (this.failedPinAttempts + 1 >= 5) {
    updates.$set = { lockUntil: new Date(Date.now() + 15 * 60 * 1000) };
  }
  await this.updateOne(updates);
};

UserSchema.methods.resetAttempts = async function (): Promise<void> {
  await this.updateOne({
    $set: { failedPinAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

export const User = mongoose.model<IUserDocument>('User', UserSchema);
