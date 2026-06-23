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

function TowerMap({ radiantState, direState, teamA, teamB }) {
  const rTowers = parseTowers(radiantState)
  const dTowers = parseTowers(direState)

  const getTowerCount = (t) => (t.top > 0 ? 1 : 0) + (t.mid > 0 ? 1 : 0) + (t.bot > 0 ? 1 : 0)
  
  return (
    <div className={styles.towerMap}>
      <div className={styles.towerRow}>
        <span className={styles.towerTeam}>{teamA}</span>
        <div className={styles.towers}>
          {['top', 'mid', 'bot'].map(lane => (
            <div key={lane} className={styles.towerGroup}>
              <span className={styles.laneLabel}>{lane.toUpperCase()}</span>
              <div className={`${styles.tower} ${rTowers[lane] > 0 ? styles.alive : styles.dead}`}>
                {rTowers[lane] > 0 ? 'T' : '×'}
              </div>
            </div>
          ))}
        </div>
        <span className={styles.towerCount}>{getTowerCount(rTowers)}/3</span>
      </div>
      
      <div className={styles.towerDivider}></div>
      
      <div className={styles.towerRow}>
        <span className={styles.towerTeam}>{teamB}</span>
        <div className={styles.towers}>
          {['top', 'mid', 'bot'].map(lane => (
            <div key={lane} className={styles.towerGroup}>
              <span className={styles.laneLabel}>{lane.toUpperCase()}</span>
              <div className={`${styles.tower} ${dTowers[lane] > 0 ? styles.alive : styles.dead}`}>
                {dTowers[lane] > 0 ? 'T' : '×'}
              </div>
            </div>
          ))}
        </div>
        <span className={styles.towerCount}>{getTowerCount(dTowers)}/3</span>
      </div>
    </div>
  )
}

