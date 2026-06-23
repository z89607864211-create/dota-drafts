# Dota 2 Draft Viewer - Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/dota-draft-viewer.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web application that scrapes Dota 2 draft data from competitor sites and displays it in real-time.

**Architecture:** Backend Node.js server scrapes dltv.org/hawk.live, stores matches in memory, pushes updates via WebSocket. Frontend React app displays live drafts with real-time updates.

**Tech Stack:** Node.js, Express, Puppeteer, Socket.io, React, Vite

---

## File Structure

```
dota-drafts/
├── backend/
│   ├── src/
│   │   ├── index.js          # Entry point
│   │   ├── server.js         # Express + Socket.io setup
│   │   ├── scraper/
│   │   │   ├── index.js      # Scraper coordinator
│   │   │   ├── dltv.js       # dltv.org parser
│   │   │   └── hawk.js       # hawk.live parser
│   │   ├── store.js          # In-memory match storage
│   │   └── utils.js          # Helpers
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── LiveDrafts.jsx
│   │   │   └── DraftCard.jsx
│   │   ├── hooks/
│   │   │   └── useSocket.js
│   │   ├── styles/
│   │   │   └── *.module.css
│   │   └── utils/
│   │       └── heroData.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── docs/
    └── compose/
        └── specs/
            └── 2026-06-22-dota-draft-viewer-design.md
```

---

### Task 1: Project Setup

