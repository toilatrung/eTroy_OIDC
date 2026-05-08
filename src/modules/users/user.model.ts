import mongoose, { type Model } from 'mongoose';

const { model, models, Schema, Types } = mongoose;

export interface UserDocument {
  sub: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  status: UserStatus;
  name?: string;
  avatar_url?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const USER_STATUSES = ['active', 'disabled'] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

const userSchema = new Schema<UserDocument>(
  {
    sub: {
      type: String,
      required: true,
      default: () => new Types.ObjectId().toHexString(),
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    email_verified: {
      type: Boolean,
      required: true,
      default: false,
    },
    status: {
      type: String,
      enum: [...USER_STATUSES],
      required: true,
      default: 'active',
    },
    name: {
      type: String,
      trim: true,
    },
    avatar_url: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ sub: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

export const UserModel =
  (models.User as Model<UserDocument> | undefined) ?? model<UserDocument>('User', userSchema);
