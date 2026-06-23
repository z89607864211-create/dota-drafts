# Dota 2 Draft Viewer - Design Document

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/dota-draft-viewer.md)

## [S1] Problem

Players and analysts need to see Dota 2 professional draft picks (picks/bans) in real-time, faster than existing services. Free APIs (OpenDota, Valve) have significant delays (5-15 minutes), making them unsuitable for live draft tracking. Existing services like dltv.org and hawk.live provide this data but require visiting their sites.

**Goal:** Build a web application that scrapes draft data from competitor sites and displays it in real-time with a clean, fast interface.

## [S2] Solution Overview

A full-stack web application with:

- **Backend:** Node.js server that scrapes dltv.org/hawk.live, parses draft data, and pushes updates via WebSocket
- **Frontend:** React SPA that displays live drafts with real-time updates
- **Architecture:** Server-side scraping → WebSocket → Client display

## [S3] Data Flow

```
[Competitor Sites] → [Backend Scraper] → [In-Memory Store] → [WebSocket] → [React Frontend]
        ↑                    ↑                    ↑
   dltv.org/hawk.live    Every 10-30s         Redis (future)
```

1. Backend scrapes competitor sites on interval (10-30 seconds)
2. Parses HTML to extract: match ID, teams, tournament, picks/bans, status
3. Stores current matches in memory (array/object)
4. Pushes updates to connected clients via WebSocket
5. Frontend receives updates and re-renders UI

## [S4] Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **HTTP Server:** Express.js
- **Scraping:** Puppeteer (headless Chrome) for dynamic content, Cheerio for static HTML
- **Real-time:** Socket.io
- **Scheduling:** node-cron
- **Environment:** dotenv

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Real-time:** socket.io-client
- **Styling:** CSS Modules
- **Icons:** react-icons (for hero icons)

## [S5] UI Components

### 5.1 Header
- Logo: "Dota Drafts"
- Navigation: Live, History (future)
- Connection status indicator (green/red dot)

### 5.2 Live Drafts Page
- Grid/list of active matches
- Each match shows:
  - Tournament name
  - Team A vs Team B
  - Pick/Ban phase with hero icons
  - Timer
  - Match status (drafting, live, finished)

### 5.3 Draft Card
- Single match card component
- Displays:
  - Team names with logos (if available)
  - Ban phase (first row, grayed out)
  - Pick phase (second row, colored)
  - Current phase indicator
  - Hero icons with names on hover

### 5.4 Footer
- Project info
- Data source attribution
- Links

## [S6] Project Structure

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

## [S7] Scraping Strategy

### Sources
1. **dltv.org** - Primary source, most reliable for live drafts
2. **hawk.live** - Backup source, different format

### Approach
- Use Puppeteer for dynamic content (JavaScript-rendered pages)
- Parse HTML structure to extract draft data
- Handle loading states and errors gracefully
- Rotate between sources if one fails

### Data Points to Extract
- Match ID
- Tournament name
- Team A name and tag
- Team B name and tag
- Ban list (ordered)
- Pick list (ordered)
- Current phase (ban/pick)
- Match status (upcoming, drafting, live, finished)

## [S8] Error Handling

- **Scraping failures:** Retry 3 times, then skip to next interval
- **WebSocket disconnection:** Auto-reconnect with exponential backoff
- **Missing data:** Display "Loading..." or "Data unavailable"
- **Rate limiting:** Respect site's robots.txt, add delays between requests

## [S9] Future Features (Out of MVP Scope)

- Match history with past drafts
- Hero statistics (winrate, popularity)
- Team profiles
- Draft analysis (strengths, weaknesses, counters)
- User accounts and favorites
- Notifications for specific matches
- Redis for persistent storage
- Docker deployment

## [S10] Success Criteria

- [ ] Backend successfully scrapes dltv.org/hawk.live
- [ ] Real-time updates via WebSocket work
- [ ] Frontend displays live drafts
- [ ] UI is responsive and fast
- [ ] No crashes or memory leaks during 1-hour test
- [ ] Can handle 5+ concurrent matches
