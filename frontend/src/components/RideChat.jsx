import React, { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

const RideChat = ({ ride, currentUser }) => {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket || !connected) return;

    // Join chat room
    socket.emit('join-chat', ride._id);
    console.log('💬 Joined chat room:', ride._id);

    // Listen for new messages
    socket.on('new-message', (message) => {
      console.log('📨 New message:', message);
      setMessages((prev) => [...prev, message]);
    });

    // Listen for typing indicators
    socket.on('user-typing', ({ userName }) => {
      console.log(`${userName} is typing...`);
    });

    return () => {
      socket.off('new-message');
      socket.off('user-typing');
    };
  }, [socket, connected, ride._id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    const message = {
      rideId: ride._id,
      senderId: currentUser._id,
      senderName: currentUser.name,
      text: newMessage.trim()
    };

    socket.emit('send-message', message);
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Ride Chat
        </h3>
        
        {connected ? (
          <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded-full border border-green-700">
            🟢 Online
          </span>
        ) : (
          <span className="px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded-full border border-red-700">
            🔴 Offline
          </span>
        )}
      </div>

      {/* Messages Container */}
      <div className="bg-gray-800 rounded-lg p-4 h-64 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.senderId === currentUser._id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.senderId === currentUser._id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-200'
                  }`}
                >
                  <div className="text-xs opacity-75 mb-1">{msg.senderName}</div>
                  <div>{msg.text}</div>
                  <div className="text-xs opacity-50 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500"
          disabled={!connected}
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || !connected}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default RideChat;