function WinPrediction({ match }) {
  const { teamA, teamB, picks, teamAPicks, teamBPicks, radiantScore, direScore, gameTime, radiantLead, towerState } = match
  
  const aPicks = teamAPicks || picks?.slice(0, Math.ceil((picks?.length || 0) / 2)) || []
  const bPicks = teamBPicks || picks?.slice(Math.ceil((picks?.length || 0) / 2)) || []
  
  const calculateScore = (heroPicks) => {
    let score = 50
    const heroes = heroPicks.map(h => getHeroByName(h))
    
    let hasCarry = false, hasSupport = false, hasInitiator = false, hasNuker = false
    let str = 0, agi = 0, int = 0
    
    heroes.forEach(h => {
      if (h.attribute === 'str') str++
      if (h.attribute === 'agi') agi++
      if (h.attribute === 'int') int++
    })
    
    if (str > 0 && agi > 0 && int > 0) score += 5
    if (heroPicks.length >= 5) score += 3
    
    return score
  }
  
  let teamAScore = calculateScore(aPicks)
  let teamBScore = calculateScore(bPicks)
  
  if (gameTime > 0) {
    if (radiantScore > direScore) teamAScore += (radiantScore - direScore) * 2
    if (direScore > radiantScore) teamBScore += (direScore - radiantScore) * 2
    if (radiantLead > 0) teamAScore += Math.min(radiantLead / 1000, 10)
    if (radiantLead < 0) teamBScore += Math.min(Math.abs(radiantLead) / 1000, 10)
  }
  
  const total = teamAScore + teamBScore
  const teamAPercent = Math.round((teamAScore / total) * 100)
  const teamBPercent = 100 - teamAPercent
  
  const leading = teamAPercent > teamBPercent ? teamA : teamB
  const leadingPercent = Math.max(teamAPercent, teamBPercent)
  
  const reasons = []
  if (aPicks.length >= 5 && bPicks.length < 5) reasons.push(`${teamA} has complete draft`)
  if (bPicks.length >= 5 && aPicks.length < 5) reasons.push(`${teamB} has complete draft`)
  if (radiantScore > direScore) reasons.push(`${teamA} leads in kills (${radiantScore}-${direScore})`)
  if (direScore > radiantScore) reasons.push(`${teamB} leads in kills (${direScore}-${radiantScore})`)
  if (radiantLead > 2000) reasons.push(`${teamA} has ${radiantLead} NW advantage`)
  if (radiantLead < -2000) reasons.push(`${teamB} has ${Math.abs(radiantLead)} NW advantage`)
  if (reasons.length === 0) reasons.push('Drafts are balanced')
  
  return (
    <div className={styles.prediction}>
      <div className={styles.predictionHeader}>
        <span className={styles.predictionIcon}>📊</span>
        <span className={styles.predictionTitle}>Win Prediction</span>
      </div>
      
      <div className={styles.predictionBar}>
        <div className={`${styles.barLeft} ${teamAPercent > teamBPercent ? styles.leading : ''}`}
             style={{ width: `${teamAPercent}%` }}>
          {teamAPercent}%
        </div>
        <div className={`${styles.barRight} ${teamBPercent > teamAPercent ? styles.leading : ''}`}
             style={{ width: `${teamBPercent}%` }}>
          {teamBPercent}%
        </div>
      </div>
      
      <div className={styles.predictionTeams}>
        <span>{teamA}</span>
        <span>{teamB}</span>
      </div>
      
      <div className={styles.predictionResult}>
        <span className={styles.winnerLabel}>Favored:</span>
        <span className={styles.winnerName}>{leading}</span>
        <span className={styles.winnerPercent}>({leadingPercent}%)</span>
      </div>
      
      <div className={styles.predictionReasons}>
        {reasons.map((reason, i) => (
          <div key={i} className={styles.reason}>• {reason}</div>
        ))}
      </div>
      
      <div className={styles.predictionDisclaimer}>
        Draft-based prediction. For reference only.
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

  const { tournament, teamA, teamB, teamALogo, teamBLogo, bans, picks, status, format, matchTime, teamAScore, teamBScore, source, gameTime, radiantScore, direScore, radiantLead, towerState, teamAPicks, teamBPicks, teamABans, teamBBans, isPicksEnded } = match

  const statusLabels = {
    live: 'LIVE',
    upcoming: 'UPCOMING',
    tbd: 'TBD',
    drafting: 'DRAFTING',
    finished: 'FINISHED',
  }

  const isLive = status === 'live' || (gameTime > 0)
  const showBans = !isLive || (bans?.length > 0 && gameTime < 120)

  const rScore = radiantScore ?? teamAScore ?? 0
  const dScore = direScore ?? teamBScore ?? 0

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
          <div className={styles.score}>{rScore}</div>
        </div>

        <div className={styles.vsSection}>
          <div className={`${styles.status} ${styles[status]}`}>
            {statusLabels[status] || status?.toUpperCase()}
          </div>
          <div className={styles.gameTime}>
            {gameTime > 0 ? formatGameTime(gameTime) : (status === 'drafting' ? 'Draft' : '—')}
          </div>
          {isLive && radiantLead !== 0 && (
            <div className={styles.nwIndicator}>
              <span className={styles.nwLabel}>NW</span>
              <span className={`${styles.nwValue} ${radiantLead > 0 ? styles.positive : styles.negative}`}>
                {radiantLead > 0 ? `+${radiantLead}` : radiantLead}
              </span>
              <span className={styles.nwTeam}>
                {radiantLead > 0 ? teamA : teamB} leading
              </span>
            </div>
          )}
          {matchTime && <div className={styles.time}>{matchTime}</div>}
        </div>

        <div className={`${styles.team} ${styles.dire}`}>
          <div className={styles.score}>{dScore}</div>
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
          <TowerMap radiantState={towerState.radiant} direState={towerState.dire} teamA={teamA} teamB={teamB} />
        </div>
      )}

      {(picks?.length > 0) && (
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
              
              {showBans && (teamABans || bans?.slice(0, Math.ceil(bans.length / 2)) || []).length > 0 && (
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
              
              {showBans && (teamBBans || bans?.slice(Math.ceil(bans.length / 2)) || []).length > 0 && (
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

      <WinPrediction match={match} />

      <div className={styles.footer}>
        {source && <span className={styles.source}>Source: {source}</span>}
        <span className={styles.matchId}>Match ID: {match.id}</span>
      </div>
    </div>
  )
}
