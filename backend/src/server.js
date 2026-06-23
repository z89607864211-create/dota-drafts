import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

const io = new Server(server, {
  cors: {
    origin: isProduction ? true : 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

if (isProduction) {
  const frontendPath = join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/matches', async (req, res) => {
  const { getMatches } = await import('./store.js');
  res.json(getMatches());
});

if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../../frontend/dist/index.html'));
  });
}

export { app, server, io };