import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';

export interface AuditParams {
  flatId: string | Types.ObjectId;
  actorUserId: string | Types.ObjectId;
  action: string;
  entityType: string;
  entityId: string | Types.ObjectId;
  metadata?: Record<string, unknown>;
  reason?: string;
}

export class AuditService {
  static async log(params: AuditParams): Promise<void> {
    try {
      await AuditLog.create({
        flatId: new Types.ObjectId(params.flatId.toString()),
        actorUserId: new Types.ObjectId(params.actorUserId.toString()),
        action: params.action,
        entityType: params.entityType,
        entityId: new Types.ObjectId(params.entityId.toString()),
        metadata: params.metadata,
        reason: params.reason,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }
}
