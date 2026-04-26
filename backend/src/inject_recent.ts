import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const STORE_ID = 'STORE-OPEN-DOOR-001';

async function injectRecentData() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI not set');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected');

  const Transaction = mongoose.connection.collection('transactions');
  const Order = mongoose.connection.collection('orders');
  const Customer = mongoose.connection.collection('customers');

  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const recentOrders = [
    {
      orderId: 'ORD-RECENT-001', source: 'physical',
      customerName: 'Amal Perera', customerEmail: 'amal.perera@gmail.com', customerPhone: '+94 71 234 5678',
      items: [{ productName: 'Carrot 1kg', sku: 'VEG-001', quantity: 2, unitPrice: 180, subtotal: 360 }],
      subtotal: 360, discount: 0, total: 360, status: 'delivered',
      paymentMethod: 'Cash', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: today, updatedAt: today,
    },
    {
      orderId: 'ORD-RECENT-002', source: 'online',
      customerName: 'Amal Perera', customerEmail: 'amal.perera@gmail.com', customerPhone: '+94 71 234 5678',
      items: [{ productName: 'Chicken 1kg', sku: 'MT-001', quantity: 1, unitPrice: 950, subtotal: 950 }],
      subtotal: 950, discount: 0, total: 950, status: 'delivered',
      paymentMethod: 'Online', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: yesterday, updatedAt: yesterday,
    },
    {
      orderId: 'ORD-RECENT-003', source: 'physical',
      customerName: 'dewmini weerapperuma', customerEmail: 'dewminiweerapperuma65@gmail.com', customerPhone: 'N/A',
      items: [{ productName: 'Milk 1L', sku: 'DAI-004', quantity: 1, unitPrice: 350, subtotal: 350 }],
      subtotal: 350, discount: 0, total: 350, status: 'delivered',
      paymentMethod: 'Card', paymentStatus: 'paid', storeId: STORE_ID,
      createdAt: threeDaysAgo, updatedAt: threeDaysAgo,
    }
  ];

  for (const o of recentOrders) {
    await Order.updateOne({ orderId: o.orderId }, { $set: o }, { upsert: true });
    await Transaction.updateOne(
      { orderId: o.orderId },
      { 
        $set: {
          txnId: 'TXN-' + o.orderId,
          orderId: o.orderId,
          customer: o.customerName,
          amount: o.total,
          status: 'success',
          storeId: STORE_ID,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt
        }
      },
      { upsert: true }
    );
  }

  // Ensure customers exist
  await Customer.updateOne(
    { name: 'Amal Perera' },
    { $set: { name: 'Amal Perera', email: 'amal.perera@gmail.com', phone: '+94 71 234 5678', totalOrders: 5, totalSpent: 4500, storeId: STORE_ID } },
    { upsert: true }
  );
  await Customer.updateOne(
    { name: 'dewmini weerapperuma' },
    { $set: { name: 'dewmini weerapperuma', email: 'dewminiweerapperuma65@gmail.com', totalOrders: 2, totalSpent: 1200, storeId: STORE_ID } },
    { upsert: true }
  );

  console.log('Recent data injected');
  await mongoose.disconnect();
}

injectRecentData();
