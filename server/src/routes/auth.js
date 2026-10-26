import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { authorize, protect, signToken } from '../middleware/auth.js';
import { requireFields } from '../utils/query.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again in a few minutes.' },
});

const allowFirstUserOrAdmin = (req, res, next) => {
  User.estimatedDocumentCount()
    .then((count) => {
      if (count === 0) return next();
      return protect(req, res, (err) => {
        if (err) return next(err);
        return authorize('admin')(req, res, next);
      });
    })
    .catch(next);
};

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/** POST /api/auth/login */
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    requireFields(req.body || {}, ['email', 'password']);

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!user.active) throw new AppError('This account has been deactivated.', 403);

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

/**
 * POST /api/auth/register
 * Open only while the database has zero users (first-run bootstrap);
 * afterwards it requires an admin token.
 */
router.post(
  '/register',
  authLimiter,
  allowFirstUserOrAdmin,
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body || {};
    requireFields(req.body || {}, ['name', 'email', 'password']);

    if (String(password).length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    const isFirstUser = (await User.estimatedDocumentCount()) === 0;
    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) throw new AppError('An account with that email already exists', 409);

    const user = await User.create({
      name,
      email,
      password,
      role: isFirstUser ? 'admin' : ['admin', 'manager', 'staff'].includes(role) ? role : 'staff',
    });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

/** GET /api/auth/me */
router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

/** PUT /api/auth/password */
router.put(
  '/password',
  protect,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    requireFields(req.body || {}, ['currentPassword', 'newPassword']);
    if (String(newPassword).length < 8) {
      throw new AppError('New password must be at least 8 characters long', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      throw new AppError('Current password is incorrect', 401);
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  })
);

export default router;
