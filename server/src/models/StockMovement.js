import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    // Snapshots keep history readable even if the product is renamed/deleted.
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    type: {
      type: String,
      enum: ['IN', 'OUT', 'ADJUST'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
    },
    previousQty: { type: Number, required: true },
    newQty: { type: Number, required: true },
    reason: {
      type: String,
      enum: ['purchase', 'sale', 'return', 'damage', 'transfer', 'correction', 'other'],
      default: 'other',
    },
    reference: { type: String, trim: true, maxlength: 80 },
    note: { type: String, trim: true, maxlength: 300 },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    performedByName: { type: String, default: 'System' },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
