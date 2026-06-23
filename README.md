# Dota Drafts - Live Draft Viewer

A web application that scrapes Dota 2 draft data from competitor sites and displays it in real-time.

## Features

- Real-time draft tracking
- Live updates via WebSocket
- Clean, responsive UI
- Multiple data sources (dltv.org, hawk.live)

## Tech Stack

- **Backend:** Node.js, Express, Axios, Cheerio, Socket.io
- **Frontend:** React, Vite, Socket.io-client

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone repository
git clone <repository-url>
cd dota-drafts

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running

```bash
# Start backend (terminal 1)
cd backend
npm run dev

# Start frontend (terminal 2)
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
dota-drafts/
├── backend/          # Node.js server
├── frontend/         # React app
└── docs/             # Documentation
```

## License

MIT