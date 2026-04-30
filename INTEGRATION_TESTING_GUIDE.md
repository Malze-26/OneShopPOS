# OneShopPOS Integration Testing Guide

## 📋 Overview

This document describes the integration tests for the OneShopPOS application, covering both frontend and backend components. These tests ensure that features work correctly across the entire application stack.

## 📁 Test Files

### Frontend Tests

- **`frontend/app/__tests__/integration.test.tsx`** — Main frontend integration tests
  - POS Dashboard Navigation
  - Product CRUD operations
  - Stock management
  - Cart functionality
  - Checkout flow
  - Promo code application

- **`frontend/app/__tests__/payment.integration.test.tsx`** — Payment integration tests
  - Cash payment flow
  - Card payment (PayHere) integration
  - Payment failure scenarios
  - Offline payment handling
  - Discounts and loyalty points

### Backend Tests

- **`backend/src/__tests__/api.integration.test.ts`** — Backend API integration tests
  - Health check
  - Products CRUD
  - Customers CRUD
  - Transactions creation and verification
  - Orders creation
  - Integration scenarios
  - Error handling

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB (for full backend testing)

### Installation

#### Frontend Test Dependencies

```bash
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/user-event @testing-library/jest-dom msw jest-environment-jsdom
```

#### Backend Test Dependencies

```bash
cd backend
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
npm install --save-dev ts-node
```

## 📝 Running Tests

### Run All Tests

```bash
# From project root
npm test
```

### Run Frontend Tests

```bash
cd frontend
npm run test                    # Run once
npm run test:watch             # Watch mode
npm run test -- integration    # Run specific file
npm run test -- --coverage     # With coverage report
```

### Run Backend Tests

```bash
cd backend
npm test                        # Run once
npm test -- --watch           # Watch mode
npm test -- --coverage        # With coverage report
npm test -- api.integration   # Run specific file
```

### Run Specific Test Suite

```bash
cd frontend
npm test -- --testNamePattern="Checkout"

cd backend
npm test -- --testNamePattern="Products API"
```

## 🧪 Test Categories

### 1. Frontend Integration Tests (`integration.test.tsx`)

#### POS Dashboard Navigation (7 tests)

Tests that verify navigation between different pages and components in the POS dashboard.

```bash
npm test -- --testNamePattern="POS Dashboard"
```

**Coverage:**

- Dashboard rendering with product grid and cart sidebar
- Navigation links (Products, Orders, Stocks, Reports)
- TopBar component

#### Product CRUD Operations (9 tests)

Tests for creating, reading, updating, and deleting products.

```bash
npm test -- --testNamePattern="CRUD — Products"
```

**Coverage:**

- Fetch and display product list
- Search/filter products
- Add new product with validation
- Edit existing product
- Delete product with confirmation
- Empty state handling

#### Stock Management (3 tests)

Tests for stock-related operations.

```bash
npm test -- --testNamePattern="CRUD — Stock"
```

**Coverage:**

- Display stock list
- Add new stock entry
- Update stock quantity

#### Shopping Cart Operations (10 tests)

Tests for cart functionality including item management and checkout.

```bash
npm test -- --testNamePattern="CartSidebar"
```

**Coverage:**

- Display cart items with correct totals
- Empty cart state
- Update item quantities
- Clear cart
- Customer selection
- Promo code application
- Error handling

#### Checkout Flow (11 tests)

Tests for the checkout modal and payment process.

```bash
npm test -- --testNamePattern="CheckoutModal"
```

**Coverage:**

- Display checkout summary
- Cash payment method
- Card payment method
- Change calculation
- Offline payment handling
- Payment success confirmation

#### Promo Code Management (9 tests)

Tests for applying and managing promotional codes.

```bash
npm test -- --testNamePattern="PromoModal"
```

**Coverage:**

- Promo input validation
- Apply promo code
- Remove promo code
- Success/error messages
- Loading states
- Discount calculation

### 2. Payment Integration Tests (`payment.integration.test.tsx`)

#### Cash Payment Flow (3 tests)

Tests for cash payment processing.

```bash
npm test -- --testNamePattern="Cash Payment"
```

**Coverage:**

- Display correct total
- Process cash payment
- Confirm payment completion

#### Card Payment (PayHere) Flow (5 tests)

Tests for PayHere card payment integration.

```bash
npm test -- --testNamePattern="Card Payment"
```

**Coverage:**

- Initiate payment with correct amount
- Save pending transaction
- Poll payment status
- Complete payment with reference
- Handle payment response

#### Payment Failure Scenarios (1 test)

Tests for error handling in payment flow.

```bash
npm test -- --testNamePattern="Payment Failure"
```

#### Offline Payment Handling (1 test)

Tests for offline transaction handling.

```bash
npm test -- --testNamePattern="Offline Payment"
```

#### Payment with Discounts (2 tests)

Tests for payment processing with applied discounts.

```bash
npm test -- --testNamePattern="Payment with Discounts"
```

**Coverage:**

- Promo discount application
- Loyalty points redemption

### 3. Backend API Integration Tests (`api.integration.test.ts`)

#### API Health Check (1 test)

Verifies API is running and responding to health checks.

```bash
npm test -- --testNamePattern="API Health"
```

#### Products API (7 tests)

Tests for product endpoints.

```bash
npm test -- --testNamePattern="Products API"
```

**Endpoints:**

- `GET /api/products` — List all products
- `GET /api/products/:id` — Get single product
- `POST /api/products` — Create product
- `PUT /api/products/:id` — Update product
- `DELETE /api/products/:id` — Delete product

