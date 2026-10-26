import { Response, NextFunction } from 'express';
import { Flat } from '../models/Flat.js';
import { AuditService } from '../services/auditService.js';
import { AuthenticatedRequest } from '../types/index.js';

export class FlatController {
  static async getFlat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const flat = await Flat.findById(req.user!.flatId).populate('adminUserId', 'name username email');
      if (!flat) {
        res.status(404).json({ success: false, message: 'Flat not found.' });
        return;
      }
      res.json({ success: true, flat });
    } catch (err) {
      next(err);
    }
  }

  static async updateFlat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, address, timezone } = req.body;
      const flat = await Flat.findById(req.user!.flatId);
      if (!flat) {
        res.status(404).json({ success: false, message: 'Flat not found.' });
        return;
      }

      if (name) flat.name = name;
      if (address !== undefined) flat.address = address;
      if (timezone) flat.timezone = timezone;
      await flat.save();

      await AuditService.log({
        flatId: flat._id,
        actorUserId: req.user!.userId,
        action: 'FLAT_SETTINGS_UPDATED',
        entityType: 'Flat',
        entityId: flat._id,
        metadata: { name, address, timezone },
      });

      res.json({ success: true, message: 'Flat updated successfully.', flat });
    } catch (err) {
      next(err);
    }
  }
}
