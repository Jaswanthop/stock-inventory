import { Router } from 'express';
import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { authorize, protect } from '../middleware/auth.js';
import { requireFields } from '../utils/query.js';

const router = Router();
router.use(protect);

async function productStats() {
  const rows = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        products: { $sum: 1 },
        units: { $sum: '$quantity' },
        value: { $sum: { $multiply: ['$quantity', { $ifNull: ['$costPrice', 0] }] } },
      },
    },
  ]);
  return new Map(rows.map((row) => [String(row._id), row]));
}

/** GET /api/categories */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [categories, stats] = await Promise.all([
      Category.find().sort({ name: 1 }),
      productStats(),
    ]);

    res.json({
      items: categories.map((category) => {
        const stat = stats.get(String(category._id));
        return {
          ...category.toJSON(),
          productCount: stat?.products || 0,
          totalUnits: stat?.units || 0,
          stockValue: Number((stat?.value || 0).toFixed(2)),
        };
      }),
    });
  })
);

/** POST /api/categories */
router.post(
  '/',
  authorize('admin', 'manager'),
  asyncHandler(async (req, res) => {
    requireFields(req.body || {}, ['name']);
    const category = await Category.create({
      name: String(req.body.name).trim(),
      description: req.body.description || '',
      color: req.body.color || '#6366f1',
    });
    res.status(201).json({ category, message: 'Category created successfully' });
  })
);

/** PUT /api/categories/:id */
router.put(
  '/:id',
  authorize('admin', 'manager'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid category id', 400);
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError('Category not found', 404);

    if (req.body.name !== undefined) category.name = String(req.body.name).trim();
    if (req.body.description !== undefined) category.description = req.body.description;
    if (req.body.color !== undefined) category.color = req.body.color;

    await category.save();
    res.json({ category, message: 'Category updated successfully' });
  })
);

/** DELETE /api/categories/:id?force=true */
router.delete(
  '/:id',
  authorize('admin', 'manager'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid category id', 400);
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError('Category not found', 404);

    const productCount = await Product.countDocuments({ category: category._id, isActive: true });
    if (productCount > 0 && req.query.force !== 'true') {
      throw new AppError(
        `This category is used by ${productCount} product${productCount === 1 ? '' : 's'}. Move them first or confirm removal.`,
        409
      );
    }

    await Product.updateMany({ category: category._id }, { $set: { category: null } });
    await category.deleteOne();

    res.json({ message: 'Category deleted successfully' });
  })
);

export default router;
