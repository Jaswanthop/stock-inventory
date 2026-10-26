import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { AppError, asyncHandler } from './error.js';

/** Verify the bearer token and attach the current user to req.user. */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    throw new AppError('Authentication required. Please sign in.', 401);
  }

  const payload = jwt.verify(token, config.jwtSecret);
  const user = await User.findById(payload.sub || payload.id);

  if (!user) throw new AppError('User account no longer exists.', 401);
  if (!user.active) throw new AppError('This account has been deactivated.', 403);

  req.user = user;
  next();
});

/** Restrict a route to specific roles. Use after `protect`. */
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new AppError('Authentication required.', 401));
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  return next();
};

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}
