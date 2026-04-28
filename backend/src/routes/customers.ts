import { Router, Request, Response, NextFunction } from 'express';
import { protect, requireRole } from '../middleware/authMiddleware';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  getCustomerOrders,
  recalcCustomerStats,
} from '../controllers/customerController';
import { AuthRequest } from '../types';
import { Customer } from '../models/Customer';

const router = Router();

function asyncHandler(fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(protect);

router.get('/stats', asyncHandler(getCustomerStats));
router.post('/recalc', requireRole('Manager'), asyncHandler(recalcCustomerStats));
router.get('/', asyncHandler(getCustomers));
router.get('/:id/orders', asyncHandler(getCustomerOrders));
router.get('/:id', asyncHandler(getCustomer));
router.post('/', asyncHandler(createCustomer));
router.put('/:id', asyncHandler(updateCustomer));
router.delete('/:id', asyncHandler(deleteCustomer));

// POST /api/customers/:id/redeem-points
router.post('/:id/redeem-points', async (req: Request, res: Response) => {
  try {
    const { points } = req.body;

    if (!points || points <= 0) {
      res.status(400).json({ message: 'Invalid points amount' });
      return;
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    if (customer.loyaltyPoints < points) {
      res.status(400).json({ message: 'Insufficient loyalty points' });
      return;
    }

    customer.loyaltyPoints -= points;
    await customer.save();

    // 1 point = Rs. 1 discount
    res.json({ data: customer, discountAmount: points });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;