**Coverage:**

- Successful CRUD operations
- Validation error handling
- 404 Not Found responses
- Authorization checks

#### Customers API (4 tests)

Tests for customer endpoints.

```bash
npm test -- --testNamePattern="Customers API"
```

**Endpoints:**

- `GET /api/customers` — List all customers
- `GET /api/customers/:id` — Get single customer
- `POST /api/customers` — Create customer

**Coverage:**

- Customer creation with validation
- Customer retrieval
- Error handling for missing fields

#### Transactions API (5 tests)

Tests for transaction processing.

```bash
npm test -- --testNamePattern="Transactions API"
```

**Endpoints:**

- `GET /api/transactions` — List transactions
- `POST /api/transactions` — Create transaction

**Coverage:**

- Cash and card transactions
- Discount and loyalty point handling
- Multi-item checkout
- Transaction validation

#### Orders API (2 tests)

Tests for order creation.

```bash
npm test -- --testNamePattern="Orders API"
```

**Endpoints:**

- `POST /api/orders` — Create order

#### Integration Scenarios (3 tests)

Real-world workflow tests combining multiple endpoints.

```bash
npm test -- --testNamePattern="Integration Scenarios"
```

**Scenarios:**

- Complete customer checkout flow
- Product creation and stock update
- Multi-item checkout with discounts

#### Error Handling (2 tests)

Tests for error responses and edge cases.

```bash
npm test -- --testNamePattern="Error Handling"
```

## 📊 Test Coverage

### Current Coverage Targets

- **Lines:** 50%+
- **Functions:** 50%+
- **Branches:** 50%+
- **Statements:** 50%+

### Check Coverage Report

```bash
npm test -- --coverage
npm test -- --coverage --coverageReporters=html
```

This generates an HTML report in `coverage/index.html`.

## 🔍 Debugging Tests

### Enable Debug Output

```bash
# Frontend
DEBUG=* npm test

# Backend
DEBUG=* npm test
```

### Run Single Test File

```bash
npm test path/to/test.test.ts
```

### Run Single Test by Name

```bash
npm test -- --testNamePattern="should create product"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Watch Mode with Debugging

```bash
npm test -- --watch --verbose
```

## 📐 Test Structure

### Frontend Test Pattern

```typescript
describe("Feature Name", () => {
  // Setup
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Individual tests
  test("should perform specific action", async () => {
    // Arrange
    const component = render(<Component {...props} />);

    // Act
    await userEvent.click(screen.getByRole("button"));

    // Assert
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  // Cleanup
  afterEach(() => {
    jest.resetAllMocks();
  });
});
```

### Backend Test Pattern

```typescript
describe("API Endpoint", () => {
  test("should return success response", async () => {
    // Arrange
    const testData = {
      /* ... */
    };

    // Act
    const response = await request(app).post("/api/endpoint").send(testData);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("_id");
  });
});
```

## 🛠️ Common Test Scenarios

### Testing Form Submission

```typescript
test("should submit form with valid data", async () => {
  render(<Form />);
  await userEvent.type(screen.getByLabelText(/name/i), "Test Name");
  await userEvent.click(screen.getByRole("button", { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

### Testing API Calls

```typescript
test("should fetch data from API", async () => {
  const response = await request(app)
    .get("/api/products")
    .set("Authorization", `Bearer ${token}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});
```

### Testing with Mocked Dependencies

```typescript
jest.mock("@/lib/api", () => ({
  post: jest.fn().mockResolvedValue({ data: mockData }),
}));

test("should handle API response", async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText(mockData.name)).toBeInTheDocument();
  });
});
```

## ✅ Pre-Commit Checklist

Before submitting code for review:

```bash
# 1. Run all tests
npm test

# 2. Check coverage
npm test -- --coverage

# 3. Fix any failing tests
# ... fix issues ...

# 4. Run linting
npm run lint

# 5. Build project
npm run build

# 6. Commit with confidence!
git commit -m "feat: add new feature with integration tests"
```

## 📚 Useful Resources

### Testing Libraries Documentation

- [Jest Documentation](https://jestjs.io)
- [React Testing Library](https://testing-library.com/react)
- [Supertest](https://github.com/visionmedia/supertest)
- [Mock Service Worker (MSW)](https://mswjs.io)

### Best Practices

- Write tests that reflect user behavior
- Keep tests focused and readable
- Use descriptive test names
- Avoid testing implementation details
- Mock external dependencies
- Test edge cases and error scenarios

## 🤝 Contributing Tests

When adding new features, please include integration tests:

1. **Identify integration points** — What components/APIs interact?
2. **Create test scenarios** — What user flows should work?
3. **Write tests** — Follow existing patterns
4. **Verify coverage** — Ensure adequate test coverage
5. **Document** — Add comments explaining complex tests

## ❓ Troubleshooting

### Tests Timing Out

```bash
# Increase timeout
npm test -- --testTimeout=20000
```

### Mock Not Working

- Clear cache: `npm test -- --clearCache`
- Check mock path matches import path
- Verify mock setup runs before test

### Database Connection Errors (Backend)

- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in .env
- Use in-memory MongoDB for tests (recommended)

### Module Not Found Errors

- Check tsconfig.json paths
- Clear node_modules: `rm -rf node_modules && npm install`
- Restart test watcher

## 📞 Support

For issues or questions about testing:

1. Check existing test files for examples
2. Review test documentation
3. Consult team members
4. Create GitHub issue if needed

---

**Last Updated:** April 30, 2026
**Test Suite Version:** 1.0.0
**Coverage Status:** 50%+ (Target)
