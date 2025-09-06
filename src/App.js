import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { 
  Send, 
  Users, 
  Shield, 
  UserMinus, 
  Ban,
  Crown,
  MessageCircle,
  LogOut,
  Eye,
  EyeOff,
  Sparkles,
  Zap
} from 'lucide-react';
import './App.css';

const SOCKET_URL = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showUserList, setShowUserList] = useState(true);
  const [userRole, setUserRole] = useState('user');
  const messagesEndRef = useRef(null);

  const ROOT_MASTER_ID = 'root_master_2024'; // Your unique master ID

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    newSocket.on('userList', (userList) => {
      setUsers(userList);
    });

    newSocket.on('userJoined', (data) => {
      setMessages(prev => [...prev, {
        username: 'System',
        message: `✨ ${data.username} joined the realm`,
        timestamp: new Date(),
        type: 'system'
      }]);
    });

    newSocket.on('userLeft', (data) => {
      setMessages(prev => [...prev, {
        username: 'System',
        message: `👋 ${data.username} left the realm`,
        timestamp: new Date(),
        type: 'system'
      }]);
    });

    newSocket.on('userExpelled', (data) => {
      if (data.username === username) {
        setIsConnected(false);
        setMessages(prev => [...prev, {
          username: 'System',
          message: '⚡ You have been expelled by the Root Master',
          timestamp: new Date(),
          type: 'error'
        }]);
      } else {
        setMessages(prev => [...prev, {
          username: 'System',
          message: `⚡ ${data.username} was expelled by Root Master`,
          timestamp: new Date(),
          type: 'system'
        }]);
      }
    });

    newSocket.on('userBanned', (data) => {
      setMessages(prev => [...prev, {
        username: 'System',
        message: `🔥 ${data.username} was banned by Root Master`,
        timestamp: new Date(),
        type: 'system'
      }]);
    });

    return () => {
      newSocket.close();
    };
  }, [username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const joinRoom = () => {
    if (username && room && socket) {
      const role = username === ROOT_MASTER_ID ? 'root_master' : 'user';
      setUserRole(role);
      
      socket.emit('joinRoom', { 
        username, 
        room,
        role: role
      });
      setIsConnected(true);
    }
  };

  const sendMessage = () => {
    if (message.trim() && socket) {
      socket.emit('chatMessage', {
        username,
        message: message.trim(),
        room,
        role: userRole
      });
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (e.target.name === 'message') {
        sendMessage();
      } else if (e.target.name === 'username' || e.target.name === 'room') {
        joinRoom();
      }
    }
  };

  const expelUser = (targetUsername) => {
    if (userRole === 'root_master' && targetUsername !== ROOT_MASTER_ID && socket) {
      socket.emit('expelUser', { username: targetUsername, room });
    }
  };

  const banUser = (targetUsername) => {
    if (userRole === 'root_master' && targetUsername !== ROOT_MASTER_ID && socket) {
      socket.emit('banUser', { username: targetUsername, room });
    }
  };

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leaveRoom', { username, room });
      setIsConnected(false);
      setMessages([]);
      setUsers([]);
      setRoom('');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'root_master':
        return <Crown size={16} className="role-icon root-master glow-orange" />;
      case 'admin':
        return <Shield size={16} className="role-icon admin" />;
      default:
        return null;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'root_master':
        return '#ff6b35';
      case 'admin':
        return '#4ecdc4';
      default:
        return '#ffffff';
    }
  };

  const createParticles = () => {
    return Array.from({ length: 15 }, (_, i) => (
      <div
        key={i}
        className="particle"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${Math.random() * 4 + 2}px`,
          height: `${Math.random() * 4 + 2}px`,
          animationDelay: `${Math.random() * 6}s`,
          animationDuration: `${6 + Math.random() * 4}s`
        }}
      />
    ));
  };

  if (!isConnected) {
    return (
      <div className="login-container">
        <div className="particles">{createParticles()}</div>
        <div className="login-card glow-orange">
          <div className="login-header">
            <div className="login-icon-container">
              <MessageCircle size={40} className="login-icon" />
              <Sparkles size={24} className="sparkle-icon" />
            </div>
            <h1>Aesthetic Chat</h1>
            <p>Enter the Orange Master Realm</p>
          </div>
          
          <div className="login-form">
            <div className="input-group">
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                className="login-input"
              />
            </div>
            
            <div className="input-group">
              <input
                type="text"
                name="room"
                placeholder="Enter room name"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                onKeyPress={handleKeyPress}
                className="login-input"
              />
            </div>
            
            <button onClick={joinRoom} className="join-btn glow-orange">
              <Zap size={18} />
              Join Realm
            </button>
          </div>
          
          {username === ROOT_MASTER_ID && (
            <div className="root-master-indicator glow-orange-intense">
              <Crown size={18} />
              <span>🔥 Root Master Access Detected</span>
              <Sparkles size={16} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="particles">{createParticles()}</div>
      
      <div className="chat-header">
        <div className="room-info">
          <MessageCircle size={28} />
          <div>
            <h2>#{room}</h2>
            <span className="user-count">👥 {users.length} members online</span>
          </div>
        </div>
        
        <div className="header-actions">
          {userRole === 'root_master' && (
            <div className="root-master-badge glow-orange">
              <Crown size={18} />
              <span>Root Master</span>
              <Sparkles size={14} />
            </div>
          )}
          <button 
            onClick={() => setShowUserList(!showUserList)}
            className="action-btn"
            title="Toggle member list"
          >
            {showUserList ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          <button onClick={leaveRoom} className="action-btn leave-btn" title="Leave realm">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="chat-content">
        <div className="messages-container">
          <div className="messages-list">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type || 'normal'}`}>
                {msg.type !== 'system' && msg.type !== 'error' && (
                  <div className="message-header">
                    <div className="message-user">
                      {getRoleIcon(msg.role)}
                      <span 
                        className={`username ${msg.role === 'root_master' ? 'root-master-text' : ''}`}
                        style={{ color: getRoleColor(msg.role) }}
                      >
                        {msg.username}
                      </span>
                      {msg.role === 'root_master' && <Sparkles size={12} className="username-sparkle" />}
                    </div>
                    <span className="timestamp">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                <div className={`message-content ${msg.role === 'root_master' ? 'root-master-message' : ''}`}>
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {showUserList && (
          <div className="user-list">
            <div className="user-list-header">
              <Users size={20} />
              <span>Members ({users.length})</span>
              <Sparkles size={16} className="list-sparkle" />
            </div>
            <div className="users">
              {users.map((user, index) => (
                <div key={index} className={`user-item ${user.role === 'root_master' ? 'root-master-user' : ''}`}>
                  <div className="user-info">
                    {getRoleIcon(user.role)}
                    <span 
                      className={`user-name ${user.role === 'root_master' ? 'root-master-text' : ''}`}
                      style={{ color: getRoleColor(user.role) }}
                    >
                      {user.username}
                    </span>
                    {user.username === username && <span className="you-indicator">(You)</span>}
                    {user.role === 'root_master' && <Sparkles size={12} className="user-sparkle" />}
                  </div>
                  
                  {userRole === 'root_master' && user.username !== ROOT_MASTER_ID && user.username !== username && (
                    <div className="user-actions">
                      <button 
                        onClick={() => expelUser(user.username)}
                        className="user-action-btn expel"
                        title="⚡ Expel user"
                      >
                        <UserMinus size={16} />
                      </button>
                      <button 
                        onClick={() => banUser(user.username)}
                        className="user-action-btn ban"
                        title="🔥 Ban user"
                      >
                        <Ban size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="message-input-container">
        <input
          type="text"
          name="message"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="message-input"
        />
        <button onClick={sendMessage} className="send-btn glow-orange">
          <Send size={22} />
        </button>
      </div>
    </div>
  );
}

export default App;
