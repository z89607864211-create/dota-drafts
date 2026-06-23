import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeDltv() {
  try {
    const response = await axios.get('https://www.dltv.org/matches', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    const $ = cheerio.load(response.data);
    const matches = [];

    $('div.match').each((i, element) => {
      const $el = $(element);
      const seriesId = $el.attr('data-series-id');
      const matchId = $el.attr('data-match');

      const teams = $el.find('.match__body-details__team');
      const teamA = teams.eq(0).find('.team__title span').text().trim();
      const teamB = teams.eq(1).find('.team__title span').text().trim();

      const tournament = $el.find('.match__head-event span').text().trim();

      let status = 'upcoming';
      if ($el.hasClass('live')) status = 'live';
      else if ($el.hasClass('draft')) status = 'drafting';
      else if ($el.hasClass('tbd')) status = 'tbd';

      const format = $el.find('.match__head-format:not(.red) span').text().trim();

      const dateEl = $el.find('.match__body-details__timer small').first();
      const timeEl = $el.find('.match__body-details__timer strong').first();
      const matchTime = `${dateEl.text().trim()} ${timeEl.text().trim()}`.trim();

      if (teamA && teamB) {
        matches.push({
          id: `dltv-${seriesId || i}`,
          source: 'dltv',
          seriesId,
          matchId,
          tournament,
          teamA,
          teamB,
          format,
          matchTime,
          bans: [],
          picks: [],
          status,
          gameTime: 0,
          radiantScore: 0,
          direScore: 0,
          radiantLead: 0,
          towerState: { radiant: 0, dire: 0 },
          timestamp: Date.now()
        });
      }
    });

    const liveMatches = matches.filter(m => m.status === 'live' || m.status === 'drafting');

    const livePromises = liveMatches.map(async (match) => {
      if (!match.matchId) return match;
      try {
        const liveData = await fetchDltvLive(match.matchId);
        if (liveData) {
          match.picks = liveData.picks;
          match.bans = liveData.bans;
          match.gameTime = liveData.gameTime;
          match.radiantScore = liveData.radiantScore;
          match.direScore = liveData.direScore;
          match.radiantLead = liveData.radiantLead;
          match.towerState = liveData.towerState;
          match.teamAPicks = liveData.teamAPicks;
          match.teamBPicks = liveData.teamBPicks;
          match.teamABans = liveData.teamABans;
          match.teamBBans = liveData.teamBBans;
          if (liveData.teamAName) match.teamA = liveData.teamAName;
          if (liveData.teamBName) match.teamB = liveData.teamBName;
          if (liveData.teamALogo) match.teamALogo = liveData.teamALogo;
          if (liveData.teamBLogo) match.teamBLogo = liveData.teamBLogo;
          match.isPicksEnded = liveData.isPicksEnded;
          match.firstBlood = liveData.firstBlood;
        }
      } catch (e) {
        console.error(`DLTV live fetch failed for match ${match.matchId}:`, e.message);
      }
      return match;
    });

    await Promise.all(livePromises);

    console.log(`DLTV: found ${matches.length} matches (${liveMatches.length} with live data attempted)`);
    return matches;
  } catch (error) {
    console.error('DLTV scraping error:', error.message);
    return [];
  }
}

async function fetchDltvLive(matchId) {
  const response = await axios.get(`https://dltv.org/live/${matchId}.json`, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  const data = response.data;
  if (!data || !data.db) return null;

  const firstTeam = data.db.first_team;
  const secondTeam = data.db.second_team;

  const picks = [];
  const bans = [];
  const teamAPicks = [];
  const teamBPicks = [];
  const teamABans = [];
  const teamBBans = [];

  if (firstTeam?.picks) {
    for (const pick of firstTeam.picks) {
      if (pick.hero?.title) {
        picks.push(pick.hero.title);
        teamAPicks.push(pick.hero.title);
      }
    }
  }
  if (secondTeam?.picks) {
    for (const pick of secondTeam.picks) {
      if (pick.hero?.title) {
        picks.push(pick.hero.title);
        teamBPicks.push(pick.hero.title);
      }
    }
  }

  if (firstTeam?.bans) {
    for (const ban of firstTeam.bans) {
      if (ban.hero?.title) {
        bans.push(ban.hero.title);
        teamABans.push(ban.hero.title);
      }
    }
  }
  if (secondTeam?.bans) {
    for (const ban of secondTeam.bans) {
      if (ban.hero?.title) {
        bans.push(ban.hero.title);
        teamBBans.push(ban.hero.title);
      }
    }
  }

  const towerState = { radiant: 0, dire: 0 };
  if (data.live_league_data?.scoreboard) {
    towerState.radiant = data.live_league_data.scoreboard.radiant?.tower_state || 0;
    towerState.dire = data.live_league_data.scoreboard.dire?.tower_state || 0;
  }

  return {
    picks,
    bans,
    teamAPicks,
    teamBPicks,
    teamABans,
    teamBBans,
    teamAName: firstTeam?.title,
    teamBName: secondTeam?.title,
    teamALogo: firstTeam?.image ? `https://s3.dltv.org${firstTeam.image}` : null,
    teamBLogo: secondTeam?.image ? `https://s3.dltv.org${secondTeam.image}` : null,
    gameTime: data.game_time || 0,
    radiantScore: data.radiant_score || 0,
    direScore: data.dire_score || 0,
    radiantLead: data.radiant_lead || 0,
    towerState,
    isPicksEnded: data.is_picks_ended || false,
    firstBlood: data.first_blood || null
  };
}