**Covers:** [S4], [S6]

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`

- [ ] **Step 1: Create backend package.json**

```json
{
  "name": "dota-drafts-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "puppeteer": "^21.6.1",
    "cheerio": "^1.0.0-rc.12",
    "node-cron": "^3.0.3",
    "dotenv": "^16.3.1"
  }
}
```

- [ ] **Step 2: Create backend .env**

```
PORT=3001
SCRAPING_INTERVAL=15000
DLTV_URL=https://www.dltv.org
HAWK_URL=https://hawk.live
```

- [ ] **Step 3: Create frontend package.json**

```json
{
  "name": "dota-drafts-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "socket.io-client": "^4.7.2",
    "react-icons": "^4.12.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
```

- [ ] **Step 4: Create frontend vite.config.js**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  }
})
```

- [ ] **Step 5: Create frontend index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dota Drafts - Live Draft Viewer</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 6: Install dependencies**

Run: `cd backend && npm install`
Run: `cd frontend && npm install`

- [ ] **Step 7: Commit**

```bash
git init
git add backend/package.json backend/.env frontend/package.json frontend/vite.config.js frontend/index.html
git commit -m "feat: project setup with backend and frontend scaffolding"
```

---

### Task 2: Backend Server Setup

**Covers:** [S4], [S5]

**Files:**
- Create: `backend/src/index.js`
- Create: `backend/src/server.js`
- Create: `backend/src/store.js`

- [ ] **Step 1: Create store.js**

```javascript
// In-memory storage for current matches
const matches = new Map();

export function getMatches() {
  return Array.from(matches.values());
}

export function getMatch(id) {
  return matches.get(id);
}

export function updateMatch(id, data) {
  matches.set(id, { ...matches.get(id), ...data, updatedAt: Date.now() });
}

export function removeMatch(id) {
  matches.delete(id);
}

export function clearOldMatches(maxAge = 3600000) {
  const now = Date.now();
  for (const [id, match] of matches) {
    if (now - match.updatedAt > maxAge) {
      matches.delete(id);
    }
  }
}
```

- [ ] **Step 2: Create server.js**

```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Get current matches
app.get('/api/matches', async (req, res) => {
  const { getMatches } = await import('./store.js');
  res.json(getMatches());
});

export { app, server, io };
```

- [ ] **Step 3: Create index.js**

```javascript
import { server, io } from './server.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export io for other modules to use
export { io };
```

- [ ] **Step 4: Test server starts**

Run: `cd backend && npm run dev`
Expected: Server starts on port 3001

- [ ] **Step 5: Commit**

```bash
git add backend/src/
git commit -m "feat: backend server with Express and Socket.io"
```

---

### Task 3: Scraper Implementation

**Covers:** [S3], [S7], [S8]

**Files:**
- Create: `backend/src/scraper/index.js`
- Create: `backend/src/scraper/dltv.js`
- Create: `backend/src/scraper/hawk.js`
- Create: `backend/src/utils.js`

- [ ] **Step 1: Create utils.js**

```javascript
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function parseHeroId(id) {
  // Convert hero ID to name
  const heroMap = {
    1: 'Anti-Mage', 2: 'Axe', 3: 'Bane', 4: 'Bloodseeker',
    5: 'Crystal Maiden', 6: 'Drow Ranger', 7: 'Earthshaker',
    8: 'Juggernaut', 9: 'Mirana', 10: 'Shadow Fiend'
    // Add more as needed
  };
  return heroMap[id] || `Hero ${id}`;
}

export function extractTeamName(element) {
  return element?.trim() || 'Unknown Team';
}
```

- [ ] **Step 2: Create dltv.js**

```javascript
import * as cheerio from 'cheerio';
import { delay } from '../utils.js';

export async function scrapeDltv(browser) {
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.dltv.org/matches', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await delay(2000); // Wait for dynamic content
    
    const content = await page.content();
    const $ = cheerio.load(content);
    
    const matches = [];
    
    // Parse match cards - adjust selectors based on actual site structure
    $('.match-card, .match-item').each((i, element) => {
      const matchId = $(element).attr('data-match-id') || `dltv-${i}`;
      const tournament = $(element).find('.tournament-name').text().trim();
      const teamA = $(element).find('.team-a .team-name').text().trim();
      const teamB = $(element).find('.team-b .team-name').text().trim();
      
      // Extract picks and bans
      const bans = [];
      const picks = [];
      
      $(element).find('.ban-phase .hero-icon').each((j, el) => {
        bans.push($(el).attr('data-hero') || $(el).attr('alt') || 'Unknown');
      });
      
      $(element).find('.pick-phase .hero-icon').each((j, el) => {
        picks.push($(el).attr('data-hero') || $(el).attr('alt') || 'Unknown');
      });
      
      const status = $(element).find('.match-status').text().trim() || 'unknown';
      
      matches.push({
        id: matchId,
        source: 'dltv',
        tournament,
        teamA,
        teamB,
        bans,
        picks,
        status,
        timestamp: Date.now()
      });
    });
    
    return matches;
  } catch (error) {
    console.error('Dltv scraping error:', error.message);
    return [];
  } finally {
    await page.close();
  }
}
```

- [ ] **Step 3: Create hawk.js**

```javascript
import * as cheerio from 'cheerio';
import { delay } from '../utils.js';

export async function scrapeHawk(browser) {
  const page = await browser.newPage();
  
  try {
    await page.goto('https://hawk.live/matches', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await delay(2000);
    
    const content = await page.content();
    const $ = cheerio.load(content);
    
    const matches = [];
    
    // Parse match cards - adjust selectors based on actual site structure
    $('.match-card, .game-card').each((i, element) => {
      const matchId = $(element).attr('data-id') || `hawk-${i}`;
      const tournament = $(element).find('.tournament').text().trim();
      const teamA = $(element).find('.team:first-child .name').text().trim();
      const teamB = $(element).find('.team:last-child .name').text().trim();
      
      const bans = [];
      const picks = [];
      
      $(element).find('.ban .hero').each((j, el) => {
        bans.push($(el).attr('data-hero') || $(el).text().trim() || 'Unknown');
      });
      
      $(element).find('.pick .hero').each((j, el) => {
        picks.push($(el).attr('data-hero') || $(el).text().trim() || 'Unknown');
      });
      
      const status = $(element).find('.status').text().trim() || 'unknown';
      
      matches.push({
        id: matchId,
        source: 'hawk',
        tournament,
        teamA,
        teamB,
        bans,
        picks,
        status,
        timestamp: Date.now()
      });
    });
    
    return matches;
  } catch (error) {
    console.error('Hawk scraping error:', error.message);
    return [];
  } finally {
    await page.close();
  }
}
```

- [ ] **Step 4: Create scraper/index.js**

```javascript
import puppeteer from 'puppeteer';
import { scrapeDltv } from './dltv.js';
import { scrapeHawk } from './hawk.js';
import { updateMatch, clearOldMatches } from '../store.js';
import { io } from '../index.js';

let browser = null;
let isScraping = false;

async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

export async function scrapeAll() {
  if (isScraping) {
    console.log('Scraping already in progress, skipping...');
    return;
  }
  
  isScraping = true;
  console.log('Starting scrape...');
  
  try {
    const browserInstance = await initBrowser();
    
    // Scrape both sources in parallel
    const [dltvMatches, hawkMatches] = await Promise.allSettled([
      scrapeDltv(browserInstance),
      scrapeHawk(browserInstance)
    ]);
    
    const allMatches = [
      ...(dltvMatches.status === 'fulfilled' ? dltvMatches.value : []),
      ...(hawkMatches.status === 'fulfilled' ? hawkMatches.value : [])
    ];
    
    // Update store and notify clients
    for (const match of allMatches) {
      updateMatch(match.id, match);
    }
    
    // Clear old matches
    clearOldMatches();
    
    // Emit updates to all connected clients
    const { getMatches } = await import('../store.js');
    io.emit('matches-update', getMatches());
    
    console.log(`Scraped ${allMatches.length} matches`);
  } catch (error) {
    console.error('Scraping error:', error);
  } finally {
    isScraping = false;
  }
}

export async function startScraping(interval = 15000) {
  await initBrowser();
  
  // Initial scrape
  await scrapeAll();
  
  // Set up interval
  setInterval(scrapeAll, interval);
  console.log(`Scraping every ${interval / 1000} seconds`);
}

export async function stopScraping() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
```

- [ ] **Step 5: Update index.js to start scraping**

```javascript
import { server, io } from './server.js';
import { startScraping } from './scraper/index.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start scraping after server is ready
  const interval = parseInt(process.env.SCRAPING_INTERVAL) || 15000;
  startScraping(interval);
});

export { io };
```

- [ ] **Step 6: Test scraping**

Run: `cd backend && npm run dev`
Expected: Server starts, scraping begins, logs show matches found

- [ ] **Step 7: Commit**

```bash
git add backend/src/
git commit -m "feat: scraper implementation for dltv.org and hawk.live"
```

---

### Task 4: Frontend React App

**Covers:** [S4], [S5]

**Files:**
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/hooks/useSocket.js`

- [ ] **Step 1: Create main.jsx**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 2: Create App.jsx**

```jsx
import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import LiveDrafts from './components/LiveDrafts'
import useSocket from './hooks/useSocket'
import styles from './App.module.css'

function App() {
  const [matches, setMatches] = useState([])
  const [connected, setConnected] = useState(false)
  
  useSocket(setMatches, setConnected)
  
  return (
    <div className={styles.app}>
      <Header connected={connected} />
      <main className={styles.main}>
        <LiveDrafts matches={matches} />
      </main>
      <Footer />
    </div>
  )
}

export default App
```

- [ ] **Step 3: Create useSocket.js**

```javascript
import { useEffect } from 'react'
import { io } from 'socket.io-client'

export default function useSocket(setMatches, setConnected) {
  useEffect(() => {
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    })
    
    socket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
    })
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })
    
    socket.on('matches-update', (data) => {
      setMatches(data)
    })
    
    return () => {
      socket.disconnect()
    }
  }, [setMatches, setConnected])
}
```

- [ ] **Step 4: Create App.module.css**

```css
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #1a1a2e;
  color: #eee;
}

