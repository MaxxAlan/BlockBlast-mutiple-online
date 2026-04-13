import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { upsertUser, updateHighScore, addVersusWin, logGameOver, getLeaderboards, upsertRoom, getRoom, deleteOldRooms, deleteRoom } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.static(path.join(__dirname, '../public-path')));

app.get('/api/user/:uid', (req, res) => {
  try {
    const { getUser } = require('./db.js');
    const user = getUser(req.params.uid);
    res.json(user || { solo_high_score: 0, coop_high_score: 0, versus_wins: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const data = getLeaderboards();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend for all other routes
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, '../public-path/index.html'));
});

const SHAPES = [
  { matrix: [[1]], colorId: 1 },
  { matrix: [[1, 1], [1, 1]], colorId: 2 },
  { matrix: [[1, 1, 1]], colorId: 3 },
  { matrix: [[1], [1], [1]], colorId: 4 },
  { matrix: [[1, 1, 1, 1]], colorId: 5 },
  { matrix: [[1], [1], [1], [1]], colorId: 6 },
  { matrix: [[1, 0], [1, 0], [1, 1]], colorId: 7 },
  { matrix: [[0, 1], [0, 1], [1, 1]], colorId: 8 },
  { matrix: [[1, 1, 1], [0, 1, 0]], colorId: 9 },
  { matrix: [[1, 0], [0, 1]], colorId: 10 },
  { matrix: [[0, 1], [1, 0]], colorId: 11 },
  { matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], colorId: 12 },
  { matrix: [[0, 0, 1], [0, 1, 0], [1, 0, 0]], colorId: 13 },
  { matrix: [[1, 1, 1], [1, 1, 1]], colorId: 14 },
  { matrix: [[1, 1], [1, 1], [1, 1]], colorId: 15 },
  { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], colorId: 16 },
  { matrix: [[1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1]], colorId: 17 },
  { matrix: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], colorId: 18 }
];

const getRandomShapes = (count = 3) => {
  return Array.from({ length: count }, () => {
    return SHAPES[Math.floor(Math.random() * SHAPES.length)];
  });
};

