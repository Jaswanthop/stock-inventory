import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [120, 'Product name cannot exceed 120 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [40, 'SKU cannot exceed 40 characters'],
    },
    description: { type: String, trim: true, maxlength: 500 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    reorderLevel: {
      type: Number,
      min: [0, 'Reorder level cannot be negative'],
      default: 10,
    },
    unitPrice: {
      type: Number,
      min: [0, 'Unit price cannot be negative'],
      default: 0,
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative'],
      default: 0,
    },
    unit: { type: String, trim: true, default: 'pcs', maxlength: 20 },
    location: { type: String, trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** ok | low | out — computed from quantity and reorder level. */
productSchema.virtual('stockStatus').get(function stockStatus() {
  if (this.quantity <= 0) return 'out';
  if (this.quantity <= this.reorderLevel) return 'low';
  return 'ok';
});

productSchema.virtual('stockValue').get(function stockValue() {
  return Number((this.quantity * (this.costPrice || 0)).toFixed(2));
});

productSchema.index({ name: 'text', sku: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ supplier: 1 });

export const Product = mongoose.model('Product', productSchema);
