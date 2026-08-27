/**
 * Tests for the Notification system.
 * Tests that notifications are created correctly and can be marked as read.
 */

jest.mock('../src/models/Notification', () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  updateMany: jest.fn(),
}));

process.env.MONGODB_URI = 'mongodb://localhost/test';
process.env.JWT_SECRET = 'test_secret';

import { createNotification, getAllNotifications, markAllAsRead } from '../src/controllers/notificationController';
import Notification from '../src/models/Notification';
import { Request, Response } from 'express';

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ─── createNotification ───────────────────────────────────────────────────────

describe('createNotification', () => {

  beforeEach(() => jest.clearAllMocks());

  test('inserts a notification document into the database', async () => {
    (Notification.create as jest.Mock).mockResolvedValue({});

    await createNotification(
      'tenant_created',
      'New Tenant Created',
      'Fashion Hub has been registered.',
      'tenant123',
      'Fashion Hub'
    );

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tenant_created',
        title: 'New Tenant Created',
        message: 'Fashion Hub has been registered.',
        tenantId: 'tenant123',
        tenantName: 'Fashion Hub',
      })
    );
  });

  test('works for tenant_deleted event', async () => {
    (Notification.create as jest.Mock).mockResolvedValue({});

    await createNotification(
      'tenant_deleted',
      'Tenant Deleted',
      'Tech Store has been removed.',
      'tenant456',
      'Tech Store'
    );

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tenant_deleted' })
    );
  });

});

// ─── getAllNotifications ──────────────────────────────────────────────────────

describe('getAllNotifications', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns notifications list and unread count', async () => {
    const fakeNotifications = [
      { _id: 'n1', title: 'Tenant Created', read: false, createdAt: new Date() },
      { _id: 'n2', title: 'Tenant Deleted', read: true, createdAt: new Date() },
    ];

    (Notification.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(fakeNotifications),
      }),
    });
    (Notification.countDocuments as jest.Mock).mockResolvedValue(1); // 1 unread

    const req = {} as Request;
    const res = mockRes();

    await getAllNotifications(req, res as Response);

    const response = (res.json as jest.Mock).mock.calls[0][0];
    expect(response.success).toBe(true);
    expect(response.notifications).toHaveLength(2);
    expect(response.unreadCount).toBe(1);
  });

});

// ─── markAllAsRead ────────────────────────────────────────────────────────────

describe('markAllAsRead', () => {

  test('sets read: true on all unread notifications', async () => {
    (Notification.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 });

    const req = {} as Request;
    const res = mockRes();

    await markAllAsRead(req, res as Response);

    // Should update all where read: false
    expect(Notification.updateMany).toHaveBeenCalledWith(
      { read: false },
      { read: true }
    );

    const response = (res.json as jest.Mock).mock.calls[0][0];
    expect(response.success).toBe(true);
  });

});
