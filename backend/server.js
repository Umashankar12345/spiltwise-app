const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Make io accessible to our router
app.set('io', io);

// Basic route
app.get('/', (req, res) => {
  res.send('Splitwise Clone API Running');
});

// Import routes (we will create these next)
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const balanceRoutes = require('./routes/balances');

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/balances', balanceRoutes);

// Socket.io integration
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_expense', (expenseId) => {
    socket.join(`expense_${expenseId}`);
    console.log(`User joined room: expense_${expenseId}`);
  });

  socket.on('new_message', async (data) => {
    const { expenseId, userId, message } = data;
    try {
      const result = await db.query(
        'INSERT INTO expense_messages (expense_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
        [expenseId, userId, message]
      );
      io.to(`expense_${expenseId}`).emit('new_message', result.rows[0]);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('edit_message', async (data) => {
    const { messageId, expenseId, newText } = data;
    try {
      const result = await db.query(
        'UPDATE expense_messages SET message = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [newText, messageId]
      );
      if (result.rows.length > 0) {
        io.to(`expense_${expenseId}`).emit('edit_message', result.rows[0]);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('delete_message', async (data) => {
    const { messageId, expenseId } = data;
    try {
      const result = await db.query(
        'UPDATE expense_messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [messageId]
      );
      if (result.rows.length > 0) {
        io.to(`expense_${expenseId}`).emit('delete_message', result.rows[0]);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
