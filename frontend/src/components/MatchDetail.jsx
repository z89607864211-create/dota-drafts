import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getHeroByName, getHeroImage } from '../utils/heroData'
import useSocket from '../hooks/useSocket'
import styles from './MatchDetail.module.css'

function HeroPick({ hero, type, side }) {
  const heroData = getHeroByName(hero)
  const img = getHeroImage(hero)
  return (
    <div className={`${styles.heroPick} ${styles[type]} ${styles[side]}`}>
      {img ? (
        <img src={img} alt={hero} className={styles.heroImg} loading="lazy" />
      ) : (
        <div className={styles.heroPlaceholder}>{heroData.icon}</div>
      )}
      <span className={styles.heroName}>{hero}</span>
    </div>
  )
}

function formatGameTime(seconds) {
  if (!seconds || seconds <= 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function parseTowers(state) {
  const towers = []
  const bits = state.toString(2).padStart(32, '0')
  for (let i = 0; i < 24; i += 3) {
    towers.push(parseInt(bits.substring(i, i + 3), 2))
  }
  return {
    top: towers[0] || 0,
    mid: towers[1] || 0,
    bot: towers[2] || 0,
    raxTop: towers[3] || 0,
    raxMid: towers[4] || 0,
    raxBot: towers[5] || 0,
    ancient: towers[6] || 0
  }
}

function TowerMap({ radiantState, direState }) {
  const rTowers = parseTowers(radiantState)
  const dTowers = parseTowers(direState)
  
  return (
    <div className={styles.towerMap}>
      <div className={styles.towerLane}>
        <span className={styles.towerLabel}>Top</span>
        <div className={styles.towers}>
          <div className={`${styles.tower} ${rTowers.top > 0 ? styles.alive : styles.dead}`}>T</div>
          <div className={`${styles.tower} ${dTowers.top > 0 ? styles.alive : styles.dead}`}>T</div>
        </div>
      </div>
      <div className={styles.towerLane}>
        <span className={styles.towerLabel}>Mid</span>
        <div className={styles.towers}>
          <div className={`${styles.tower} ${rTowers.mid > 0 ? styles.alive : styles.dead}`}>T</div>
          <div className={`${styles.tower} ${dTowers.mid > 0 ? styles.alive : styles.dead}`}>T</div>
        </div>
      </div>
      <div className={styles.towerLane}>
        <span className={styles.towerLabel}>Bot</span>
        <div className={styles.towers}>
          <div className={`${styles.tower} ${rTowers.bot > 0 ? styles.alive : styles.dead}`}>T</div>
          <div className={`${styles.tower} ${dTowers.bot > 0 ? styles.alive : styles.dead}`}>T</div>
        </div>
      </div>
    </div>
  )
}

function DraftAnalytics({ match }) {
  const { teamA, teamB, picks, bans, teamAPicks, teamBPicks, teamABans, teamBBans } = match
  
  const STR_AGIS = { str: 0, agi: 0, int: 0 }
  const teamAStats = { ...STR_AGIS }
  const teamBStats = { ...STR_AGIS }
  
  ;(teamAPicks || []).forEach(hero => {
    const h = getHeroByName(hero)
    if (h?.attribute) teamAStats[h.attribute]++
  })
  ;(teamBPicks || []).forEach(hero => {
    const h = getHeroByName(hero)
    if (h?.attribute) teamBStats[h.attribute]++
  })

  const roles = { carry: 0, support: 0, initiator: 0, nuker: 0 }
  const teamARoles = { ...roles }
  const teamBRoles = { ...roles }

  return (
    <div className={styles.analytics}>
      <h2>Draft Analytics</h2>
      
      <div className={styles.analyticsGrid}>
        <div className={styles.analyticsCard}>
          <h4>Attribute Balance</h4>
          <div className={styles.attrRow}>
            <span>{teamA}</span>
            <span className={styles.attrBalance}>
              <span className={styles.str}>{teamAStats.str}S</span>
              <span className={styles.agi}>{teamAStats.agi}A</span>
              <span className={styles.int}>{teamAStats.int}I</span>
            </span>
          </div>
          <div className={styles.attrRow}>
            <span>{teamB}</span>
            <span className={styles.attrBalance}>
              <span className={styles.str}>{teamBStats.str}S</span>
              <span className={styles.agi}>{teamBStats.agi}A</span>
              <span className={styles.int}>{teamBStats.int}I</span>
            </span>
          </div>
        </div>

        <div className={styles.analyticsCard}>
          <h4>Draft Summary</h4>
          <div className={styles.summaryRow}>
            <span>{teamA} picks:</span>
            <span>{teamAPicks?.length || 0} heroes</span>
          </div>
          <div className={styles.summaryRow}>
            <span>{teamB} picks:</span>
            <span>{teamBPicks?.length || 0} heroes</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Total bans:</span>
            <span>{bans?.length || 0} heroes</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MatchDetail() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [matches, setMatches] = useState([])
  const [connected, setConnected] = useState(false)

  useSocket(setMatches, setConnected)

  useEffect(() => {
    const found = matches.find(m => m.id === id)
    if (found) setMatch(found)
  }, [matches, id])

  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.json())
      .then(data => {
        setMatches(data)
        const found = data.find(m => m.id === id)
        if (found) setMatch(found)
      })
      .catch(console.error)
  }, [id])

  if (!match) {
    return (
      <div className={styles.container}>
        <Link to="/" className={styles.backLink}>← Back to matches</Link>
        <div className={styles.loading}>Loading match data...</div>
      </div>
    )
  }

  const { tournament, teamA, teamB, teamALogo, teamBLogo, bans, picks, status, format, matchTime, teamAScore, teamBScore, source, gameTime, radiantScore, direScore, radiantLead, towerState, teamAPicks, teamBPicks, teamABans, teamBBans, isPicksEnded, firstBlood } = match

  const statusLabels = {
    live: 'LIVE',
    upcoming: 'UPCOMING',
    tbd: 'TBD',
    drafting: 'DRAFTING',
    finished: 'FINISHED',
  }

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.backLink}>← Back to matches</Link>
      
      <div className={styles.matchHeader}>
        <div className={styles.tournament}>{tournament}</div>
        {format && <div className={styles.format}>{format.toUpperCase()}</div>}
      </div>

      <div className={styles.scoreboard}>
        <div className={`${styles.team} ${styles.radiant}`}>
          {teamALogo && <img src={teamALogo} alt={teamA} className={styles.teamLogo} />}
          <div className={styles.teamInfo}>
            <div className={styles.teamName}>{teamA}</div>
            <div className={styles.side}>Radiant</div>
          </div>
          <div className={styles.score}>{radiantScore ?? teamAScore ?? 0}</div>
        </div>

        <div className={styles.vsSection}>
          <div className={`${styles.status} ${styles[status]}`}>
            {statusLabels[status] || status?.toUpperCase()}
          </div>
          <div className={styles.gameTime}>
            {gameTime > 0 ? formatGameTime(gameTime) : (status === 'drafting' ? 'Draft' : '—')}
          </div>
          {radiantLead !== 0 && (
            <div className={`${styles.lead} ${radiantLead > 0 ? styles.positive : styles.negative}`}>
              {radiantLead > 0 ? '+' : ''}{radiantLead} NW
            </div>
          )}
          {firstBlood && (
            <div className={styles.firstBlood}>
              FB: {firstBlood === 'radiant' ? teamA : teamB}
            </div>
          )}
          {matchTime && <div className={styles.time}>{matchTime}</div>}
        </div>

        <div className={`${styles.team} ${styles.dire}`}>
          <div className={styles.score}>{direScore ?? teamBScore ?? 0}</div>
          <div className={styles.teamInfo}>
            <div className={styles.teamName}>{teamB}</div>
            <div className={styles.side}>Dire</div>
          </div>
          {teamBLogo && <img src={teamBLogo} alt={teamB} className={styles.teamLogo} />}
        </div>
      </div>

      {towerState && (towerState.radiant > 0 || towerState.dire > 0) && (
        <div className={styles.towerSection}>
          <h2>Tower Status</h2>
          <TowerMap radiantState={towerState.radiant} direState={towerState.dire} />
        </div>
      )}

      {(picks?.length > 0 || bans?.length > 0) && (
        <div className={styles.draftSection}>
          <h2>Draft</h2>
          
          <div className={styles.draftGrid}>
            <div className={styles.draftColumn}>
              <h3>{teamA}</h3>
              
              {(teamAPicks || picks?.slice(0, Math.ceil(picks.length / 2)) || []).length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Picks</span>
                  <div className={styles.heroList}>
                    {(teamAPicks || picks?.slice(0, Math.ceil(picks.length / 2)) || []).map((hero, i) => (
                      <HeroPick key={`apick-${i}`} hero={hero} type="pick" side="radiant" />
                    ))}
                  </div>
                </div>
              )}
              
              {(teamABans || bans?.slice(0, Math.ceil(bans.length / 2)) || []).length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Bans</span>
                  <div className={styles.heroList}>
                    {(teamABans || bans?.slice(0, Math.ceil(bans.length / 2)) || []).map((hero, i) => (
                      <HeroPick key={`aban-${i}`} hero={hero} type="ban" side="radiant" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.draftDivider}></div>

            <div className={styles.draftColumn}>
              <h3>{teamB}</h3>
              
              {(teamBPicks || picks?.slice(Math.ceil(picks.length / 2)) || []).length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Picks</span>
                  <div className={styles.heroList}>
                    {(teamBPicks || picks?.slice(Math.ceil(picks.length / 2)) || []).map((hero, i) => (
                      <HeroPick key={`bpick-${i}`} hero={hero} type="pick" side="dire" />
                    ))}
                  </div>
                </div>
              )}
              
              {(teamBBans || bans?.slice(Math.ceil(bans.length / 2)) || []).length > 0 && (
                <div className={styles.phase}>
                  <span className={styles.phaseLabel}>Bans</span>
                  <div className={styles.heroList}>
                    {(teamBBans || bans?.slice(Math.ceil(bans.length / 2)) || []).map((hero, i) => (
                      <HeroPick key={`bban-${i}`} hero={hero} type="ban" side="dire" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DraftAnalytics match={match} />

      <div className={styles.footer}>
        {source && <span className={styles.source}>Source: {source}</span>}
        <span className={styles.matchId}>Match ID: {match.id}</span>
      </div>
    </div>
  )
}
