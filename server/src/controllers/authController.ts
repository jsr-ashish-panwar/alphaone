import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Flat } from '../models/Flat.js';
import { Membership } from '../models/Membership.js';
import { AuditService } from '../services/auditService.js';
import { ENV } from '../config/env.js';
import {
  registerFlatSchema,
  loginSchema,
  verifyPinSchema,
  changePinSchema,
} from '../validators/index.js';
import { AuthenticatedRequest } from '../types/index.js';

const generateToken = (userId: string, flatId: string): string => {
  return jwt.sign({ userId, flatId }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as any,
  });
};

const setTokenCookie = (res: Response, token: string) => {
  const isProd = ENV.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    domain: ENV.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export class AuthController {
  static async registerFlat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = registerFlatSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await User.findOne({ username: data.username });
      if (existingUser) {
        res.status(409).json({ success: false, message: 'Username is already taken.' });
        return;
      }

      // Hash PIN
      const pinHash = await bcrypt.hash(data.pin, 10);

      // Create Admin User
      const user = await User.create({
        username: data.username,
        name: data.adminName,
        email: data.email || undefined,
        pinHash,
        accountStatus: 'active',
      });

      // Generate unique flat code (e.g. ALPHA-C42 or random suffix)
      const baseCode = data.flatName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'FLAT';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const code = `${baseCode}-${randomSuffix}`;

      // Create Flat
      const flat = await Flat.create({
        name: data.flatName,
        address: data.address,
        adminUserId: user._id,
        code,
      });

      // Create Admin Membership
      const membership = await Membership.create({
        flatId: flat._id,
        userId: user._id,
        role: 'admin',
        status: 'active',
        joinedAt: new Date(),
      });

      // Audit Log
      await AuditService.log({
        flatId: flat._id,
        actorUserId: user._id,
        action: 'FLAT_REGISTERED',
        entityType: 'Flat',
        entityId: flat._id,
        metadata: { flatName: flat.name, adminUsername: user.username },
      });

      const token = generateToken(user._id.toString(), flat._id.toString());
      setTokenCookie(res, token);

      res.status(201).json({
        success: true,
        message: 'Flat and administrator account created successfully.',
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
        },
        flat: {
          id: flat._id,
          name: flat.name,
          code: flat.code,
          address: flat.address,
        },
        membership: {
          id: membership._id,
          role: membership.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);

      const user = await User.findOne({ username: data.username }).select('+pinHash');
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid username or PIN.' });
        return;
      }

      if (user.isLocked()) {
        res.status(423).json({
          success: false,
          message: 'Account locked due to excessive failed attempts. Please try again after 15 minutes.',
        });
        return;
      }

      const isMatch = await user.comparePin(data.pin);
      if (!isMatch) {
        await user.incFailedAttempts();
        res.status(401).json({ success: false, message: 'Invalid username or PIN.' });
        return;
      }

      await user.resetAttempts();

      // Find flat membership
      let membershipQuery: Record<string, any> = { userId: user._id, status: 'active' };
      if (data.flatCode) {
        const flat = await Flat.findOne({ code: data.flatCode.toUpperCase().trim() });
        if (flat) {
          membershipQuery.flatId = flat._id;
        }
      }

      let membership = await Membership.findOne(membershipQuery).populate('flatId');
      if (!membership) {
        // If no active membership found, check if user has any membership (e.g. inactive)
        const anyMembership = await Membership.findOne({ userId: user._id }).populate('flatId');
        if (!anyMembership) {
          res.status(403).json({ success: false, message: 'No flat membership found for this account.' });
          return;
        }
        res.status(403).json({ success: false, message: 'Your membership is inactive.' });
        return;
      }

      const flat = membership.flatId as any;
      const token = generateToken(user._id.toString(), flat._id.toString());
      setTokenCookie(res, token);

      res.json({
        success: true,
        message: 'Logged in successfully.',
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
        },
        flat: {
          id: flat._id,
          name: flat.name,
          code: flat.code,
          address: flat.address,
        },
        membership: {
          id: membership._id,
          role: membership.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyPin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = verifyPinSchema.parse(req.body);
      const user = await User.findById(req.user!.userId).select('+pinHash');

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      if (user.isLocked()) {
        res.status(423).json({
          success: false,
          message: 'Account locked due to excessive failed attempts. Please try again later.',
        });
        return;
      }

      const isMatch = await user.comparePin(data.pin);
      if (!isMatch) {
        await user.incFailedAttempts();
        res.status(401).json({ success: false, message: 'Incorrect PIN.' });
        return;
      }

      await user.resetAttempts();
      res.json({ success: true, message: 'PIN verified successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async changePin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = changePinSchema.parse(req.body);
      const user = await User.findById(req.user!.userId).select('+pinHash');

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const isMatch = await user.comparePin(data.currentPin);
      if (!isMatch) {
        await user.incFailedAttempts();
        res.status(401).json({ success: false, message: 'Current PIN is incorrect.' });
        return;
      }

      user.pinHash = await bcrypt.hash(data.newPin, 10);
      user.failedPinAttempts = 0;
      user.lockUntil = undefined;
      await user.save();

      await AuditService.log({
        flatId: req.user!.flatId,
        actorUserId: user._id,
        action: 'PIN_CHANGED',
        entityType: 'User',
        entityId: user._id,
      });

      res.json({ success: true, message: 'PIN updated successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.user!.userId);
      const flat = await Flat.findById(req.user!.flatId);
      const membership = await Membership.findById(req.user!.membershipId);

      if (!user || !flat || !membership) {
        res.status(404).json({ success: false, message: 'Session data not found.' });
        return;
      }

      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
        },
        flat: {
          id: flat._id,
          name: flat.name,
          code: flat.code,
          address: flat.address,
        },
        membership: {
          id: membership._id,
          role: membership.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(_req: AuthenticatedRequest, res: Response): Promise<void> {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully.' });
  }
}
