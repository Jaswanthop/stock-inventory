import { pathToFileURL } from 'node:url';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { config } from '../config/index.js';
import { connectDB, disconnectDB } from '../config/db.js';

const CATEGORIES = [
  { name: 'Electronics', color: '#6366f1', description: 'Devices, peripherals and accessories' },
  { name: 'Office Supplies', color: '#0ea5e9', description: 'Everyday consumables for the office' },
  { name: 'Furniture', color: '#f59e0b', description: 'Desks, chairs and storage' },
  { name: 'Accessories', color: '#10b981', description: 'Bags, cables and add-ons' },
  { name: 'Cleaning', color: '#ec4899', description: 'Janitorial and hygiene products' },
];

const SUPPLIERS = [
  {
    name: 'Northwind Traders',
    contactName: 'Priya Menon',
    email: 'orders@northwind.example',
    phone: '+1 415 555 0132',
    address: '500 Market Street, San Francisco, CA',
    website: 'https://northwind.example',
  },
  {
    name: 'Acme Wholesale',
    contactName: 'Daniel Osei',
    email: 'sales@acme.example',
    phone: '+1 312 555 0198',
    address: '88 Industrial Way, Chicago, IL',
  },
  {
    name: 'Sunrise Office Co.',
    contactName: 'Mei Lin',
    email: 'hello@sunriseoffice.example',
    phone: '+1 206 555 0144',
    address: '12 Pine Avenue, Seattle, WA',
  },
  {
    name: 'GreenLeaf Supplies',
    contactName: 'Carlos Rivera',
    email: 'support@greenleaf.example',
    phone: '+1 305 555 0177',
    address: '301 Ocean Drive, Miami, FL',
  },
  {
    name: 'Atlas Furniture Group',
    contactName: 'Hannah Weber',
    email: 'b2b@atlasfurniture.example',
    phone: '+1 720 555 0120',
    address: '7 Foundry Road, Denver, CO',
  },
];

// [name, sku, categoryIndex, supplierIndex, quantity, reorderLevel, costPrice, unitPrice, location]
const PRODUCTS = [
  ['Wireless Mouse Pro', 'EL-MO-1001', 0, 0, 64, 15, 18.5, 34.99, 'A1-01'],
  ['Mechanical Keyboard TKL', 'EL-KB-1002', 0, 0, 28, 10, 44, 89.0, 'A1-02'],
  ['27" 4K Monitor', 'EL-MN-1003', 0, 1, 12, 6, 245, 429.0, 'A2-01'],
  ['USB-C Docking Station', 'EL-DK-1004', 0, 1, 7, 8, 96, 179.5, 'A2-02'],
  ['Noise Cancelling Headset', 'EL-HS-1005', 0, 0, 0, 5, 68, 129.0, 'A2-03'],
  ['A4 Copy Paper (500)', 'OS-PP-2001', 1, 2, 240, 60, 4.2, 8.99, 'B1-01'],
  ['Gel Pens — Box of 12', 'OS-PN-2002', 1, 2, 95, 30, 5.1, 11.5, 'B1-02'],
  ['Sticky Notes Pack', 'OS-SN-2003', 1, 2, 18, 25, 2.4, 6.25, 'B1-03'],
  ['Stapler Heavy Duty', 'OS-ST-2004', 1, 2, 34, 10, 7.8, 16.99, 'B2-01'],
  ['Whiteboard Markers', 'OS-WM-2005', 1, 2, 6, 12, 6.0, 13.75, 'B2-02'],
  ['Ergonomic Task Chair', 'FU-CH-3001', 2, 4, 16, 5, 118, 229.0, 'C1-01'],
  ['Standing Desk 140cm', 'FU-DK-3002', 2, 4, 9, 4, 260, 499.0, 'C1-02'],
  ['Filing Cabinet 3-Drawer', 'FU-FC-3003', 2, 4, 3, 4, 145, 269.0, 'C2-01'],
  ['Monitor Stand Riser', 'FU-MS-3004', 2, 1, 22, 8, 21, 44.5, 'C2-02'],
  ['Laptop Backpack 15"', 'AC-BP-4001', 3, 0, 42, 12, 26, 59.99, 'D1-01'],
  ['HDMI Cable 2m', 'AC-HD-4002', 3, 1, 130, 40, 3.9, 9.99, 'D1-02'],
  ['Wireless Charger Pad', 'AC-WC-4003', 3, 0, 11, 15, 14.5, 32.0, 'D1-03'],
  ['Webcam 1080p', 'AC-WC-4004', 3, 1, 5, 8, 38, 79.0, 'D1-04'],
  ['Multi-Surface Cleaner', 'CL-MS-5001', 4, 3, 58, 20, 3.1, 7.5, 'E1-01'],
  ['Microfibre Cloth 10pk', 'CL-MC-5002', 4, 3, 24, 15, 4.4, 10.0, 'E1-02'],
  ['Hand Sanitiser 500ml', 'CL-HS-5003', 4, 3, 0, 10, 2.8, 6.5, 'E1-03'],
  ['Bin Liners 100pk', 'CL-BL-5004', 4, 3, 31, 12, 5.6, 12.25, 'E2-01'],
];

function daysAgo(days, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return date;
}

