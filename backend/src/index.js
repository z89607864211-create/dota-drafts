import { server, io } from './server.js';
import { startScraping, stopScraping } from './scraper/index.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;
const SCRAPING_INTERVAL = parseInt(process.env.SCRAPING_INTERVAL) || 15000;

if (!process.env.NODE_ENV) {
  console.warn('NODE_ENV not set, defaulting to development');
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const serverInstance = server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScraping(io, SCRAPING_INTERVAL);
});

function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  stopScraping();
  
  io.emit('server-shutdown', { message: 'Server is restarting...' });
  
  serverInstance.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
