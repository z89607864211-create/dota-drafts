import { scrapeDltv } from './dltv.js';
import { scrapeHawk } from './hawk.js';
import { updateMatch, clearOldMatches } from '../store.js';

let isScraping = false;
let consecutiveFailures = 0;
const MAX_RETRIES = 3;
const BASE_DELAY = 2000;

async function scrapeWithRetry(fn, name, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      console.error(`${name} attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, BASE_DELAY * attempt));
      }
    }
  }
  return [];
}

function normalizeTeamName(name) {
  return name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
}

function deduplicateMatches(matches) {
  const seen = new Map();
  const result = [];

  for (const match of matches) {
    const key1 = `${normalizeTeamName(match.teamA)}-${normalizeTeamName(match.teamB)}`;
    const key2 = `${normalizeTeamName(match.teamB)}-${normalizeTeamName(match.teamA)}`;
    
    if (seen.has(key1) || seen.has(key2)) {
      const existing = seen.get(key1) || seen.get(key2);
      if (match.picks.length > existing.picks.length) {
        const idx = result.indexOf(existing);
        if (idx !== -1) result[idx] = match;
      }
      continue;
    }

    seen.set(key1, match);
    seen.set(key2, match);
    result.push(match);
  }

  return result;
}

export async function scrapeAll(io) {
  if (isScraping) {
    console.log('Scraping already in progress, skipping...');
    return;
  }
  
  isScraping = true;
  console.log('Starting scrape...');
  
  try {
    const [dltvMatches, hawkMatches] = await Promise.allSettled([
      scrapeWithRetry(scrapeDltv, 'DLTV'),
      scrapeWithRetry(scrapeHawk, 'Hawk')
    ]);
    
    const rawMatches = [
      ...(dltvMatches.status === 'fulfilled' ? dltvMatches.value : []),
      ...(hawkMatches.status === 'fulfilled' ? hawkMatches.value : [])
    ];

    const allMatches = deduplicateMatches(rawMatches);
    
    if (allMatches.length === 0) {
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_RETRIES) {
        console.error(`Scraping failed ${consecutiveFailures} times in a row`);
      }
    } else {
      consecutiveFailures = 0;
    }

    for (const match of allMatches) {
      updateMatch(match.id, match);
    }
    
    clearOldMatches();
    
    const { getMatches } = await import('../store.js');
    if (io) {
      io.emit('matches-update', getMatches());
    }
    
    console.log(`Scraped ${rawMatches.length} raw → ${allMatches.length} unique matches`);
  } catch (error) {
    console.error('Scraping error:', error);
  } finally {
    isScraping = false;
  }
}

export async function startScraping(io, interval = 15000) {
  await scrapeAll(io);
  setInterval(() => scrapeAll(io), interval);
  console.log(`Scraping every ${interval / 1000} seconds`);
}

export async function stopScraping() {
  // Nothing to clean up
}