.main {
  flex: 1;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
```

- [ ] **Step 5: Create index.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #1a1a2e;
  color: #eee;
}

a {
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 6: Test frontend starts**

Run: `cd frontend && npm run dev`
Expected: Frontend starts on port 5173

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: React frontend with socket connection"
```

---

### Task 5: Frontend Components

**Covers:** [S5]

**Files:**
- Create: `frontend/src/components/Header.jsx`
- Create: `frontend/src/components/Footer.jsx`
- Create: `frontend/src/components/LiveDrafts.jsx`
- Create: `frontend/src/components/DraftCard.jsx`
- Create: `frontend/src/utils/heroData.js`
- Create: `frontend/src/components/Header.module.css`
- Create: `frontend/src/components/Footer.module.css`
- Create: `frontend/src/components/LiveDrafts.module.css`
- Create: `frontend/src/components/DraftCard.module.css`

- [ ] **Step 1: Create heroData.js**

```javascript
// Dota 2 hero data - simplified for MVP
export const heroes = {
  'Anti-Mage': { id: 1, name: 'Anti-Mage', icon: '🗡️' },
  'Axe': { id: 2, name: 'Axe', icon: '🪓' },
  'Bane': { id: 3, name: 'Bane', icon: '👁️' },
  'Bloodseeker': { id: 4, name: 'Bloodseeker', icon: '🩸' },
  'Crystal Maiden': { id: 5, name: 'Crystal Maiden', icon: '❄️' },
  'Drow Ranger': { id: 6, name: 'Drow Ranger', icon: '🏹' },
  'Earthshaker': { id: 7, name: 'Earthshaker', icon: '🌋' },
  'Juggernaut': { id: 8, name: 'Juggernaut', icon: '⚔️' },
  'Mirana': { id: 9, name: 'Mirana', icon: '🌙' },
  'Shadow Fiend': { id: 10, name: 'Shadow Fiend', icon: '👻' },
  'Unknown': { id: 0, name: 'Unknown', icon: '❓' }
}

export function getHeroByName(name) {
  return heroes[name] || heroes['Unknown']
}
```

- [ ] **Step 2: Create Header.jsx**

```jsx
import React from 'react'
import styles from './Header.module.css'

export default function Header({ connected }) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.icon}>🎮</span>
        <h1>Dota Drafts</h1>
      </div>
      <nav className={styles.nav}>
        <a href="/" className={styles.active}>Live</a>
        <a href="/history" className={styles.disabled}>History</a>
      </nav>
      <div className={styles.status}>
        <span className={`${styles.dot} ${connected ? styles.online : styles.offline}`}></span>
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Create Header.module.css**

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #16213e;
  border-bottom: 1px solid #0f3460;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #e94560;
}

.icon {
  font-size: 1.8rem;
}

.nav {
  display: flex;
  gap: 20px;
}

.nav a {
  padding: 8px 16px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.nav a:hover {
  background-color: #0f3460;
}

.nav a.active {
  background-color: #e94560;
}

.nav a.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.online {
  background-color: #4ade80;
}

.dot.offline {
  background-color: #ef4444;
}
```

- [ ] **Step 4: Create Footer.jsx**

```jsx
import React from 'react'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p>Dota Drafts - Live Draft Viewer</p>
        <p className={styles.attribution}>
          Data sourced from dltv.org and hawk.live
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Create Footer.module.css**

```css
.footer {
  padding: 20px;
  background-color: #16213e;
  border-top: 1px solid #0f3460;
  text-align: center;
}

.content p {
  margin: 5px 0;
}

.attribution {
  font-size: 0.85rem;
  opacity: 0.7;
}
```

- [ ] **Step 6: Create LiveDrafts.jsx**

```jsx
import React from 'react'
import DraftCard from './DraftCard'
import styles from './LiveDrafts.module.css'

export default function LiveDrafts({ matches }) {
  if (!matches || matches.length === 0) {
    return (
      <div className={styles.container}>
        <h2>Live Drafts</h2>
        <div className={styles.empty}>
          <p>No live matches found</p>
          <p className={styles.hint}>Waiting for matches to start...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2>Live Drafts ({matches.length})</h2>
      <div className={styles.grid}>
        {matches.map(match => (
          <DraftCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create LiveDrafts.module.css**

```css
.container {
  padding: 20px 0;
}

.container h2 {
  margin-bottom: 20px;
  font-size: 1.3rem;
  color: #e94560;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  background-color: #16213e;
  border-radius: 12px;
  border: 1px solid #0f3460;
}

.empty p {
  margin: 10px 0;
}

.hint {
  opacity: 0.6;
  font-size: 0.9rem;
}
```

- [ ] **Step 8: Create DraftCard.jsx**

```jsx
import React from 'react'
import { getHeroByName } from '../utils/heroData'
import styles from './DraftCard.module.css'

export default function DraftCard({ match }) {
  const { tournament, teamA, teamB, bans, picks, status } = match
  
  return (
    <div className={styles.card}>
      <div className={styles.tournament}>{tournament || 'Unknown Tournament'}</div>
      
      <div className={styles.teams}>
        <div className={styles.team}>
          <span className={styles.teamName}>{teamA || 'Team A'}</span>
        </div>
        <span className={styles.vs}>VS</span>
        <div className={styles.team}>
          <span className={styles.teamName}>{teamB || 'Team B'}</span>
        </div>
      </div>
      
      <div className={styles.draftSection}>
        <div className={styles.phase}>
          <span className={styles.phaseLabel}>Bans</span>
          <div className={styles.heroList}>
            {bans && bans.length > 0 ? (
              bans.map((hero, i) => (
                <div key={`ban-${i}`} className={`${styles.hero} ${styles.ban}`}>
                  <span className={styles.heroIcon}>{getHeroByName(hero).icon}</span>
                  <span className={styles.heroName}>{hero}</span>
                </div>
              ))
            ) : (
              <span className={styles.empty}>No bans yet</span>
            )}
          </div>
        </div>
        
        <div className={styles.phase}>
          <span className={styles.phaseLabel}>Picks</span>
          <div className={styles.heroList}>
            {picks && picks.length > 0 ? (
              picks.map((hero, i) => (
                <div key={`pick-${i}`} className={`${styles.hero} ${styles.pick}`}>
                  <span className={styles.heroIcon}>{getHeroByName(hero).icon}</span>
                  <span className={styles.heroName}>{hero}</span>
                </div>
              ))
            ) : (
              <span className={styles.empty}>No picks yet</span>
            )}
          </div>
        </div>
      </div>
      
      <div className={`${styles.status} ${styles[status] || styles.unknown}`}>
        {status || 'unknown'}
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Create DraftCard.module.css**

```css
.card {
  background-color: #16213e;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #0f3460;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tournament {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-bottom: 12px;
}

.teams {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.team {
  flex: 1;
  text-align: center;
}

.teamName {
  font-size: 1.1rem;
  font-weight: 600;
}

.vs {
  font-size: 0.9rem;
  opacity: 0.6;
  padding: 0 15px;
}

.draftSection {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.phase {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phaseLabel {
  font-size: 0.8rem;
  text-transform: uppercase;
  opacity: 0.6;
}

.heroList {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hero {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.hero.ban {
  background-color: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.hero.pick {
  background-color: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.heroIcon {
  font-size: 1rem;
}

.heroName {
  font-size: 0.8rem;
}

.empty {
  opacity: 0.5;
  font-size: 0.85rem;
}

.status {
  margin-top: 15px;
  padding: 6px 12px;
  border-radius: 6px;
  text-align: center;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.status.drafting {
  background-color: rgba(234, 179, 8, 0.2);
  color: #eab308;
}

.status.live {
  background-color: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status.finished {
  background-color: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.status.unknown {
  background-color: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}
```

- [ ] **Step 10: Test frontend components**

Run: `cd frontend && npm run dev`
Expected: Frontend displays with header, empty state, and footer

- [ ] **Step 11: Commit**

```bash
git add frontend/src/
git commit -m "feat: frontend components for draft display"
```

---

### Task 6: Integration Testing

**Covers:** [S9], [S10]

**Files:**
- Modify: `backend/src/index.js` (already exists)
- Modify: `frontend/src/App.jsx` (already exists)

- [ ] **Step 1: Start backend server**

Run: `cd backend && npm run dev`
Expected: Server starts on port 3001

- [ ] **Step 2: Start frontend dev server**

Run: `cd frontend && npm run dev`
Expected: Frontend starts on port 5173

- [ ] **Step 3: Open browser and test**

Open: `http://localhost:5173`
Expected: Frontend loads, shows "No live matches found" initially

- [ ] **Step 4: Verify scraping works**

Check backend console for scraping logs
Expected: Logs show matches being scraped from dltv.org and hawk.live

- [ ] **Step 5: Verify real-time updates**

Wait 15-30 seconds for scraping to complete
Expected: Frontend updates with live match data

- [ ] **Step 6: Test WebSocket connection**

Check frontend connection status indicator
Expected: Green dot showing "Connected"

- [ ] **Step 7: Commit final changes**

```bash
git add .
git commit -m "feat: integration complete - live draft viewer MVP"
```

---

### Task 7: Documentation

**Covers:** [S1]

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# Dota Drafts - Live Draft Viewer

A web application that scrapes Dota 2 draft data from competitor sites and displays it in real-time.

## Features

- Real-time draft tracking
- Live updates via WebSocket
- Clean, responsive UI
- Multiple data sources (dltv.org, hawk.live)

## Tech Stack

- **Backend:** Node.js, Express, Puppeteer, Socket.io
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
```

- [ ] **Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: add README with setup instructions"
```

---

## Summary

This plan covers the MVP implementation of a Dota 2 draft viewer with:

1. **Backend scraping** from dltv.org and hawk.live
2. **Real-time updates** via WebSocket
3. **React frontend** with clean UI
4. **Live draft display** with bans, picks, and match status

**Estimated time:** 2-3 hours for full implementation

**Next steps after MVP:**
- Add match history
- Implement hero statistics
- Add team profiles
- Build draft analysis features
- Add Redis for persistent storage
- Deploy to production
