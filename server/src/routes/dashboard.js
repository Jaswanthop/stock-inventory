import { Router } from 'express';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { StockMovement } from '../models/StockMovement.js';
import { asyncHandler } from '../middleware/error.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const round = (value) => Number((value || 0).toFixed(2));

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** GET /api/dashboard */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const since = startOfDay(new Date());
    since.setDate(since.getDate() - 6);

    const [summaryRows, trendRows, categoryBreakdown, topProducts, lowStock, recentMovements, categories, suppliers] =
      await Promise.all([
        Product.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: null,
              products: { $sum: 1 },
              units: { $sum: '$quantity' },
              stockValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$costPrice', 0] }] } },
              retailValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$unitPrice', 0] }] } },
              lowStock: {
                $sum: {
                  $cond: [
                    { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$reorderLevel'] }] },
                    1,
                    0,
                  ],
                },
              },
              outOfStock: { $sum: { $cond: [{ $lte: ['$quantity', 0] }, 1, 0] } },
            },
          },
        ]),
        StockMovement.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                type: '$type',
              },
              total: { $sum: '$quantity' },
              count: { $sum: 1 },
            },
          },
        ]),
        Product.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: '$category',
              units: { $sum: '$quantity' },
              value: { $sum: { $multiply: ['$quantity', { $ifNull: ['$costPrice', 0] }] } },
              products: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'categories',
              localField: '_id',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              name: { $ifNull: ['$category.name', 'Uncategorised'] },
              color: { $ifNull: ['$category.color', '#94a3b8'] },
              units: 1,
              value: 1,
              products: 1,
            },
          },
          { $sort: { value: -1 } },
          { $limit: 8 },
        ]),
        Product.aggregate([
          { $match: { isActive: true } },
          {
            $set: {
              stockValue: { $multiply: ['$quantity', { $ifNull: ['$costPrice', 0] }] },
            },
          },
          { $sort: { stockValue: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 1,
              name: 1,
              sku: 1,
              quantity: 1,
              unit: 1,
              reorderLevel: 1,
              stockValue: 1,
            },
          },
        ]),
        Product.find({ isActive: true, $expr: { $lte: ['$quantity', '$reorderLevel'] } })
          .populate('category', 'name color')
          .populate('supplier', 'name')
          .sort({ quantity: 1 })
          .limit(8),
        StockMovement.find()
          .populate('product', 'name sku unit')
          .sort({ createdAt: -1 })
          .limit(8),
        Category.countDocuments(),
        Supplier.countDocuments({ active: true }),
      ]);

    const raw = summaryRows[0] || {};
    const summary = {
      products: raw.products || 0,
      units: raw.units || 0,
      stockValue: round(raw.stockValue),
      retailValue: round(raw.retailValue),
      potentialMargin: round((raw.retailValue || 0) - (raw.stockValue || 0)),
      lowStock: raw.lowStock || 0,
      outOfStock: raw.outOfStock || 0,
      categories,
      suppliers,
    };

    // Build a complete 7-day series, filling days without activity with zeros.
    const trendMap = new Map();
    for (const row of trendRows) {
      const current = trendMap.get(row._id.day) || { in: 0, out: 0, adjustments: 0 };
      if (row._id.type === 'IN') current.in += row.total;
      else if (row._id.type === 'OUT') current.out += row.total;
      else current.adjustments += 1;
      trendMap.set(row._id.day, current);
    }

    const trend = [];
    for (let index = 6; index >= 0; index -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - index);
      const key = day.toISOString().slice(0, 10);
      trend.push({
        date: key,
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        ...(trendMap.get(key) || { in: 0, out: 0, adjustments: 0 }),
      });
    }

    res.json({
      summary,
      trend,
      categoryBreakdown: categoryBreakdown.map((row) => ({
        ...row,
        value: round(row.value),
      })),
      topProducts: topProducts.map((row) => ({ ...row, stockValue: round(row.stockValue) })),
      lowStock,
      recentMovements,
    });
  })
);

export default router;
