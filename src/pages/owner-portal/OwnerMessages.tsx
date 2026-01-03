import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Clock,
  Loader2,
  Plus,
} from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  senderType: 'owner' | 'manager' | 'tenant';
  content: string;
  date: string;
  read: boolean;
}

interface Conversation {
  id: string;
  with: string;
  role: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

export function OwnerMessages() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      // For now, show sample data - real implementation would fetch from database
      setConversations([
        {
          id: '1',
          with: 'Property Manager',
          role: 'Property Management Team',
          lastMessage: 'The maintenance request has been completed.',
          lastMessageDate: new Date().toISOString(),
          unreadCount: 0,
        },
      ]);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setSelectedConversation(conversationId);
    // Sample messages
    setMessages([
      {
        id: '1',
        sender: 'Property Manager',
        senderType: 'manager',
        content: 'Hello! I wanted to update you on the recent maintenance at Unit 101.',
        date: new Date(Date.now() - 86400000).toISOString(),
        read: true,
      },
      {
        id: '2',
        sender: 'You',
        senderType: 'owner',
        content: 'Thank you for the update. What was the issue?',
        date: new Date(Date.now() - 82800000).toISOString(),
        read: true,
      },
      {
        id: '3',
        sender: 'Property Manager',
        senderType: 'manager',
        content: 'The HVAC system needed a filter replacement. Everything is working well now.',
        date: new Date(Date.now() - 3600000).toISOString(),
        read: true,
      },
    ]);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: Date.now().toString(),
      sender: 'You',
      senderType: 'owner',
      content: newMessage,
      date: new Date().toISOString(),
      read: true,
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-2xl sm:text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">Communicate with your property manager</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex h-[calc(100%-6rem)] overflow-hidden">
        {/* Conversations List */}
        <div className="w-full md:w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              <Plus size={18} />
              New Message
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadMessages(conv.id)}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition ${
                    selectedConversation === conv.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={20} className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{conv.with}</p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{conv.role}</p>
                      <p className="text-sm text-gray-600 truncate mt-1">{conv.lastMessage}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="hidden md:flex flex-1 flex-col">
          {selectedConversation ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Property Manager</p>
                    <p className="text-sm text-gray-500">Property Management Team</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === 'owner' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-4 ${
                        message.senderType === 'owner'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p>{message.content}</p>
                      <div className={`flex items-center gap-1 mt-2 text-xs ${
                        message.senderType === 'owner' ? 'text-purple-200' : 'text-gray-500'
                      }`}>
                        <Clock size={12} />
                        {new Date(message.date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OwnerMessages;
