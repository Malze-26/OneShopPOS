'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, UserCircle2, MessageSquarePlus, RefreshCw, AlertCircle } from 'lucide-react';
import api from '@/app/lib/api';

interface Customer {
  _id: string;
  name: string;
  email: string;
  avatar: string;
}

interface Conversation {
  _id: string;
  customerId: Customer;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  _id: string;
  sender: 'store' | 'customer';
  content: string;
  createdAt: string;
}

export default function MessageCenterPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
      setLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/${id}/messages`);
      setMessages(res.data);
      
      // Clear unread count locally
      setConversations(prev => prev.map(c => 
        c._id === id ? { ...c, unreadCount: 0 } : c
      ));
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeConversationId) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const res = await api.post(`/messages/${activeConversationId}/messages`, { content });
      setMessages(prev => [...prev, res.data]);
      
      // Update last message in conversation list
      setConversations(prev => prev.map(c => 
        c._id === activeConversationId 
          ? { ...c, lastMessage: content, lastMessageAt: res.data.createdAt } 
          : c
      ));
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const simulateCustomerMessage = async () => {
    try {
      await api.post('/messages/mock-receive', {
        content: `Hi, checking in on my order! (${new Date().toLocaleTimeString()})`
      });
      fetchConversations();
      if (activeConversationId) {
        fetchMessages(activeConversationId);
      }
    } catch (err) {
      alert('Failed to simulate message. Make sure at least one customer exists.');
      console.error(err);
    }
  };

  const activeConv = conversations.find(c => c._id === activeConversationId);

  return (
    <div className="p-6 max-w-[1400px] h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Message Center</h1>
          <p className="text-sm text-[#4a5565] mt-1">Communicate directly with your customers.</p>
        </div>
        <button
          onClick={simulateCustomerMessage}
          className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-all shadow-sm"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Simulate Incoming Msg
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-[#e4e7ec] shadow-sm overflow-hidden flex min-h-0">
        
        {/* Sidebar: Conversations List */}
        <div className="w-1/3 min-w-[300px] max-w-[400px] border-r border-[#e4e7ec] flex flex-col bg-[#f9fafb]">
          <div className="p-4 border-b border-[#e4e7ec] bg-white flex justify-between items-center">
            <h2 className="font-semibold text-[#101828]">Active Chats</h2>
            <button onClick={fetchConversations} className="p-1.5 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-500 text-sm">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center text-gray-500 h-full">
                <AlertCircle className="w-8 h-8 mb-2 text-gray-300" />
                <p className="text-sm">No active conversations yet.</p>
                <p className="text-xs mt-1">Simulate a message to get started.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#e4e7ec]">
                {conversations.map(conv => (
                  <li 
                    key={conv._id}
                    onClick={() => setActiveConversationId(conv._id)}
                    className={`p-4 cursor-pointer transition-colors border-l-4 ${
                      activeConversationId === conv._id 
                        ? 'bg-white border-[var(--color-primary)]' 
                        : 'hover:bg-white border-transparent'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="relative shrink-0">
                        {conv.customerId?.avatar ? (
                          <img src={conv.customerId.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            <UserCircle2 className="w-6 h-6" />
                          </div>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="text-sm font-semibold text-[#101828] truncate pr-2">
                            {conv.customerId?.name || 'Unknown Customer'}
                          </h3>
                          <span className="text-xs text-gray-500 shrink-0">
                            {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                          {conv.lastMessage || 'Started a conversation'}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Main View: Chat Window */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {activeConversationId ? (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-[#e4e7ec] flex items-center px-6 shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  {activeConv?.customerId?.avatar ? (
                    <img src={activeConv.customerId.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-8 h-8 text-gray-400" />
                  )}
                  <div>
                    <h2 className="text-sm font-bold text-[#101828]">{activeConv?.customerId?.name || 'Customer'}</h2>
                    <p className="text-xs text-gray-500">{activeConv?.customerId?.email}</p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#fcfcfd]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-sm text-gray-500">
                    Loading messages...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => {
                      const isStore = msg.sender === 'store';
                      return (
                        <div key={msg._id || idx} className={`flex ${isStore ? 'justify-end' : 'justify-start'}`}>
                          <div 
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                              isStore 
                                ? 'bg-[var(--color-primary)] text-white rounded-br-sm' 
                                : 'bg-gray-100 text-[#101828] rounded-bl-sm border border-gray-200'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            <p className={`text-[10px] mt-1 text-right ${isStore ? 'text-blue-200' : 'text-gray-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-[#e4e7ec] shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a reply..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-[var(--color-primary)] hover:bg-[#0747a6] text-white rounded-xl px-5 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <MessageSquarePlus className="w-16 h-16 mb-4 text-gray-200" />
              <p className="text-lg font-medium text-gray-600">No conversation selected</p>
              <p className="text-sm mt-1">Select a chat from the sidebar to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
