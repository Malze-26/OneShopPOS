import { Router } from 'express';
import { getConversations, getMessages, sendMessage, mockReceiveMessage } from '../controllers/messageController';

const router = Router();

router.get('/conversations', getConversations);
router.get('/:conversationId/messages', getMessages);
router.post('/:conversationId/messages', sendMessage);

// For testing purposes
router.post('/mock-receive', mockReceiveMessage);

export default router;
