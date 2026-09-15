import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true }, // e.g. "product.create", "order.status_update"
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    diff: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema> & { _id: Types.ObjectId };
export const AuditLog = model("AuditLog", auditLogSchema);
