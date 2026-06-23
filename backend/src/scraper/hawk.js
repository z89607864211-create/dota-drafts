import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeHawk() {
  try {
    const response = await axios.get('https://hawk.live/', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    const $ = cheerio.load(response.data);

    const appEl = $('#app');
    const dataPageRaw = appEl.attr('data-page');

    if (!dataPageRaw) {
      console.log('Hawk: no data-page attribute found');
      return [];
    }

    const decoded = dataPageRaw
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    const dataPage = JSON.parse(decoded);
    const props = dataPage.props || {};
    const matches = [];

    const liveSeries = props.seriesList || [];
    const upcomingSeries = props.upcomingSeriesList || [];
    const topSeries = props.topSeries;

    for (const series of liveSeries) {
      matches.push(formatHawkSeries(series, 'live'));
    }

    if (topSeries && typeof topSeries === 'object' && !Array.isArray(topSeries) && topSeries.id) {
      if (!matches.find(m => m.id === `hawk-${topSeries.id}`)) {
        matches.push(formatHawkSeries(topSeries, 'upcoming'));
      }
    }

    for (const series of upcomingSeries) {
      if (!matches.find(m => m.id === `hawk-${series.id}`)) {
        matches.push(formatHawkSeries(series, 'upcoming'));
      }
    }

    const liveMatches = matches.filter(m => m.status === 'live');

    const draftPromises = liveMatches.map(async (match) => {
      if (!match.slug || !match.championshipSlug) return match;
      try {
        const draftData = await fetchHawkDraft(match.championshipSlug, match.slug);
        if (draftData) {
          match.picks = draftData.picks;
          match.bans = draftData.bans;
        }
      } catch (e) {
        console.error(`Hawk draft fetch failed for ${match.slug}:`, e.message);
      }
      return match;
    });

    await Promise.all(draftPromises);

    console.log(`Hawk: found ${matches.length} matches (${liveMatches.length} with draft data attempted)`);
    return matches;
  } catch (error) {
    console.error('Hawk scraping error:', error.message);
    return [];
  }
}

function formatHawkSeries(series, status) {
  const teamA = series.team1?.name || 'TBD';
  const teamB = series.team2?.name || 'TBD';
  const tournament = series.championship?.name || 'Unknown Tournament';

  let matchStatus = status;
  if (status === 'live') matchStatus = 'live';
  else if (series.team1Score !== undefined || series.team2Score !== undefined) {
    if (series.team1Score > 0 || series.team2Score > 0) matchStatus = 'live';
  }

  return {
    id: `hawk-${series.id}`,
    source: 'hawk',
    tournament,
    teamA,
    teamB,
    teamALogo: series.team1?.logoUrl || null,
    teamBLogo: series.team2?.logoUrl || null,
    format: `Bo${series.bestOf || 1}`,
    matchTime: series.startAt || '',
    bans: [],
    picks: [],
    status: matchStatus,
    teamAScore: series.team1Score || 0,
    teamBScore: series.team2Score || 0,
    slug: series.slug,
    championshipSlug: series.championship?.slug,
    timestamp: Date.now()
  };
}

async function fetchHawkDraft(championshipSlug, seriesSlug) {
  const url = `https://hawk.live/dota-2/matches/${championshipSlug}/${seriesSlug}`;
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  const $ = cheerio.load(response.data);
  const picks = [];
  const bans = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 4) {
      const heroText = cells.eq(2).text().trim();
      if (heroText && heroText !== 'Hero') {
        picks.push(heroText);
      }
    }
  });

  const pageText = $.text();
  const banSection = pageText.match(/ban[s]?\s*[:\n]([\s\S]*?)(?=pick|team|match|$)/i);
  if (banSection) {
    const banMatches = banSection[1].match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
    if (banMatches) {
      banMatches.forEach(b => {
        const trimmed = b.trim();
        if (trimmed && trimmed.length > 2 && !trimmed.match(/^(Team|Player|Hero|Map|Match|Best|BO|Start|Current)/i)) {
          bans.push(trimmed);
        }
      });
    }
  }

  return { picks, bans };
}
