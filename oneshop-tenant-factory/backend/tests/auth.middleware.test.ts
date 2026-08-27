/**
 * Tests for the auth middleware (protect + authorize).
 * Tests that:
 *  - Requests without a token are rejected
 *  - Requests with a fake/expired token are rejected
 *  - Requests with a valid token are allowed through
 *  - authorize() blocks the wrong role
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Mock the User model so no DB is needed
jest.mock('../src/models/User', () => ({
  findById: jest.fn(),
}));

process.env.JWT_SECRET = 'test_secret_key';
process.env.MONGODB_URI = 'mongodb://localhost/test';

import { protect, authorize } from '../src/middleware/auth';
import User from '../src/models/User';

// Helper: create a real signed JWT for testing
const makeToken = (payload: object) =>
  jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });

// Helper: build a mock Express request
const mockReq = (token?: string): Partial<Request> => ({
  headers: token ? { authorization: `Bearer ${token}` } : {},
});

// Helper: build a mock Express response (captures status + json)
const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

// ─── protect middleware ───────────────────────────────────────────────────────

describe('protect middleware', () => {

  beforeEach(() => jest.clearAllMocks());

  test('rejects request with no token', async () => {
    const req = mockReq(); // no token
    const res = mockRes();

    await protect(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('rejects request with a fake/invalid token', async () => {
    const req = mockReq('this.is.not.a.real.token');
    const res = mockRes();

    await protect(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('allows request with a valid token and attaches user to req', async () => {
    const fakeUser = { _id: 'user123', name: 'Admin', role: 'superadmin' };
    (User.findById as jest.Mock).mockResolvedValue(fakeUser);

    const token = makeToken({ id: 'user123', role: 'superadmin' });
    const req = mockReq(token) as any;
    const res = mockRes();

    await protect(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();        // request proceeds
    expect(req.user).toEqual(fakeUser);         // user attached to request
  });

  test('rejects if user no longer exists in database', async () => {
    (User.findById as jest.Mock).mockResolvedValue(null); // user deleted

    const token = makeToken({ id: 'deleteduser', role: 'superadmin' });
    const req = mockReq(token);
    const res = mockRes();

    await protect(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

});

// ─── authorize middleware ─────────────────────────────────────────────────────

describe('authorize middleware', () => {

  test('allows the correct role through', () => {
    const next = jest.fn();
    const req = { user: { role: 'superadmin' } } as any;
    const res = mockRes();

    authorize('superadmin')(req, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  test('blocks a different role', () => {
    const next = jest.fn();
    const req = { user: { role: 'manager' } } as any;
    const res = mockRes();

    authorize('superadmin')(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

});
