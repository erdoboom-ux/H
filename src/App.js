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
  EyeOff
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

  const ROOT_MASTER_ID = 'root_master_2024'; // This would be your unique ID

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
        message: `${data.username} joined the room`,
        timestamp: new Date(),
        type: 'system'
      }]);
    });

    newSocket.on('userLeft', (data) => {
      setMessages(prev => [...prev, {
        username: 'System',
        message: `${data.username} left the room`,
        timestamp: new Date(),
        type: 'system'
      }]);
    });

    newSocket.on('userExpelled', (data) => {
      if (data.username === username) {
        setIsConnected(false);
        setMessages(prev => [...prev, {
          username: 'System',
          message: 'You have been expelled from the room',
          timestamp: new Date(),
          type: 'error'
        }]);
      } else {
        setMessages(prev => [...prev, {
          username: 'System',
          message: `${data.username} was expelled from the room`,
          timestamp: new Date(),
          type: 'system'
        }]);
      }
    });

    newSocket.on('userBanned', (data) => {
      setMessages(prev => [...prev, {
        username: 'System',
        message: `${data.username} was banned from the room`,
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
        return <Crown size={16} className="role-icon root-master" />;
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

  if (!isConnected) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <MessageCircle size={32} className="login-icon" />
            <h1>Aesthetic Chat</h1>
            <p>Enter your credentials to join the conversation</p>
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
            
            <button onClick={joinRoom} className="join-btn">
              Join Room
            </button>
          </div>
          
          {username === ROOT_MASTER_ID && (
            <div className="root-master-indicator">
              <Crown size={16} />
              <span>Root Master Access Detected</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="room-info">
          <MessageCircle size={24} />
          <div>
            <h2>#{room}</h2>
            <span className="user-count">{users.length} members</span>
          </div>
        </div>
        
        <div className="header-actions">
          {userRole === 'root_master' && (
            <div className="root-master-badge">
              <Crown size={16} />
              <span>Root Master</span>
            </div>
          )}
          <button 
            onClick={() => setShowUserList(!showUserList)}
            className="action-btn"
            title="Toggle user list"
          >
            {showUserList ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button onClick={leaveRoom} className="action-btn leave-btn" title="Leave room">
            <LogOut size={18} />
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
                        className="username" 
                        style={{ color: getRoleColor(msg.role) }}
                      >
                        {msg.username}
                      </span>
                    </div>
                    <span className="timestamp">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                <div className="message-content">
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
              <Users size={18} />
              <span>Members ({users.length})</span>
            </div>
            <div className="users">
              {users.map((user, index) => (
                <div key={index} className="user-item">
                  <div className="user-info">
                    {getRoleIcon(user.role)}
                    <span 
                      className="user-name"
                      style={{ color: getRoleColor(user.role) }}
                    >
                      {user.username}
                    </span>
                    {user.username === username && <span className="you-indicator">(You)</span>}
                  </div>
                  
                  {userRole === 'root_master' && user.username !== ROOT_MASTER_ID && user.username !== username && (
                    <div className="user-actions">
                      <button 
                        onClick={() => expelUser(user.username)}
                        className="user-action-btn expel"
                        title="Expel user"
                      >
                        <UserMinus size={14} />
                      </button>
                      <button 
                        onClick={() => banUser(user.username)}
                        className="user-action-btn ban"
                        title="Ban user"
                      >
                        <Ban size={14} />
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
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="message-input"
        />
        <button onClick={sendMessage} className="send-btn">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

export default App;
