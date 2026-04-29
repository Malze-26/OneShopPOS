import { Request, Response } from 'express';
import Notification, { INotification, NotificationEvent } from '../models/Notification';

export const createNotification = async (
  type: NotificationEvent,
  title: string,
  message: string,
  tenantId?: string,
  tenantName?: string
): Promise<void> => {
  await Notification.create({ type, title, message, tenantId, tenantName });
};

export const getAllNotifications = async (_req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ read: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: (error as Error).message });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: (error as Error).message });
  }
};

export const markAllAsRead = async (_req: Request, res: Response): Promise<void> => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: (error as Error).message });
  }
};
