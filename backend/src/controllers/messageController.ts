import { Response } from 'express';
import { AuthRequest } from '../types';

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const { Conversation } = req.models!;
    const storeId = req.user!.storeId;

    const conversations = await Conversation.find({ storeId })
      .populate('customerId', 'name avatar email')
      .sort({ lastMessageAt: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { Conversation, Message } = req.models!;
    const { conversationId } = req.params;
    const storeId = req.user!.storeId;

    const conversation = await Conversation.findOne({ _id: conversationId, storeId });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Mark as read when fetching messages
    if (conversation.unreadCount > 0) {
      conversation.unreadCount = 0;
      await conversation.save();
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { Conversation, Message } = req.models!;
    const { conversationId } = req.params;
    const { content } = req.body;
    const storeId = req.user!.storeId;

    const conversation = await Conversation.findOne({ _id: conversationId, storeId });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = await Message.create({
      conversationId,
      sender: 'store',
      content,
    });

    conversation.lastMessage = content;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Mock receive message (for testing without a storefront)
export const mockReceiveMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { Conversation, Message, Customer } = req.models!;
    const storeId = req.user!.storeId;
    
    // Find or create a conversation with a random customer
    let conversation = await Conversation.findOne({ storeId });
    if (!conversation) {
      const customer = await Customer.findOne({ storeId });
      if (!customer) {
        return res.status(400).json({ error: 'No customers exist to mock a message' });
      }
      conversation = await Conversation.create({
        storeId,
        customerId: customer._id,
        lastMessage: '',
        unreadCount: 0,
      });
    }

    const content = req.body.content || 'Hello, I have a question about my order.';

    const message = await Message.create({
      conversationId: conversation._id,
      sender: 'customer',
      content,
    });

    conversation.lastMessage = content;
    conversation.lastMessageAt = new Date();
    conversation.unreadCount += 1;
    await conversation.save();

    res.status(201).json(message);
  } catch (error) {
    console.error('Error in mock receive message:', error);
    res.status(500).json({ error: 'Failed to receive mock message' });
  }
};
