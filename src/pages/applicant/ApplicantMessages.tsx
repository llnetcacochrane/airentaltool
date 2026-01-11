import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  MessageSquare,
  Send,
  Building2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

interface Message {
  id: string;
  business_id: string;
  business_user_id: string;
  sender_type: 'user' | 'manager';
  sender_id: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  read_at: string | null;
  parent_message_id: string | null;
  created_at: string;
  application_id?: string | null;
}

interface Conversation {
  business_id: string;
  business_name: string;
  business_logo: string | null;
  latest_message: string;
  latest_message_at: string;
  unread_count: number;
  messages: Message[];
  application_id?: string; // For application-based messages
}

const POLLING_INTERVAL = 30000; // 30 seconds

export function ApplicantMessages() {
  const { supabaseUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConversations();

    // Set up polling
    pollingRef.current = setInterval(() => {
      loadConversations(true);
    }, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [supabaseUser?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async (silent = false) => {
    if (!supabaseUser?.id || !supabaseUser?.email) return;
    if (!silent) setIsLoading(true);

    try {
      const convos: Conversation[] = [];
      const processedApplicationIds = new Set<string>();

      // Approach 1: Get messages from business_user records
      const { data: businessUsers, error: buError } = await supabase
        .from('business_users')
        .select('id, business_id, businesses(id, business_name, logo_url)')
        .eq('auth_user_id', supabaseUser.id)
        .eq('is_active', true);

      if (!buError && businessUsers) {
        for (const bu of businessUsers) {
          const { data: messages, error: msgError } = await supabase
            .from('business_user_messages')
            .select('*')
            .eq('business_user_id', bu.id)
            .order('created_at', { ascending: true });

          if (!msgError && messages && messages.length > 0) {
            const unreadCount = messages.filter(
              (m) => m.sender_type === 'manager' && !m.is_read
            ).length;

            convos.push({
              business_id: bu.business_id,
              business_name: (bu.businesses as any)?.business_name || 'Unknown Business',
              business_logo: (bu.businesses as any)?.logo_url || null,
              latest_message: messages[messages.length - 1].message,
              latest_message_at: messages[messages.length - 1].created_at,
              unread_count: unreadCount,
              messages: messages,
            });

            // Track application IDs we've already processed
            messages.forEach(m => {
              if (m.application_id) processedApplicationIds.add(m.application_id);
            });
          }
        }
      }

      // Approach 2: Get messages from applications (by email)
      const { data: applications, error: appError } = await supabase
        .from('rental_applications')
        .select('id, organization_id, business_id')
        .eq('applicant_email', supabaseUser.email);

      if (!appError && applications) {
        for (const app of applications) {
          if (processedApplicationIds.has(app.id)) continue;

          // Use business_id if available, fall back to organization_id
          const businessIdKey = app.business_id || app.organization_id;
          if (!businessIdKey) continue;

          const { data: messages, error: msgError } = await supabase
            .from('business_user_messages')
            .select('*')
            .eq('application_id', app.id)
            .order('created_at', { ascending: true });

          if (!msgError && messages && messages.length > 0) {
            // Get business info
            const { data: business } = await supabase
              .from('businesses')
              .select('id, business_name, logo_url')
              .eq('id', businessIdKey)
              .single();

            const unreadCount = messages.filter(
              (m) => m.sender_type === 'manager' && !m.is_read
            ).length;

            // Check if we already have a conversation for this business
            const existingConvo = convos.find(c => c.business_id === businessIdKey);
            if (existingConvo) {
              // Merge messages
              const allMsgs = [...existingConvo.messages, ...messages]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              existingConvo.messages = allMsgs;
              existingConvo.latest_message = allMsgs[allMsgs.length - 1].message;
              existingConvo.latest_message_at = allMsgs[allMsgs.length - 1].created_at;
              existingConvo.unread_count += unreadCount;
              existingConvo.application_id = app.id;
            } else {
              convos.push({
                business_id: businessIdKey,
                business_name: business?.business_name || 'Unknown Business',
                business_logo: business?.logo_url || null,
                latest_message: messages[messages.length - 1].message,
                latest_message_at: messages[messages.length - 1].created_at,
                unread_count: unreadCount,
                messages: messages,
                application_id: app.id,
              });
            }
          }
        }
      }

      // Sort by latest message
      convos.sort(
        (a, b) =>
          new Date(b.latest_message_at).getTime() -
          new Date(a.latest_message_at).getTime()
      );

      setConversations(convos);
      setLastRefresh(new Date());

      // Update selected conversation if it exists
      if (selectedConversation) {
        const updated = convos.find(
          (c) => c.business_id === selectedConversation.business_id
        );
        if (updated) {
          setSelectedConversation(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !supabaseUser?.id) return;

    setIsSending(true);
    try {
      // Try to get the business_user_id for this conversation
      const { data: businessUser } = await supabase
        .from('business_users')
        .select('id')
        .eq('auth_user_id', supabaseUser.id)
        .eq('business_id', selectedConversation.business_id)
        .maybeSingle();

      // Validate we have either a business_user_id or application_id
      const hasBusinessUser = !!businessUser?.id;
      const hasApplicationId = !!selectedConversation.application_id;

      if (!hasBusinessUser && !hasApplicationId) {
        alert('Unable to send message. Please try again or contact support.');
        setIsSending(false);
        return;
      }

      // Build the message insert payload
      const messagePayload: any = {
        business_id: selectedConversation.business_id,
        sender_type: 'user',
        sender_id: supabaseUser.id,
        message: newMessage.trim(),
      };

      // Add business_user_id if we have one
      if (hasBusinessUser) {
        messagePayload.business_user_id = businessUser.id;
      }

      // Add application_id if this conversation is tied to an application
      if (hasApplicationId) {
        messagePayload.application_id = selectedConversation.application_id;
      }

      // Insert the message
      const { error: insertError } = await supabase
        .from('business_user_messages')
        .insert(messagePayload);

      if (insertError) throw insertError;

      setNewMessage('');
      await loadConversations(true);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectConversation = async (convo: Conversation) => {
    setSelectedConversation(convo);

    // Mark unread messages as read
    if (convo.unread_count > 0) {
      const unreadIds = convo.messages
        .filter((m) => m.sender_type === 'manager' && !m.is_read)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('business_user_messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in('id', unreadIds);

        loadConversations(true);
      }
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col bg-gray-50">
      {/* Mobile: Show either list or conversation */}
      <div className="flex-1 flex">
        {/* Conversations List */}
        <div
          className={`w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col ${
            selectedConversation ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* List Header */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              <button
                onClick={() => loadConversations()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No messages yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Messages from property managers will appear here
                </p>
              </div>
            ) : (
              conversations.map((convo) => (
                <button
                  key={convo.business_id}
                  onClick={() => handleSelectConversation(convo)}
                  className={`w-full p-4 border-b border-gray-100 text-left hover:bg-gray-50 transition ${
                    selectedConversation?.business_id === convo.business_id
                      ? 'bg-blue-50'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      {convo.business_logo ? (
                        <img
                          src={convo.business_logo}
                          alt={convo.business_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {convo.business_name}
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatMessageTime(convo.latest_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-0.5">
                        {convo.latest_message}
                      </p>
                    </div>
                    {convo.unread_count > 0 && (
                      <span className="w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {convo.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation View */}
        <div
          className={`flex-1 flex flex-col bg-white ${
            selectedConversation ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  {selectedConversation.business_logo ? (
                    <img
                      src={selectedConversation.business_logo}
                      alt={selectedConversation.business_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">
                    {selectedConversation.business_name}
                  </h2>
                  <p className="text-xs text-gray-500">Property Manager</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.sender_type === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      {msg.subject && (
                        <p
                          className={`text-xs font-medium mb-1 ${
                            msg.sender_type === 'user'
                              ? 'text-blue-100'
                              : 'text-gray-500'
                          }`}
                        >
                          {msg.subject}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender_type === 'user'
                            ? 'text-blue-200'
                            : 'text-gray-400'
                        }`}
                      >
                        {formatMessageTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-4 py-3 border-t border-gray-200 bg-white">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      rows={1}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Empty state when no conversation selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
