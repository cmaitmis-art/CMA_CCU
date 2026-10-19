import React, { useState, useEffect, useRef } from 'react';
import { fetchChatUsers, fetchChatMessages, sendChatMessage, deleteChatMessage, fetchUnreadCounts, markChatRead, fetchUserPreferences, setUserPreference } from '../api';

// Reusing system theme values
const theme = {
  navy: '#1a3a6b',
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#1a1a2e',
  text2: '#5a6478',
  text3: '#94a0b4',
  border: '#e2e8f0',
  blue: '#2563eb',
  green: '#10b981',
  red: '#ef4444',
  lightBlue: '#dbeafe',
};

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('AI'); // 'AI' or 'USERS'
  const [users, setUsers] = useState([]);
  const [unreadMap, setUnreadMap] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [globalTotalBroadcasts, setGlobalTotalBroadcasts] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      if (activeTab === 'AI' || selectedUserId) {
        loadMessages();
      }
    }
  }, [isOpen, activeTab, selectedUserId]);

  // Polling for new messages and unread counts globally (every 5 seconds)
  useEffect(() => {
    let intervalId;
    const pollData = async () => {
      try {
        const unreadData = await fetchUnreadCounts();
        let total = 0;
        const uMap = {};
        if (unreadData && unreadData.unread) {
          unreadData.unread.forEach(item => {
            const sender = item.sender_id === null ? 'ai' : item.sender_id;
            uMap[sender] = parseInt(item.count, 10);
            total += uMap[sender];
          });
        }
        
        // Handle Broadcast Unreads
        if (unreadData && unreadData.totalBroadcasts !== undefined) {
          setGlobalTotalBroadcasts(unreadData.totalBroadcasts);
          const userStr = sessionStorage.getItem('cma_currentUser');
          const user = userStr ? JSON.parse(userStr) : null;
          const userId = user?.username || user?.id || 'anon';
          const prefs = await fetchUserPreferences(userId);
          const savedReads = prefs['cma_chat_broadcast_reads'];
          const localBroadcastReads = parseInt(savedReads || '0', 10);
          
          const unreadBcast = Math.max(0, unreadData.totalBroadcasts - localBroadcastReads);
          uMap['all'] = unreadBcast;
          total += unreadBcast;
        }

        setUnreadMap(uMap);
        setTotalUnread(total);

        if (isOpen && (activeTab === 'AI' || selectedUserId)) {
          await loadMessages(true);
        }
      } catch (err) {
        console.error('Failed to poll chat data', err);
      }
    };

    // Initial poll
    pollData();
    intervalId = setInterval(pollData, 5000);

    return () => clearInterval(intervalId);
  }, [isOpen, activeTab, selectedUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUsers = async () => {
    try {
      const data = await fetchChatUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load chat users', err);
    }
  };

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const targetId = activeTab === 'AI' ? 'ai' : selectedUserId;
      if (!targetId) return;

      // Mark as read when opened
      if (!silent) {
        if (targetId === 'all') {
          const userStr = sessionStorage.getItem('cma_currentUser');
          const user = userStr ? JSON.parse(userStr) : null;
          const userId = user?.username || user?.id || 'anon';
          setUserPreference(userId, 'cma_chat_broadcast_reads', globalTotalBroadcasts.toString()).catch(() => {});
          setUnreadMap(prev => ({ ...prev, all: 0 }));
        } else {
          await markChatRead(targetId);
          setUnreadMap(prev => ({ ...prev, [targetId]: 0 }));
        }
      }

      const data = await fetchChatMessages(targetId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const content = inputValue.trim();
    setInputValue('');
    
    // Optimistic UI update could go here
    try {
      const targetId = activeTab === 'AI' ? 'ai' : selectedUserId;
      await sendChatMessage(targetId, content);
      loadMessages(true);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleDelete = async (msgId) => {
    try {
      await deleteChatMessage(msgId);
      setMessages(messages.filter(m => m.id !== msgId));
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.metadata && msg.metadata.url) {
      return (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>{msg.content}</span>
          <a href={msg.metadata.url} style={{ 
            display: 'inline-block',
            padding: '6px 12px',
            backgroundColor: '#f4f6fb',
            color: theme.navy,
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 12,
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <i className="fas fa-external-link-alt" style={{ marginRight: 6 }}></i>
            {msg.metadata.title || 'Open Link'}
          </a>
        </span>
      );
    }
    return msg.content;
  };

  // Dragging Logic
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, isDragging: false, hasMoved: false });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragRef.current.isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.hasMoved = true;
      }
      setPosition({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy
      });
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    if (isOpen && e.target.closest('button')) return; // Ignore if clicking a button (like close) when open
    
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      isDragging: true,
      hasMoved: false
    };
  };

  const handleIconClick = (e) => {
    if (dragRef.current.hasMoved) {
      dragRef.current.hasMoved = false;
      return;
    }
    setIsOpen(true);
  };

  // Calculate safe window bounds
  let windowRight = 24 - position.x;
  let windowBottom = 24 - position.y;
  if (typeof window !== 'undefined') {
    const minMargin = 24;
    const maxRight = Math.max(minMargin, window.innerWidth - 350 - minMargin);
    const maxBottom = Math.max(minMargin, window.innerHeight - 500 - minMargin);
    windowRight = Math.max(minMargin, Math.min(maxRight, windowRight));
    windowBottom = Math.max(minMargin, Math.min(maxBottom, windowBottom));
  }

  if (!isOpen) {
    return (
      <button 
        onClick={handleIconClick}
        onMouseDown={handleMouseDown}
        title="Open Chat"
        className={totalUnread > 0 ? 'chat-icon-shake' : ''}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          transform: `translate(${position.x}px, ${position.y}px)`,
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: theme.navy,
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          cursor: dragRef.current.isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 24,
          zIndex: 9999,
          transition: dragRef.current.isDragging ? 'none' : 'background-color 0.2s',
        }}
      >
        <i className="fas fa-comment-dots"></i>
        {totalUnread > 0 && (
          <div style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: theme.red,
            color: 'white',
            borderRadius: '50%',
            width: 24,
            height: 24,
            fontSize: 12,
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '2px solid white'
          }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </div>
        )}
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: windowBottom,
      right: windowRight,
      width: 350,
      height: 500,
      backgroundColor: theme.card,
      borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999,
      overflow: 'hidden',
      border: `1px solid ${theme.border}`
    }}>
      {/* Header */}
      <div 
        onMouseDown={handleMouseDown}
        style={{
        padding: '12px 16px',
        backgroundColor: theme.navy,
        color: 'white',
        cursor: 'grab',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>
          <i className="fas fa-robot" style={{ marginRight: 8 }}></i>
          Chat Assistant
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}` }}>
        <button
          onClick={() => { setActiveTab('AI'); setSelectedUserId(null); markChatRead('ai'); setUnreadMap(prev => ({...prev, ai: 0})); }}
          style={{
            flex: 1, padding: '10px 0', border: 'none', background: activeTab === 'AI' ? theme.lightBlue : 'transparent',
            color: activeTab === 'AI' ? theme.navy : theme.text2, fontWeight: activeTab === 'AI' ? 700 : 500,
            cursor: 'pointer', borderBottom: activeTab === 'AI' ? `2px solid ${theme.blue}` : 'none',
            position: 'relative'
          }}
        >
          AI Assistant
          {unreadMap['ai'] > 0 && (
            <span style={{ position: 'absolute', top: 6, right: 12, width: 8, height: 8, borderRadius: '50%', background: theme.red }}></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('USERS')}
          style={{
            flex: 1, padding: '10px 0', border: 'none', background: activeTab === 'USERS' ? theme.lightBlue : 'transparent',
            color: activeTab === 'USERS' ? theme.navy : theme.text2, fontWeight: activeTab === 'USERS' ? 700 : 500,
            cursor: 'pointer', borderBottom: activeTab === 'USERS' ? `2px solid ${theme.blue}` : 'none'
          }}
        >
          Colleagues
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* USERS LIST MODE */}
        {activeTab === 'USERS' && !selectedUserId && (
          <div style={{ flex: 1, padding: 8 }}>
            {/* Broadcast Option */}
            <div 
              onClick={() => { 
                setSelectedUserId('all'); 
                const userStr = sessionStorage.getItem('cma_currentUser');
                const user = userStr ? JSON.parse(userStr) : null;
                const userId = user?.username || user?.id || 'anon';
                setUserPreference(userId, 'cma_chat_broadcast_reads', globalTotalBroadcasts.toString()).catch(() => {});
                setUnreadMap(prev => ({...prev, all: 0})); 
              }}
              style={{
                display: 'flex', alignItems: 'center', padding: '12px 10px',
                borderBottom: `1px solid ${theme.border}`, cursor: 'pointer',
                transition: 'background 0.2s', backgroundColor: '#f0fdf4'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', backgroundColor: theme.green, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: 12
              }}>
                <i className="fas fa-bullhorn"></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: theme.text, fontSize: 14 }}>All Colleagues</div>
                <div style={{ fontSize: 12, color: theme.text2 }}>Broadcast message</div>
              </div>
              {unreadMap['all'] > 0 && (
                <div style={{
                  backgroundColor: theme.red, color: 'white', borderRadius: 12,
                  padding: '2px 8px', fontSize: 11, fontWeight: 'bold'
                }}>
                  {unreadMap['all']}
                </div>
              )}
            </div>

            {users.length === 0 ? (
              <div style={{ textAlign: 'center', color: theme.text3, marginTop: 20 }}>No colleagues found.</div>
            ) : (
              users.map(u => (
                <div 
                  key={u.id}
                  onClick={() => { setSelectedUserId(u.id); markChatRead(u.id); setUnreadMap(prev => ({...prev, [u.id]: 0})); }}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '12px 10px',
                    borderBottom: `1px solid ${theme.border}`, cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', backgroundColor: theme.navy, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: 12,
                    overflow: 'hidden'
                  }}>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      u.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: theme.text, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: theme.text2 }}>{u.department || u.role}</div>
                  </div>
                  {unreadMap[u.id] > 0 && (
                    <div style={{
                      backgroundColor: theme.red, color: 'white', borderRadius: 12,
                      padding: '2px 8px', fontSize: 11, fontWeight: 'bold'
                    }}>
                      {unreadMap[u.id]}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* CHAT MODE */}
        {(activeTab === 'AI' || selectedUserId) && (
          <>
            {activeTab === 'USERS' && selectedUserId && (
              <div style={{
                padding: '8px 12px', background: theme.bg, borderBottom: `1px solid ${theme.border}`,
                display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 500, color: theme.text2
              }}>
                <button 
                  onClick={() => setSelectedUserId(null)} 
                  style={{ background: 'none', border: 'none', color: theme.blue, cursor: 'pointer', marginRight: 8 }}
                >
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                Chatting with {selectedUserId === 'all' ? 'Everyone' : (users.find(u => u.id === selectedUserId)?.name || 'User')}
              </div>
            )}
            
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading && messages.length === 0 && (
                <div style={{ textAlign: 'center', color: theme.text3 }}>Loading messages...</div>
              )}
              {!loading && messages.length === 0 && (
                <div style={{ textAlign: 'center', color: theme.text3, fontSize: 13, marginTop: 20 }}>
                  Start a conversation!
                </div>
              )}
              
              {messages.map(msg => {
                // If it's AI chat, AI messages have message_type = 'ai' and receiver = null
                // If direct chat, it depends if current user is sender
                
                // Let's rely on message_type for AI, and sender_id for normal users
                let isMe = false;
                let senderName = msg.Sender ? msg.Sender.name : 'Unknown';
                let senderAvatar = msg.Sender?.avatar_url || null;

                const currentUserString = sessionStorage.getItem('cma_currentUser');
                if (currentUserString) {
                  try {
                    const cu = JSON.parse(currentUserString);
                    if (msg.sender_id === cu.id && msg.message_type !== 'ai') isMe = true;
                    if (msg.message_type === 'ai') isMe = false;
                  } catch(e){}
                }

                return (
                  <div key={msg.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}>
                    {!isMe && msg.message_type !== 'ai' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, marginLeft: 4 }}>
                        {senderAvatar ? (
                          <img src={senderAvatar} alt={senderName} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: theme.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 'bold' }}>
                            {senderName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: 11, color: theme.text2 }}>{senderName}</span>
                      </div>
                    )}
                    <div className="chat-bubble-container" style={{
                      position: 'relative',
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: 12,
                      backgroundColor: isMe ? theme.blue : '#e5e7eb',
                      color: isMe ? '#fff' : theme.text,
                      fontSize: 14,
                      lineHeight: '1.4'
                    }}>
                      {renderMessageContent(msg)}
                      
                      <button 
                        onClick={() => handleDelete(msg.id)}
                        className="chat-delete-btn"
                        title="Delete for me"
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: isMe ? 'auto' : -8,
                          left: isMe ? -8 : 'auto',
                          background: theme.red,
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 20, height: 20,
                          fontSize: 10,
                          cursor: 'pointer',
                          display: 'none' // Handled via CSS hover
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div style={{ fontSize: 10, color: theme.text3, marginTop: 4 }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            <form onSubmit={handleSend} style={{
              padding: 12, borderTop: `1px solid ${theme.border}`, display: 'flex', gap: 8, backgroundColor: '#fff'
            }}>
              <input 
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Type a message..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 20, border: `1px solid ${theme.border}`,
                  outline: 'none', fontSize: 14
                }}
              />
              <button 
                type="submit" 
                disabled={!inputValue.trim()}
                style={{
                  background: theme.navy, color: '#fff', border: 'none', borderRadius: '50%',
                  width: 36, height: 36, display: 'flex', justifyContent: 'center', alignItems: 'center',
                  cursor: inputValue.trim() ? 'pointer' : 'not-allowed', opacity: inputValue.trim() ? 1 : 0.6
                }}
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        .chat-bubble-container:hover .chat-delete-btn {
          display: flex !important;
          align-items: center;
          justify-content: center;
        }
        @keyframes shakeNotification {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(15deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(5deg); }
          60% { transform: rotate(-5deg); }
          75% { transform: rotate(2deg); }
        }
        .chat-icon-shake {
          animation: shakeNotification 1s ease 3;
        }
      `}</style>
    </div>
  );
}
