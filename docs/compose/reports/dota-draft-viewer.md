---
feature: dota-draft-viewer
status: delivered
specs:
  - docs/compose/specs/2026-06-22-dota-draft-viewer-design.md
plans:
  - docs/compose/plans/2026-06-22-dota-draft-viewer.md
branch: main
commits: initial..HEAD
---

# Dota Draft Viewer — Final Report

## What Was Built

A web application that scrapes Dota 2 draft data from competitor sites (dltv.org, hawk.live) and displays it in real-time. The application consists of a Node.js backend that periodically scrapes HTML pages, parses draft information, and pushes updates to connected clients via WebSocket. A React frontend displays live drafts with bans, picks, and match status in a clean, responsive interface.

The system solves the problem of delayed draft data from free APIs by directly scraping competitor sites, providing faster access to professional Dota 2 draft information.

## Architecture

### Backend (Node.js + Express)
- **Entry Point:** `backend/src/index.js` - Starts server and scraping
- **Server:** `backend/src/server.js` - Express app with Socket.io
- **Store:** `backend/src/store.js` - In-memory match storage
- **Scraper:** `backend/src/scraper/index.js` - Coordinates scraping from multiple sources
- **Parsers:** `backend/src/scraper/dltv.js`, `hawk.js` - Site-specific HTML parsers

### Frontend (React + Vite)
- **Entry:** `frontend/src/main.jsx` - React root
- **App:** `frontend/src/App.jsx` - Main component with state management
- **Components:** `frontend/src/components/` - Header, Footer, LiveDrafts, DraftCard
- **Hooks:** `frontend/src/hooks/useSocket.js` - WebSocket connection management

### Data Flow
1. Backend scrapes dltv.org/hawk.live every 15 seconds
2. Parses HTML to extract: match ID, teams, tournament, picks/bans, status
3. Stores matches in memory (Map)
4. Pushes updates to all connected clients via Socket.io
5. Frontend receives updates and re-renders UI in real-time

### Design Decisions

**Axios + Cheerio instead of Puppeteer:** Initially planned Puppeteer for dynamic content, but switched to Axios + Cheerio for simpler HTTP requests. This avoids browser installation issues and reduces resource usage. If sites require JavaScript rendering, Puppeteer can be added back.

**In-memory storage:** Using JavaScript Map for simplicity. Matches are automatically cleared after 1 hour. Redis can be added later for persistence.

**CSS Modules:** Used for component-scoped styling without runtime overhead. Each component has its own `.module.css` file.

## Usage

### Starting the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### API Endpoints

- `GET /api/health` - Health check
- `GET /api/matches` - Get current matches

### WebSocket Events

- `matches-update` - Emitted when matches are updated

## Verification

- Backend server starts on port 3001
- Frontend dev server starts on port 5173
- WebSocket connection established (green indicator)
- Scraping logs show attempts to fetch data
- Frontend displays "No live matches found" initially
- Real-time updates work when matches are found

## Journey Log

- [pivot] Switched from Puppeteer to Axios + Cheerio due to Chrome installation issues on Windows
- [lesson] Static HTML parsing with Cheerio is sufficient for most scraping tasks when JavaScript rendering isn't required
- [dead end] Puppeteer Chrome binary installation failed repeatedly - resolved by using simpler HTTP approach

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/specs/2026-06-22-dota-draft-viewer-design.md` | Initial design | See §7 for scraping strategy |
| `docs/compose/plans/2026-06-22-dota-draft-viewer.md` | Implementation plan | Complete |