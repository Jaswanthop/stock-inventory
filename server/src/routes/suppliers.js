import { Router } from 'express';
import mongoose from 'mongoose';
import { Supplier } from '../models/Supplier.js';
import { Product } from '../models/Product.js';
import { AppError, asyncHandler } from '../middleware/error.js';
import { authorize, protect } from '../middleware/auth.js';
import { escapeRegex, requireFields } from '../utils/query.js';

const router = Router();
router.use(protect);

/** GET /api/suppliers */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
      filter.$or = [{ name: rx }, { contactName: rx }, { email: rx }, { phone: rx }];
    }

    const [suppliers, counts] = await Promise.all([
      Supplier.find(filter).sort({ name: 1 }),
      Product.aggregate([
        { $match: { isActive: true, supplier: { $ne: null } } },
        { $group: { _id: '$supplier', products: { $sum: 1 }, units: { $sum: '$quantity' } } },
      ]),
    ]);

    const countMap = new Map(counts.map((row) => [String(row._id), row]));

    res.json({
      items: suppliers.map((supplier) => {
        const stat = countMap.get(String(supplier._id));
        return {
          ...supplier.toJSON(),
          productCount: stat?.products || 0,
          totalUnits: stat?.units || 0,
        };
      }),
    });
  })
);

/** POST /api/suppliers */
router.post(
  '/',
  authorize('admin', 'manager'),
  asyncHandler(async (req, res) => {
    requireFields(req.body || {}, ['name']);
    const supplier = await Supplier.create({
      name: String(req.body.name).trim(),
      contactName: req.body.contactName || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      address: req.body.address || '',
      website: req.body.website || '',
      notes: req.body.notes || '',
    });
    res.status(201).json({ supplier, message: 'Supplier created successfully' });
  })
);

/** PUT /api/suppliers/:id */
router.put(
  '/:id',
  authorize('admin', 'manager'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid supplier id', 400);
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) throw new AppError('Supplier not found', 404);

    const fields = ['name', 'contactName', 'email', 'phone', 'address', 'website', 'notes', 'active'];
    for (const field of fields) {
      if (req.body[field] !== undefined) supplier[field] = req.body[field];
    }

    await supplier.save();
    res.json({ supplier, message: 'Supplier updated successfully' });
  })
);

/** DELETE /api/suppliers/:id */
router.delete(
  '/:id',
  authorize('admin', 'manager'),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid supplier id', 400);
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) throw new AppError('Supplier not found', 404);

    await Product.updateMany({ supplier: supplier._id }, { $set: { supplier: null } });
    await supplier.deleteOne();

    res.json({ message: 'Supplier deleted successfully' });
  })
);

export default router;
