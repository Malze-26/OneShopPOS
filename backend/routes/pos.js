const express = require('express');
const router = express.Router();

// Mock database for products
const products = [
  { id: "p01", name: "Flat White", price: 18.50, category: "coffee", emoji: "☕" },
  { id: "p02", name: "Americano", price: 12.00, category: "coffee", emoji: "☕" },
  { id: "p03", name: "Croissant", price: 4.25, category: "pastry", emoji: "🥐" },
  { id: "p04", name: "Egg Toast", price: 2.50, category: "food", emoji: "🍳" },
  { id: "p05", name: "Blueberry Muffin", price: 3.75, category: "pastry", emoji: "🧁" },
  { id: "p06", name: "Iced Latte", price: 4.95, category: "coffee", emoji: "🥤" },
  { id: "p07", name: "Matcha Latte", price: 5.50, category: "drinks", emoji: "🍵" },
  { id: "p08", name: "Cold Brew", price: 6.00, category: "drinks", emoji: "🧊" },
  { id: "p09", name: "Takeaway Cup (L)", price: 1.00, category: "merch", emoji: "🛍️" },
  { id: "p10", name: "Avocado Toast", price: 12.50, category: "food", emoji: "🥑" },
  { id: "p11", name: "Banana Bread", price: 4.50, category: "pastry", emoji: "🍞" },
  { id: "p12", name: "Cappuccino", price: 4.80, category: "coffee", emoji: "☕" },
];

const categories = [
  { id: "all", name: "All" },
  { id: "coffee", name: "Coffee" },
  { id: "food", name: "Food" },
  { id: "pastry", name: "Pastry" },
  { id: "drinks", name: "Cold Drinks" },
  { id: "merch", name: "Merch" },
];

// Mock database for customers
let customers = [
  { id: "c01", name: "Alex Turner", email: "alex@mail.com", pts: 240 },
  { id: "c02", name: "Priya Sharma", email: "priya@mail.com", pts: 80 },
  { id: "c03", name: "James Wick", email: "james@mail.com", pts: 510 },
];

// Mock database for orders
let orders = [];

// Get all products
router.get('/products', (req, res) => {
  res.json({ success: true, data: products });
});

// Get products by category
router.get('/products/category/:categoryId', (req, res) => {
  const { categoryId } = req.params;
  
  if (categoryId === 'all') {
    return res.json({ success: true, data: products });
  }
  
  const filtered = products.filter(p => p.category === categoryId);
  res.json({ success: true, data: filtered });
});

// Get single product
router.get('/products/:productId', (req, res) => {
  const product = products.find(p => p.id === req.params.productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, data: product });
});

// Get all categories
router.get('/categories', (req, res) => {
  res.json({ success: true, data: categories });
});

// Get all customers
router.get('/customers', (req, res) => {
  res.json({ success: true, data: customers });
});

// Get single customer
router.get('/customers/:customerId', (req, res) => {
  const customer = customers.find(c => c.id === req.params.customerId);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }
  res.json({ success: true, data: customer });
});

// Add new customer
router.post('/customers', (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }
    
    // Check if customer already exists
    if (customers.find(c => c.email === email)) {
      return res.status(400).json({ success: false, message: 'Customer already exists' });
    }
    
    const newCustomer = {
      id: "c" + (customers.length + 1).toString().padStart(2, '0'),
      name,
      email,
      pts: 0
    };
    
    customers.push(newCustomer);
    res.status(201).json({ success: true, data: newCustomer, message: 'Customer created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update customer points
router.put('/customers/:customerId', (req, res) => {
  try {
    const { customerId } = req.params;
    const { pts } = req.body;
    
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    if (pts !== undefined) {
      customer.pts = pts;
    }
    
    res.json({ success: true, data: customer, message: 'Customer updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create order
router.post('/orders', (req, res) => {
  try {
    const { items, customer, total, method, subTotal, discount, tax } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must have items' });
    }
    
    const newOrder = {
      id: "ord" + Date.now(),
      items,
      customer,
      total,
      subTotal,
      discount,
      tax,
      method,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    
    orders.push(newOrder);
    res.status(201).json({ success: true, data: newOrder, message: 'Order created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all orders
router.get('/orders', (req, res) => {
  res.json({ success: true, data: orders });
});

// Get single order
router.get('/orders/:orderId', (req, res) => {
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

// Get sales summary
router.get('/reports/summary', (req, res) => {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  res.json({
    success: true,
    data: {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      totalCustomers: customers.length
    }
  });
});

// Get daily sales
router.get('/reports/daily', (req, res) => {
  const dailySales = {};
  
  orders.forEach(order => {
    const date = new Date(order.timestamp).toLocaleDateString();
    if (!dailySales[date]) {
      dailySales[date] = { date, sales: 0, orders: 0 };
    }
    dailySales[date].sales += order.total;
    dailySales[date].orders += 1;
  });
  
  res.json({ success: true, data: Object.values(dailySales) });
});

module.exports = router;