/** Create the bootstrap administrator only when no user exists (or no admin exists). */
export async function ensureAdmin() {
  const total = await User.estimatedDocumentCount();
  const admins = await User.countDocuments({ role: 'admin' });

  if (admins > 0) return null;

  if (total > 0) {
    // Users exist but none are administrators — promote the oldest account.
    const oldest = await User.findOne().sort({ createdAt: 1 });
    if (oldest) {
      oldest.role = 'admin';
      await oldest.save();
      console.log(`[seed] Promoted ${oldest.email} to administrator`);
      return oldest;
    }
  }

  const admin = await User.create({
    name: config.admin.name,
    email: config.admin.email,
    password: config.admin.password,
    role: 'admin',
  });

  console.log(`[seed] Created administrator ${admin.email}`);
  if (!config.isProduction) {
    console.log(`[seed] Sign in with ${admin.email} / ${config.admin.password}`);
  } else if (config.admin.password === 'Admin@12345') {
    console.warn('[seed] WARNING: the administrator is using the default password. Change it immediately from Settings.');
  }
  return admin;
}

/** Populate demo inventory once, only when the products collection is empty. */
export async function seedDemoData() {
  const existing = await Product.estimatedDocumentCount();
  if (existing > 0) {
    return { seeded: false, reason: 'Products already exist' };
  }

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) throw new Error('Cannot seed demo data without an administrator account');

  const categories = await Category.insertMany(CATEGORIES);
  const suppliers = await Supplier.insertMany(SUPPLIERS);

  const products = [];
  for (const [name, sku, categoryIndex, supplierIndex, quantity, reorderLevel, costPrice, unitPrice, location] of PRODUCTS) {
    const product = await Product.create({
      name,
      sku,
      category: categories[categoryIndex]._id,
      supplier: suppliers[supplierIndex]._id,
      quantity: 0,
      reorderLevel,
      costPrice,
      unitPrice,
      unit: 'pcs',
      location,
      description: `${name} — stocked by ${suppliers[supplierIndex].name}.`,
    });
    products.push({ product, quantity });
  }

  const movements = [];
  products.forEach(({ product, quantity }, index) => {
    const sold = quantity === 0 ? 6 : Math.min(quantity, 3 + (index % 7));
    const counted = index % 5 === 0 && quantity >= 2;
    const shrink = counted ? 2 : 0;
    const received = quantity + sold - shrink;
    const receivedDay = 6 - (index % 3);
    const soldDay = index % 2 === 0 ? 0 : Math.max(1, receivedDay - 1);
    const adjustDay = Math.max(0, soldDay - 2);

    movements.push({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      type: 'IN',
      quantity: received,
      previousQty: 0,
      newQty: received,
      reason: 'purchase',
      reference: `PO-${2400 + index}`,
      note: 'Opening stock received from supplier',
      performedBy: admin._id,
      performedByName: admin.name,
      createdAt: daysAgo(receivedDay, 9),
      updatedAt: daysAgo(receivedDay, 9),
    });

    movements.push({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      type: 'OUT',
      quantity: sold,
      previousQty: received,
      newQty: quantity - shrink,
      reason: 'sale',
      reference: `SO-${8100 + index}`,
      note: 'Fulfilled customer order',
      performedBy: admin._id,
      performedByName: admin.name,
      createdAt: daysAgo(soldDay, 14),
      updatedAt: daysAgo(soldDay, 14),
    });

    if (counted) {
      movements.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        type: 'ADJUST',
        quantity,
        previousQty: quantity - shrink,
        newQty: quantity,
        reason: 'correction',
        reference: `COUNT-${700 + index}`,
        note: 'Cycle count found two extra units',
        performedBy: admin._id,
        performedByName: admin.name,
        createdAt: daysAgo(adjustDay, 17),
        updatedAt: daysAgo(adjustDay, 17),
      });
    }
  });

  await StockMovement.insertMany(movements);

  // Products were created with zero stock; set the final quantities after the
  // movement history is in place so the ledger and stock levels agree.
  await Promise.all(
    products.map(({ product, quantity }) =>
      Product.updateOne({ _id: product._id }, { $set: { quantity } })
    )
  );

  console.log(
    `[seed] Demo data loaded: ${categories.length} categories, ${suppliers.length} suppliers, ${products.length} products, ${movements.length} movements`
  );

  return { seeded: true, products: products.length, movements: movements.length };
}

export async function resetAndSeed() {
  await Promise.all([
    StockMovement.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Supplier.deleteMany({}),
  ]);
  await ensureAdmin();
  return seedDemoData();
}

async function cli() {
  const wantsDemo = process.argv.includes('--demo');
  const wantsReset = process.argv.includes('--reset');

  await connectDB();
  try {
    await ensureAdmin();
    if (wantsDemo || wantsReset) {
      if (wantsReset) {
        console.log('[seed] Clearing inventory collections...');
        await Promise.all([StockMovement.deleteMany({}), Product.deleteMany({}), Category.deleteMany({}), Supplier.deleteMany({})]);
      }
      await seedDemoData();
    } else {
      console.log('[seed] Admin account is ready. Pass --demo to also load sample inventory.');
    }
  } finally {
    await disconnectDB();
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  cli().catch((error) => {
    console.error('[seed] Failed:', error.message);
    process.exit(1);
  });
}
