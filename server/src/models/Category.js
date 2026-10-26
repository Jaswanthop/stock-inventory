import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      maxlength: [60, 'Category name cannot exceed 60 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [240, 'Description cannot exceed 240 characters'],
    },
    color: {
      type: String,
      default: '#6366f1',
      match: [/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value such as #6366f1'],
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', categorySchema);
