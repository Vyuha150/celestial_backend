import { Schema, model, Types } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true }, // TTL index declared below
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// TTL cleanup — Mongo removes the doc automatically once expiresAt passes.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model("RefreshToken", refreshTokenSchema);
export type RefreshTokenId = Types.ObjectId;
