import { Router } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { protect } from '../middleware/auth.js';
import { escapeRegex, getPagination, requireFields, toNumber } from '../utils/query.js';

const router = Router();
router.use(protect);

const TYPES = ['IN', 'OUT', 'ADJUST'];
const REASONS = ['purchase', 'sale', 'return', 'damage', 'transfer', 'correction', 'other'];

/** GET /api/movements */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 15 });
    const filter = {};

    if (req.query.type && TYPES.includes(req.query.type)) filter.type = req.query.type;

    if (req.query.product && mongoose.isValidObjectId(req.query.product)) {
      filter.product = req.query.product;
    }

    if (req.query.search) {
      const rx = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
      filter.$or = [{ productName: rx }, { sku: rx }, { reference: rx }, { performedByName: rx }];
    }

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    const [items, total] = await Promise.all([
      StockMovement.find(filter)
        .populate('product', 'name sku quantity unit')
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      StockMovement.countDocuments(filter),
    ]);

    res.json({ items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
  })
);

/** POST /api/movements — record stock coming in, going out, or a count correction. */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    requireFields(body, ['productId', 'type']);
    const quantity = toNumber(body.quantity, 'Quantity', { min: 0 });
    const type = String(body.type).toUpperCase();

    if (!TYPES.includes(type)) throw new AppError('Type must be IN, OUT or ADJUST', 400);
    if (!mongoose.isValidObjectId(body.productId)) throw new AppError('Invalid product id', 400);
    if (type !== 'ADJUST' && quantity <= 0) {
      throw new AppError('Quantity must be greater than zero', 400);
    }

    const product = await Product.findById(body.productId);
    if (!product || !product.isActive) throw new AppError('Product not found', 404);

    const reason = REASONS.includes(body.reason) ? body.reason : 'other';
    let updated;
    let previousQty;

    if (type === 'IN') {
      updated = await Product.findOneAndUpdate(
        { _id: product._id, isActive: true },
        { $inc: { quantity } },
        { new: true }
      );
      previousQty = updated.quantity - quantity;
    } else if (type === 'OUT') {
      updated = await Product.findOneAndUpdate(
        { _id: product._id, isActive: true, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true }
      );
      if (!updated) {
        throw new AppError(
          `Insufficient stock. Only ${product.quantity} ${product.unit} of "${product.name}" available.`,
          409
        );
      }
      previousQty = updated.quantity + quantity;
    } else {
      previousQty = product.quantity;
      updated = await Product.findOneAndUpdate(
        { _id: product._id, isActive: true },
        { $set: { quantity } },
        { new: true }
      );
    }

    if (!updated) throw new AppError('Product is no longer available', 404);

    const movement = await StockMovement.create({
      product: updated._id,
      productName: updated.name,
      sku: updated.sku,
      type,
      quantity,
      previousQty,
      newQty: updated.quantity,
      reason,
      reference: body.reference || '',
      note: body.note || '',
      performedBy: req.user._id,
      performedByName: req.user.name,
    });

    await movement.populate('product', 'name sku quantity unit');

    res.status(201).json({
      movement,
      product: updated,
      message: 'Stock movement recorded successfully',
    });
  })
);

/** GET /api/movements/product/:productId */
router.get(
  '/product/:productId',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.productId)) throw new AppError('Invalid product id', 400);

    const items = await StockMovement.find({ product: req.params.productId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ items });
  })
);

export default router;
