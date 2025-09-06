const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Store rooms and users
const rooms = new Map();
const bannedUsers = new Map(); // roomName -> Set of banned usernames

const ROOT_MASTER_ID = 'root_master_2024';

// Helper function to get room users
function getRoomUsers(roomName) {
  return Array.from(rooms.get(roomName) || []);
}

// Helper function to check if user is banned
function isUserBanned(roomName, username) {
  const banned = bannedUsers.get(roomName);
  return banned && banned.has(username);
}

// Helper function to add user to room
function addUserToRoom(roomName, user) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  rooms.get(roomName).add(user);
}

// Helper function to remove user from room
function removeUserFromRoom(roomName, socketId) {
  if (rooms.has(roomName)) {
    const roomUsers = rooms.get(roomName);
    for (let user of roomUsers) {
      if (user.socketId === socketId) {
        roomUsers.delete(user);
        break;
      }
    }
    
    // Clean up empty rooms
    if (roomUsers.size === 0) {
      rooms.delete(roomName);
      bannedUsers.delete(roomName);
    }
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', (data) => {
    const { username, room, role } = data;
    
    // Check if user is banned
    if (isUserBanned(room, username)) {
      socket.emit('message', {
        username: 'System',
        message: 'You are banned from this room',
        timestamp: new Date(),
        type: 'error'
      });
      return;
    }

    // Check if username is already taken in this room
    const roomUsers = getRoomUsers(room);
    const existingUser = roomUsers.find(user => user.username === username);
    if (existingUser) {
      socket.emit('message', {
        username: 'System',
        message: 'Username already taken in this room',
        timestamp: new Date(),
        type: 'error'
      });
      return;
    }

    socket.join(room);
    
    const userInfo = {
      socketId: socket.id,
      username,
      room,
      role: username === ROOT_MASTER_ID ? 'root_master' : role
    };
    
    addUserToRoom(room, userInfo);

    // Send welcome message to user
    socket.emit('message', {
      username: 'System',
      message: `Welcome to room #${room}!`,
      timestamp: new Date(),
      type: 'system'
    });

    // Notify others about new user
    socket.to(room).emit('userJoined', { username });

    // Send updated user list to all users in room
    const updatedUsers = getRoomUsers(room);
    io.to(room).emit('userList', updatedUsers);

    console.log(`${username} joined room ${room}`);
  });

  socket.on('chatMessage', (data) => {
    const { username, message, room, role } = data;
    
    const messageData = {
      username,
      message,
      timestamp: new Date(),
      role: username === ROOT_MASTER_ID ? 'root_master' : role,
      type: 'normal'
    };

    io.to(room).emit('message', messageData);
    console.log(`Message in ${room} from ${username}: ${message}`);
  });

  socket.on('expelUser', (data) => {
    const { username: targetUsername, room } = data;
    
    // Find the requesting user
    const roomUsers = getRoomUsers(room);
    const requestingUser = roomUsers.find(user => user.socketId === socket.id);
    
    if (!requestingUser || requestingUser.role !== 'root_master') {
      return; // Not authorized
    }

    // Prevent self-expulsion and expelling root master
    if (targetUsername === requestingUser.username || targetUsername === ROOT_MASTER_ID) {
      return;
    }

    // Find target user
    const targetUser = roomUsers.find(user => user.username === targetUsername);
    if (targetUser) {
      // Remove user from room
      removeUserFromRoom(room, targetUser.socketId);
      
      // Notify the expelled user
      io.to(targetUser.socketId).emit('userExpelled', { username: targetUsername });
      
      // Make them leave the room
      io.sockets.sockets.get(targetUser.socketId)?.leave(room);
      
      // Notify other users
      socket.to(room).emit('userExpelled', { username: targetUsername });
      
      // Send updated user list
      const updatedUsers = getRoomUsers(room);
      io.to(room).emit('userList', updatedUsers);
      
      console.log(`${targetUsername} was expelled from ${room} by ${requestingUser.username}`);
    }
  });

  socket.on('banUser', (data) => {
    const { username: targetUsername, room } = data;
    
    // Find the requesting user
    const roomUsers = getRoomUsers(room);
    const requestingUser = roomUsers.find(user => user.socketId === socket.id);
    
    if (!requestingUser || requestingUser.role !== 'root_master') {
      return; // Not authorized
    }

    // Prevent self-ban and banning root master
    if (targetUsername === requestingUser.username || targetUsername === ROOT_MASTER_ID) {
      return;
    }

    // Add to banned list
    if (!bannedUsers.has(room)) {
      bannedUsers.set(room, new Set());
    }
    bannedUsers.get(room).add(targetUsername);

    // Find and remove target user if they're in the room
    const targetUser = roomUsers.find(user => user.username === targetUsername);
    if (targetUser) {
      removeUserFromRoom(room, targetUser.socketId);
      
      // Make them leave the room
      io.sockets.sockets.get(targetUser.socketId)?.leave(room);
    }

    // Notify all users
    io.to(room).emit('userBanned', { username: targetUsername });
    
    // Send updated user list
    const updatedUsers = getRoomUsers(room);
    io.to(room).emit('userList', updatedUsers);
    
    console.log(`${targetUsername} was banned from ${room} by ${requestingUser.username}`);
  });

  socket.on('leaveRoom', (data) => {
    const { username, room } = data;
    
    socket.leave(room);
    removeUserFromRoom(room, socket.id);

    // Notify others about user leaving
    socket.to(room).emit('userLeft', { username });

    // Send updated user list to remaining users
    const updatedUsers = getRoomUsers(room);
    io.to(room).emit('userList', updatedUsers);

    console.log(`${username} left room ${room}`);
  });

  socket.on('disconnect', () => {
    // Find and remove user from all rooms they were in
    for (let [roomName, roomUsers] of rooms.entries()) {
      const user = Array.from(roomUsers).find(u => u.socketId === socket.id);
      if (user) {
        removeUserFromRoom(roomName, socket.id);
        
        // Notify others about user leaving
        socket.to(roomName).emit('userLeft', { username: user.username });
        
        // Send updated user list
        const updatedUsers = getRoomUsers(roomName);
        io.to(roomName).emit('userList', updatedUsers);
        
        console.log(`${user.username} disconnected from ${roomName}`);
        break;
      }
    }
    
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Aesthetic Chat Server running on port ${PORT}`);
  console.log(`🔑 Root Master ID: ${ROOT_MASTER_ID}`);
});
