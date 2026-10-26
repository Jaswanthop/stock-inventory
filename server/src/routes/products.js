import { Router } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { StockMovement } from '../models/StockMovement.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { authorize, protect } from '../middleware/auth.js';
import { escapeRegex, getPagination, getSort, requireFields, toNumber } from '../utils/query.js';

const router = Router();

router.use(protect);

const SORTABLE = ['name', 'sku', 'quantity', 'unitPrice', 'reorderLevel', 'createdAt', 'updatedAt'];

function buildFilter(query) {
  const filter = {};

  if (query.includeInactive !== 'true') filter.isActive = true;

  if (query.search) {
    const rx = new RegExp(escapeRegex(String(query.search).trim()), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { description: rx }, { location: rx }];
  }

  if (query.category) {
    filter.category = query.category === 'none' ? null : query.category;
  }

  if (query.supplier) {
    filter.supplier = query.supplier === 'none' ? null : query.supplier;
  }

  if (query.status === 'out') filter.quantity = { $lte: 0 };
  if (query.status === 'low') {
    filter.$expr = { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$reorderLevel'] }] };
  }
  if (query.status === 'ok') {
    filter.$expr = { $gt: ['$quantity', '$reorderLevel'] };
  }

  return filter;
}

/** GET /api/products */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const filter = buildFilter(req.query);
    const sort = getSort(req.query.sort, SORTABLE);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name color')
        .populate('supplier', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  })
);

/** GET /api/products/summary — lightweight list for selects. */
router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const items = await Product.find({ isActive: true })
      .select('name sku quantity unit reorderLevel unitPrice')
      .sort({ name: 1 })
      .limit(500);
    res.json({ items });
  })
);

/** GET /api/products/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid product id', 400);

    const product = await Product.findById(req.params.id)
      .populate('category', 'name color')
      .populate('supplier', 'name email phone');

    if (!product) throw new AppError('Product not found', 404);

    const recentMovements = await StockMovement.find({ product: product._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ product, recentMovements });
  })
);

/** POST /api/products (admin, manager) */
router.post(
  '/',
  authorize('admin', 'manager'),
  asyncHandler(async (req, res) => {
    requireFields(req.body || {}, ['name', 'sku']);
    const body = req.body;

    const payload = {
      name: String(body.name).trim(),
      sku: String(body.sku).trim().toUpperCase(),
      description: body.description || '',
      category: body.category || null,
      supplier: body.supplier || null,
      quantity: toNumber(body.quantity, 'Quantity', { fallback: 0 }),
      reorderLevel: toNumber(body.reorderLevel, 'Reorder level', { fallback: 10 }),
      unitPrice: toNumber(body.unitPrice, 'Unit price', { fallback: 0 }),
      costPrice: toNumber(body.costPrice, 'Cost price', { fallback: 0 }),
      unit: body.unit || 'pcs',
      location: body.location || '',
    };

    if (payload.category && !(await Category.exists({ _id: payload.category }))) {
      throw new AppError('Selected category does not exist', 400);
    }
    if (payload.supplier && !(await Supplier.exists({ _id: payload.supplier }))) {
      throw new AppError('Selected supplier does not exist', 400);
    }

    const product = await Product.create(payload);

    if (payload.quantity > 0) {
      await StockMovement.create({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        type: 'IN',
        quantity: payload.quantity,
        previousQty: 0,
        newQty: payload.quantity,
        reason: 'correction',
        reference: 'Opening stock',
        note: 'Initial stock recorded when the product was created',
        performedBy: req.user._id,
        performedByName: req.user.name,
      });
    }

    await product.populate([
      { path: 'category', select: 'name color' },
      { path: 'supplier', select: 'name' },
    ]);

    res.status(201).json({ product, message: 'Product created successfully' });
  })
);

/** PUT /api/products/:id (admin, manager) */
router.put(
  '/:id',
  authorize('admin', 'manager'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid product id', 400);

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    const body = req.body || {};
    const updates = {};

    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.sku !== undefined) updates.sku = String(body.sku).trim().toUpperCase();
    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) updates.category = body.category || null;
    if (body.supplier !== undefined) updates.supplier = body.supplier || null;
    if (body.quantity !== undefined) {
      throw new AppError('Use the stock movements endpoint to change quantity', 400);
    }
    if (body.reorderLevel !== undefined) updates.reorderLevel = toNumber(body.reorderLevel, 'Reorder level');
    if (body.unitPrice !== undefined) updates.unitPrice = toNumber(body.unitPrice, 'Unit price');
    if (body.costPrice !== undefined) updates.costPrice = toNumber(body.costPrice, 'Cost price');
    if (body.unit !== undefined) updates.unit = body.unit;
    if (body.location !== undefined) updates.location = body.location;
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    if (updates.category && !(await Category.exists({ _id: updates.category }))) {
      throw new AppError('Selected category does not exist', 400);
    }
    if (updates.supplier && !(await Supplier.exists({ _id: updates.supplier }))) {
      throw new AppError('Selected supplier does not exist', 400);
    }

    Object.assign(product, updates);
    await product.save();

    await product.populate([
      { path: 'category', select: 'name color' },
      { path: 'supplier', select: 'name' },
    ]);

    res.json({ product, message: 'Product updated successfully' });
  })
);

/** DELETE /api/products/:id (admin) */
router.delete(
  '/:id',
  authorize('admin'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid product id', 400);

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    // Keep the audit trail; snapshots on each movement retain name/SKU.
    await StockMovement.updateMany({ product: product._id }, { $unset: { product: '' } });

    res.json({ message: `"${product.name}" was deleted` });
  })
);

export default router;