const rooms = {}; // Structure: { [roomId]: { mode, players: {} } }

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('init_user', ({ uid, nickname }) => {
    try {
      const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address || 'unknown';
      upsertUser(uid, ip, nickname);
    } catch (e) {
      console.error('Error init_user:', e);
    }
  });

  socket.on('submit_score', ({ uid, mode, score }) => {
    try {
      if (mode === 'versus') {
        addVersusWin(uid);
      } else {
        updateHighScore(uid, mode, score);
      }
    } catch (e) {
      console.error('Error submit_score:', e);
    }
  });

  socket.on('create_room', (data) => {
    const mode = data?.mode || data || 'versus';
    const creatorName = data?.creatorName || '';
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const sharedShapes = mode === 'coop' ? getRandomShapes(3) : null;
    rooms[roomId] = {
      mode: mode,
      creatorName: creatorName,
      sharedScore: 0,
      sharedBoard: null,
      sharedShapes: sharedShapes,
      players: {
        [socket.id]: { score: 0, board: null, ready: false }
      }
    };
    try {
      upsertRoom(roomId, rooms[roomId].mode, 0, null, sharedShapes);
    } catch (e) {
      console.error('Error saving room on create:', e);
    }
    socket.join(roomId);
    socket.emit('room_created', { roomId, mode: rooms[roomId].mode, creatorName: rooms[roomId].creatorName });
    console.log(`Room created: ${roomId} (Mode: ${rooms[roomId].mode}) by ${socket.id}`);

    // Auto delete room if no one else joins within 100s
    setTimeout(() => {
      const room = rooms[roomId];
      if (room && Object.keys(room.players).length <= 1) {
        delete rooms[roomId];
        deleteRoom(roomId);
        console.log(`Room ${roomId} automatically deleted after 100s of inactivity`);
      }
    }, 100000); // 100s timeout
  });

  socket.on('join_room', (roomId) => {
    roomId = roomId.toUpperCase();
    if (!rooms[roomId]) {
      // Try to load from database
      const dbRoom = getRoom(roomId);
      if (dbRoom) {
        rooms[roomId] = {
          mode: dbRoom.mode,
          sharedScore: dbRoom.sharedScore || 0,
          sharedBoard: dbRoom.sharedBoard,
          sharedShapes: dbRoom.sharedShapes,
          players: {}
        };
        console.log(`Revived room ${roomId} from database.`);
      } else {
        socket.emit('error', 'Không tìm thấy phòng!');
        return;
      }
    }

    const playersInRoom = Object.keys(rooms[roomId].players);
    // Versus limited to 2, Co-op unlimited
    if (rooms[roomId].mode === 'versus' && playersInRoom.length >= 2) {
      socket.emit('error', 'Phòng đã đầy!');
      return;
    }

    rooms[roomId].players[socket.id] = { score: 0, board: null, ready: false };
    socket.join(roomId);
    socket.emit('room_joined', { roomId, mode: rooms[roomId].mode, creatorName: rooms[roomId].creatorName });

    // Notify others in room
    socket.to(roomId).emit('opponent_joined', socket.id);
    console.log(`${socket.id} joined room: ${roomId}`);
    
    if (rooms[roomId].mode === 'versus' && Object.keys(rooms[roomId].players).length === 2) {
      io.to(roomId).emit('game_start', { roomId, mode: rooms[roomId].mode });
    } else if (rooms[roomId].mode === 'coop') {
      if (playersInRoom.length === 1) {
        // First joiner (2nd player overall): start game for everyone
        io.to(roomId).emit('game_start', { roomId, mode: 'coop' });
      } else {
        // 3rd, 4th players: just start game for themselves
        socket.emit('game_start', { roomId, mode: 'coop' });
        // Send current state
        socket.emit('coop_init_state', {
          board: rooms[roomId].sharedBoard,
          score: rooms[roomId].sharedScore,
          shapes: rooms[roomId].sharedShapes
        });
      }
    }
  });

  socket.on('update_state', (data) => {
    const { roomId, score, board } = data;
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      rooms[roomId].players[socket.id] = { score, board };
      // Broadcast to opponent
      socket.to(roomId).emit('opponent_update', { score, board });
    }
  });

  socket.on('coop_place_block', (data) => {
    const { roomId, newBoard, newScore, newShapes } = data;
    if (rooms[roomId]) {
      rooms[roomId].sharedBoard = newBoard;
      rooms[roomId].sharedScore = newScore;
      
      let shapesToSend = newShapes;
      // If client says shapes are empty (or they need refill), server generates them
      if (!shapesToSend || shapesToSend.length === 0) {
        shapesToSend = getRandomShapes(3);
      }
      rooms[roomId].sharedShapes = shapesToSend;
      
      try {
        upsertRoom(roomId, rooms[roomId].mode, newScore, newBoard, shapesToSend);
      } catch (e) {
        console.error('Error saving room on place_block:', e);
      }

      // Send back to ALL opponents
      socket.to(roomId).emit('coop_board_update', { board: newBoard, score: newScore, shapes: shapesToSend });
      // The sender also needs the new shapes if they were empty
      if (!newShapes || newShapes.length === 0) {
        socket.emit('coop_shapes_update', shapesToSend);
      }
    }
  });

  socket.on('coop_sync_shapes', (data) => {
    const { roomId, shapes } = data;
    if (rooms[roomId]) {
      rooms[roomId].sharedShapes = shapes;
      try {
        upsertRoom(roomId, rooms[roomId].mode, rooms[roomId].sharedScore, rooms[roomId].sharedBoard, shapes);
      } catch (e) {
        console.error('Error saving room on sync_shapes:', e);
      }
      socket.to(roomId).emit('coop_shapes_update', shapes);
    }
  });

  socket.on('coop_drag_move', (data) => {
    socket.to(data.roomId).emit('coop_drag_stream', data);
  });

  socket.on('coop_drag_end', (roomId) => {
    socket.to(roomId).emit('coop_drag_stream_end');
  });

  socket.on('coop_request_init', (roomId) => {
    if (rooms[roomId] && rooms[roomId].mode === 'coop') {
      socket.emit('coop_init_state', {
        board: rooms[roomId].sharedBoard,
        score: rooms[roomId].sharedScore,
        shapes: rooms[roomId].sharedShapes
      });
    }
  });

  socket.on('coop_request_restart', (roomId) => {
    if (rooms[roomId] && rooms[roomId].mode === 'coop') {
      io.to(roomId).emit('coop_restarting_soon');
      setTimeout(() => {
        const createEmptyBoard = () => Array(8).fill(null).map(() => Array(8).fill(0));
        rooms[roomId].sharedBoard = createEmptyBoard();
        rooms[roomId].sharedScore = 0;
        rooms[roomId].sharedShapes = getRandomShapes(3);
        
        io.to(roomId).emit('coop_init_state', {
          board: rooms[roomId].sharedBoard,
          score: 0,
          shapes: rooms[roomId].sharedShapes
        });
      }, 3000);
    }
  });

  socket.on('game_over', (roomId) => {
    socket.to(roomId).emit('opponent_game_over', socket.id);
  });

  socket.on('log_game_over', ({ uid, mode, score }) => {
    try {
      if (uid) {
        logGameOver(uid, mode, score);
      }
    } catch (e) {
      console.error('Error in log_game_over:', e);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        // Notify remaining people
        socket.to(roomId).emit('opponent_left', socket.id);
        
        // Clean up empty room
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId];
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;

// Cleanup old rooms
deleteOldRooms(30);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
