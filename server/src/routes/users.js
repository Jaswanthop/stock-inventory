import { Router } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { authorize, protect } from '../middleware/auth.js';
import { requireFields } from '../utils/query.js';

const router = Router();
router.use(protect, authorize('admin'));

const ROLES = ['admin', 'manager', 'staff'];

/** GET /api/users */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await User.find().sort({ createdAt: 1 });
    res.json({ items });
  })
);

/** POST /api/users */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    requireFields(req.body || {}, ['name', 'email', 'password']);
    if (String(req.body.password).length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    const exists = await User.findOne({ email: String(req.body.email).toLowerCase().trim() });
    if (exists) throw new AppError('An account with that email already exists', 409);

    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: ROLES.includes(req.body.role) ? req.body.role : 'staff',
    });

    res.status(201).json({ user, message: 'Team member added successfully' });
  })
);

/** PATCH /api/users/:id */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid user id', 400);

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);

    const isSelf = user._id.equals(req.user._id);

    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.role !== undefined) {
      if (isSelf) throw new AppError('You cannot change your own role', 400);
      if (!ROLES.includes(req.body.role)) throw new AppError('Invalid role', 400);
      user.role = req.body.role;
    }
    if (req.body.active !== undefined) {
      if (isSelf) throw new AppError('You cannot deactivate your own account', 400);
      user.active = Boolean(req.body.active);
    }
    if (req.body.password) {
      if (String(req.body.password).length < 8) {
        throw new AppError('Password must be at least 8 characters long', 400);
      }
      user.password = req.body.password;
    }

    await user.save();
    res.json({ user, message: 'Team member updated successfully' });
  })
);

/** DELETE /api/users/:id */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid user id', 400);
    if (String(req.params.id) === String(req.user._id)) {
      throw new AppError('You cannot delete your own account', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', active: true });
      if (adminCount <= 1) throw new AppError('At least one active administrator is required', 400);
    }

    await user.deleteOne();
    res.json({ message: 'Team member removed successfully' });
  })
);

export default router;
