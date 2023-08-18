import { Schema, model } from "mongoose";

const COLLECTION_NAME = "follow_dev";

export type Follow = {
  _id: Schema.Types.ObjectId;
  follower_id: string;
  following_id: string;
  createdAt: Date;
};

const followSchema: Schema = new Schema<Follow>(
  {
    follower_id: { type: String, required: true },
    following_id: { type: String, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default model<Follow>("Follow", followSchema, COLLECTION_NAME);
