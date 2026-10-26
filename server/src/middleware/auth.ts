import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { Membership } from '../models/Membership.js';
import { AuthenticatedRequest, AuthUserPayload } from '../types/index.js';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Check Authorization Bearer header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
      userId: string;
      flatId: string;
    };

    // Verify user exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || user.accountStatus !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Account is inactive or no longer exists.',
      });
      return;
    }

    // Verify membership in specified flat
    const membership = await Membership.findOne({
      userId: user._id,
      flatId: decoded.flatId,
    });

    if (!membership || membership.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Active membership required for this flat.',
      });
      return;
    }

    req.user = {
      userId: user._id.toString(),
      username: user.username,
      name: user.name,
      flatId: membership.flatId.toString(),
      membershipId: membership._id.toString(),
      role: membership.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.',
    });
    return;
  }
  next();
};
