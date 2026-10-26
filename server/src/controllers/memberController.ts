import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Membership } from '../models/Membership.js';
import { AuditService } from '../services/auditService.js';
import { BalanceService } from '../services/balanceService.js';
import {
  addMemberSchema,
  updateMemberSchema,
  resetPinSchema,
} from '../validators/index.js';
import { AuthenticatedRequest } from '../types/index.js';

export class MemberController {
  static async listMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const balanceReport = await BalanceService.calculateFlatBalances(req.user!.flatId);
      res.json({
        success: true,
        members: balanceReport.memberBalances,
        settlementSuggestions: balanceReport.settlementSuggestions,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = addMemberSchema.parse(req.body);

      // Check username collision
      const existingUser = await User.findOne({ username: data.username });
      if (existingUser) {
        // If user exists, check if they already have membership in this flat
        const existingMembership = await Membership.findOne({
          flatId: req.user!.flatId,
          userId: existingUser._id,
        });

        if (existingMembership) {
          res.status(409).json({
            success: false,
            message: 'User is already a member of this flat.',
          });
          return;
        }

        // Add to this flat
        const membership = await Membership.create({
          flatId: req.user!.flatId,
          userId: existingUser._id,
          role: data.role || 'member',
          status: 'active',
          joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date(),
        });

        await AuditService.log({
          flatId: req.user!.flatId,
          actorUserId: req.user!.userId,
          action: 'MEMBER_ADDED_EXISTING_USER',
          entityType: 'Membership',
          entityId: membership._id,
          metadata: { username: existingUser.username, name: existingUser.name },
        });

        res.status(201).json({
          success: true,
          message: 'Member added to flat successfully.',
          membership,
        });
        return;
      }

      // Create new user
      const pinHash = await bcrypt.hash(data.pin, 10);
      const newUser = await User.create({
        username: data.username,
        name: data.name,
        email: data.email || undefined,
        pinHash,
        accountStatus: 'active',
      });

      const membership = await Membership.create({
        flatId: req.user!.flatId,
        userId: newUser._id,
        role: data.role || 'member',
        status: 'active',
        joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date(),
      });

      await AuditService.log({
        flatId: req.user!.flatId,
        actorUserId: req.user!.userId,
        action: 'MEMBER_CREATED',
        entityType: 'Membership',
        entityId: membership._id,
        metadata: { username: newUser.username, name: newUser.name, initialPinSet: true },
      });

      res.status(201).json({
        success: true,
        message: `Member ${newUser.name} created and assigned initial PIN.`,
        member: {
          membershipId: membership._id,
          userId: newUser._id,
          name: newUser.name,
          username: newUser.username,
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { membershipId } = req.params;
      const data = updateMemberSchema.parse(req.body);

      const membership = await Membership.findOne({
        _id: membershipId,
        flatId: req.user!.flatId,
      });

      if (!membership) {
        res.status(404).json({ success: false, message: 'Membership not found.' });
        return;
      }

      // If non-admin, can only edit their own profile (name, email)
      if (req.user!.role !== 'admin' && membership._id.toString() !== req.user!.membershipId) {
        res.status(403).json({ success: false, message: 'Unauthorized to modify this member.' });
        return;
      }

      // Update User fields if provided
      if (data.name || data.email !== undefined) {
        await User.findByIdAndUpdate(membership.userId, {
          ...(data.name ? { name: data.name } : {}),
          ...(data.email !== undefined ? { email: data.email || undefined } : {}),
        });
      }

      // Update Membership fields (status, leftAt, role - only admin can change status/role)
      if (req.user!.role === 'admin') {
        if (data.status) {
          membership.status = data.status;
          if (data.status === 'inactive' && !membership.leftAt) {
            membership.leftAt = data.leftAt ? new Date(data.leftAt) : new Date();
          } else if (data.status === 'active') {
            membership.leftAt = undefined;
          }
        }
        if (data.role) {
          membership.role = data.role;
        }
        await membership.save();
      }

      await AuditService.log({
        flatId: req.user!.flatId,
        actorUserId: req.user!.userId,
        action: 'MEMBER_UPDATED',
        entityType: 'Membership',
        entityId: membership._id,
        metadata: data,
      });

      res.json({ success: true, message: 'Member updated successfully.', membership });
    } catch (err) {
      next(err);
    }
  }

  static async resetPin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { membershipId } = req.params;
      const data = resetPinSchema.parse(req.body);

      // Only admin or self can reset PIN
      const membership = await Membership.findOne({
        _id: membershipId,
        flatId: req.user!.flatId,
      });

      if (!membership) {
        res.status(404).json({ success: false, message: 'Membership not found.' });
        return;
      }

      if (req.user!.role !== 'admin' && membership._id.toString() !== req.user!.membershipId) {
        res.status(403).json({ success: false, message: 'Unauthorized to reset PIN for this member.' });
        return;
      }

      const user = await User.findById(membership.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      user.pinHash = await bcrypt.hash(data.newPin, 10);
      user.failedPinAttempts = 0;
      user.lockUntil = undefined;
      await user.save();

      await AuditService.log({
        flatId: req.user!.flatId,
        actorUserId: req.user!.userId,
        action: 'MEMBER_PIN_RESET',
        entityType: 'User',
        entityId: user._id,
        reason: req.user!.role === 'admin' ? 'Admin PIN reset' : 'Self PIN reset',
      });

      res.json({ success: true, message: `PIN for ${user.name} has been reset successfully.` });
    } catch (err) {
      next(err);
    }
  }
}
